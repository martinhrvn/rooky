/**
 * Check, mate and stalemate.
 *
 * The rest of the chess core is deliberately kingless and pseudo-legal: most
 * level positions have no king at all, and in tiers 2 and 3 the whole lesson is
 * that stepping into danger *has* a consequence, so nothing is filtered out.
 * This file is the one place that cares where a king stands, and it exists only
 * for the check / out-of-check / mate-in-one levels.
 *
 * It stays hand-rolled for the same reason `board.ts` does — a real library
 * rejects the kingless positions every other world is built from.
 *
 * Two rules are missing on purpose, and neither can change an answer here:
 * castling (nothing in the app can castle, and no puzzle is decided by it) and
 * en passant. Promotion is ignored too: a black pawn reaching the last rank
 * occupies the same square whatever it becomes, and self-check is decided by
 * occupancy rather than by piece type, so it cannot flip a legal move to
 * illegal.
 */

import { attackers } from './attacks';
import { type Board, findPieces, movePiece, pieceAt } from './board';
import { destinations } from './moves';
import { type Color, type Square, opposite } from './types';

/** Where this side's king stands, or `null` in the usual kingless position. */
export function kingSquare(board: Board, color: Color): Square | null {
  for (const sq of findPieces(board, color)) {
    if (pieceAt(board, sq)!.type === 'k') return sq;
  }
  return null;
}

/** False when there is no king, which is most of the app. */
export function isInCheck(board: Board, color: Color): boolean {
  const king = kingSquare(board, color);
  if (king === null) return false;
  return attackers(board, king, opposite(color)).length > 0;
}

/**
 * Whether this side has any move that does not leave its own king attacked.
 *
 * Short-circuits, because it runs inside the solver's BFS frontier for every
 * candidate mate.
 */
export function hasLegalMove(board: Board, color: Color): boolean {
  for (const from of findPieces(board, color)) {
    for (const to of destinations(board, from)) {
      // `movePiece` clears the origin square, so a king cannot escape by
      // stepping backwards along the line of the piece checking it.
      if (!isInCheck(movePiece(board, from, to), color)) return true;
    }
  }
  return false;
}

/**
 * Both of these require a king. Without one "no legal move" means the side has
 * simply been cleared off the board — which is how a capture level *ends*, and
 * must never be mistaken for a result.
 */
export function isMate(board: Board, color: Color): boolean {
  if (kingSquare(board, color) === null) return false;
  return isInCheck(board, color) && !hasLegalMove(board, color);
}

export function isStalemate(board: Board, color: Color): boolean {
  if (kingSquare(board, color) === null) return false;
  return !isInCheck(board, color) && !hasLegalMove(board, color);
}
