/**
 * The game rules, as a pure reducer. No React, no I/O, no animation — the UI
 * renders whatever state this produces, which keeps the rules testable by
 * replaying scripted move sequences.
 */

import { attackedPieces, capturersOf } from '../chess/attacks';
import { type Board, findPieces, movePiece, parseFen, pieceAt, setPiece } from '../chess/board';
import { isInCheck, isMate } from '../chess/check';
import { destinations, promotionRank } from '../chess/moves';
import { type PieceType, type Square, parseSquare, parseSquares, rankOf } from '../chess/types';
import type {
  DangerScope,
  GameState,
  Level,
  LevelData,
  Move,
  PromotionType,
  Snapshot,
} from './types';

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

/**
 * Ranks victims for the rare position where more than one of her pieces hangs
 * at once. The biggest loss is the one worth watching, and it is the one she
 * would have noticed herself.
 */
const VALUE: Record<PieceType, number> = { k: 6, q: 5, r: 4, b: 3, n: 3, p: 1 };

/**
 * The capture that punishes the move just played, or `null` if she got away
 * with it. `from` is the enemy that strikes, `to` the piece it takes.
 *
 * The piece she just moved is checked first at every scope, so a plain blunder
 * still reads as "you moved into that" rather than surfacing some unrelated
 * capture on the other side of the board. Only once she is safe there does
 * `allPieces` look at what the move exposed.
 */
function threatAfter(board: Board, to: Square, scope: DangerScope): Move | null {
  const direct = capturersOf(board, to, 'b');
  if (direct.length > 0) return { from: direct[0], to };
  if (scope !== 'allPieces') return null;

  let worst: Move | null = null;
  let worstValue = 0;
  // `findPieces` and `capturersOf` both walk a1..h8, and the comparison is a
  // strict `>`, so ties settle on the lowest square. The solver replays these
  // positions move for move; an unstable punisher would make `par` unstable
  // with it.
  for (const victim of findPieces(board, 'w')) {
    if (victim === to) continue;
    const threats = capturersOf(board, victim, 'b');
    if (threats.length === 0) continue;
    const value = VALUE[pieceAt(board, victim)!.type];
    if (value > worstValue) {
      worstValue = value;
      worst = { from: threats[0], to: victim };
    }
  }
  return worst;
}

/** True when nothing of hers can be taken where it stands. */
const allSafe = (board: Board): boolean => attackedPieces(board, 'w').size === 0;

function isGoalMet(board: Board, stars: readonly Square[], goal: Level['goal']): boolean {
  const enemiesGone = findPieces(board, 'b').length === 0;
  switch (goal) {
    case 'collectAllStars':
      return stars.length === 0;
    case 'captureAll':
      return enemiesGone;
    case 'collectAndCapture':
      return stars.length === 0 && enemiesGone;
    case 'protect':
      return allSafe(board);
    case 'escapeCheck':
      return !isInCheck(board, 'w');
    case 'check':
      // Staying safe while doing it is the danger rule's job, and it has
      // already run by the time we get here.
      return isInCheck(board, 'b');
    case 'mateInOne':
      // The only goal that generates moves rather than reading the position,
      // and this runs inside the solver's BFS frontier — so it stays behind its
      // own case rather than being computed alongside the cheap ones.
      return isMate(board, 'b');
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
  // prevent.
  //
  // How far it looks is the level's choice. By default only the piece that just
  // moved counts — punishing one that was already under attack when the level
  // loaded would be unfair and unteachable — but a level can opt into
  // `allPieces`, which is what makes a discovered attack possible.
  const punisher = threatAfter(board, to, state.level.danger ?? 'movedPiece');
  if (punisher) {
    // Transient: the UI animates the capture, then calls `rewind`.
    return { ...base, phase: 'lost', punisher };
  }

  if (isGoalMet(board, stars, state.level.goal)) {
    return { ...base, phase: 'won' };
  }

  return base;
}
