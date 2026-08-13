/**
 * The game rules, as a pure reducer. No React, no I/O, no animation — the UI
 * renders whatever state this produces, which keeps the rules testable by
 * replaying scripted move sequences.
 */

import { attackers } from '../chess/attacks';
import { type Board, findPieces, movePiece, parseFen, pieceAt, setPiece } from '../chess/board';
import { destinations, promotionRank } from '../chess/moves';
import { type Square, parseSquare, parseSquares, rankOf } from '../chess/types';
import type { GameState, Level, LevelData, PromotionType, Snapshot } from './types';

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
    pending: null,
    undo: null,
  };
}

export const restart = (state: GameState): GameState => startLevel(state.level);

const snapshot = ({ board, stars, moves, selected, lastMove }: GameState): Snapshot => ({
  board,
  stars,
  moves,
  selected,
  lastMove,
});

/**
 * Takes back the move that got her taken, once the UI has shown the capture.
 *
 * The failed move does not count — as far as the move counter is concerned it
 * never happened. The piece is left selected, so she can try a different
 * square straight away.
 */
export function rewind(state: GameState): GameState {
  if (!state.undo) return state;
  return {
    ...state,
    ...state.undo,
    phase: 'playing',
    punisher: null,
    pending: null,
    undo: null,
  };
}

/** True when moving `from` to `to` would carry a pawn to the last rank. */
export function isPromotion(board: Board, from: Square, to: Square): boolean {
  const piece = pieceAt(board, from);
  return piece?.type === 'p' && rankOf(to) === promotionRank(piece.color);
}

/**
 * Completes a promotion she has been asked to choose.
 *
 * Underpromotion is a real option, not a formality: a knight reaches squares a
 * queen cannot, so there are positions where only the knight wins. See the
 * pawn world's last level.
 */
export function promote(state: GameState, type: PromotionType): GameState {
  if (state.phase !== 'promoting' || !state.pending) return state;
  return applyMove(state, state.pending.from, state.pending.to, type);
}

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

  // A promotion cannot be applied until she says what the pawn becomes, so
  // park the move and let the UI ask.
  if (isPromotion(state.board, state.selected, sq)) {
    return { ...state, phase: 'promoting', pending: { from: state.selected, to: sq } };
  }

  return applyMove(state, state.selected, sq);
}

export function applyMove(
  state: GameState,
  from: Square,
  to: Square,
  promoteTo: PromotionType = 'q',
): GameState {
  const before = snapshot(state);
  const moved = movePiece(state.board, from, to);
  // A pawn that reached the last rank becomes the chosen piece. Without this
  // it would sit there with no legal move at all — stuck rather than finished.
  const board = isPromotion(state.board, from, to)
    ? setPiece(moved, to, { color: 'w', type: promoteTo, id: `${pieceAt(moved, to)!.id}=${promoteTo}` })
    : moved;
  const stars = state.stars.filter((star) => star !== to);
  const moves = state.moves + 1;

  const base: GameState = {
    ...state,
    // Explicit, because this may be completing a promotion: spreading `state`
    // would otherwise carry `promoting` through and freeze the board.
    phase: 'playing',
    board,
    stars,
    moves,
    // The piece stays picked up after it moves, so a multi-move level is
    // tap-target, tap-target, tap-target rather than re-selecting in between.
    // Halves the taps, and halves the chances to mis-tap.
    selected: to,
    lastMove: { from, to },
    punisher: null,
    pending: null,
    // Every move is takeable-back, not just losing ones: a move can also
    // strand her without anything attacking her — pushing a pawn past a star
    // it needed to land on, say.
    undo: before,
  };

  // Danger is resolved BEFORE the goal: grabbing the last star on a square the
  // enemy covers still gets you taken. Checking the goal first would make the
  // winning move immune to danger, which is exactly the habit tier 2 exists to
  // prevent. Only the piece that just moved counts — punishing one that was
  // already under attack when the level loaded would be unfair and unteachable.
  const threats = attackers(board, to, 'b');
  if (threats.length > 0) {
    // Transient: the UI animates the capture, then calls `rewind`.
    return { ...base, phase: 'lost', punisher: { from: threats[0], to } };
  }

  if (isGoalMet(board, stars, state.level.goal)) {
    return { ...base, phase: 'won' };
  }

  return base;
}
