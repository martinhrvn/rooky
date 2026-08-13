/**
 * The game rules, as a pure reducer. No React, no I/O, no animation — the UI
 * renders whatever state this produces, which keeps the rules testable by
 * replaying scripted move sequences.
 */

import { attackers } from '../chess/attacks';
import { type Board, findPieces, movePiece, parseFen, pieceAt } from '../chess/board';
import { destinations } from '../chess/moves';
import { type Square, parseSquare, parseSquares } from '../chess/types';
import type { GameState, Level, LevelData } from './types';

/** Resolves the readable square names in level data into indices. */
export function toLevel(data: LevelData): Level {
  const { stars, hint, ...rest } = data;
  return {
    ...rest,
    stars: parseSquares(stars ?? []),
    hint: (hint ?? []).map(([from, to]) => ({ from: parseSquare(from), to: parseSquare(to) })),
  };
}

export function startLevel(level: Level): GameState {
  return {
    level,
    board: parseFen(level.fen).board,
    stars: level.stars,
    moves: 0,
    selected: null,
    phase: 'playing',
    lastMove: null,
    punisher: null,
  };
}

export const restart = (state: GameState): GameState => startLevel(state.level);

/**
 * Where the currently selected piece may go. Empty when nothing is selected or
 * the level is over. Shown at every tier — the tier axis is danger-awareness,
 * not move legality, so hiding legal moves would teach nothing.
 */
export function legalTargets(state: GameState): Square[] {
  if (state.phase !== 'playing' || state.selected === null) return [];
  return destinations(state.board, state.selected);
}

function isGoalMet(board: Board, stars: readonly Square[], goal: Level['goal']): boolean {
  const enemiesGone = findPieces(board, 'b').length === 0;
  switch (goal) {
    case 'collectAllStars':
      return stars.length === 0;
    case 'captureAll':
      return enemiesGone;
    case 'collectAndCapture':
      return stars.length === 0 && enemiesGone;
  }
}

/**
 * Stars for the completed level: 3 at par, 2 for a couple over, 1 otherwise.
 * Going over par never fails a level — it only costs shine.
 */
export function rate(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= par) return 3;
  if (moves <= par + 2) return 2;
  return 1;
}

/** Tapping a square: selects your piece, or moves the selected one there. */
export function tap(state: GameState, sq: Square): GameState {
  if (state.phase !== 'playing') return state;

  const piece = pieceAt(state.board, sq);

  // Tapping one of your own pieces always (re)selects it, even mid-selection,
  // so a mis-tap never costs a move.
  if (piece?.color === 'w') {
    return { ...state, selected: state.selected === sq ? null : sq };
  }

  if (state.selected === null) return state;
  if (!destinations(state.board, state.selected).includes(sq)) {
    // Tapping nowhere useful just puts the piece down again.
    return { ...state, selected: null };
  }

  return applyMove(state, state.selected, sq);
}

export function applyMove(state: GameState, from: Square, to: Square): GameState {
  const board = movePiece(state.board, from, to);
  const stars = state.stars.filter((star) => star !== to);
  const moves = state.moves + 1;

  const base: GameState = {
    ...state,
    board,
    stars,
    moves,
    selected: null,
    lastMove: { from, to },
    punisher: null,
  };

  // Danger is resolved BEFORE the goal: grabbing the last star on a square the
  // enemy covers still gets you taken. Checking the goal first would make the
  // winning move immune to danger, which is exactly the habit tier 2 exists to
  // prevent. Only the piece that just moved counts — punishing one that was
  // already under attack when the level loaded would be unfair and unteachable.
  const threats = attackers(board, to, 'b');
  if (threats.length > 0) {
    return { ...base, phase: 'lost', punisher: { from: threats[0], to } };
  }

  if (isGoalMet(board, stars, state.level.goal)) {
    return { ...base, phase: 'won' };
  }

  return base;
}
