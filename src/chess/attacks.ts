/**
 * Attack maps — the data behind tier 2's red "danger" squares.
 *
 * A square is dangerous when an enemy piece could capture something standing
 * on it. Note this is recomputed after every move: capturing a defender opens
 * up squares, which is precisely the pattern we want kids to notice.
 */

import { type Board, findPieces } from './board';
import { attackedFrom } from './moves';
import { type Color, type Square } from './types';

/** Every square attacked by at least one piece of `color`. */
export function attackMap(board: Board, color: Color): Set<Square> {
  const attacked = new Set<Square>();
  for (const from of findPieces(board, color)) {
    for (const sq of attackedFrom(board, from)) attacked.add(sq);
  }
  return attacked;
}

/**
 * The tier 2 overlay: squares black covers, computed as if the player's own
 * pieces were lifted off the board.
 *
 * Her piece can be the very thing blocking an enemy line, so a square that
 * looks safe while she stands in the way becomes dangerous the moment she
 * moves. Lifting her pieces off first makes the red squares match what will
 * actually happen when she moves there — which is the whole contract of the
 * overlay.
 *
 * Exact while she has a single piece, which is every capture level so far. A
 * level with two white pieces would over-warn on squares screened by the piece
 * that stays put; `levels.test.ts` asserts the correspondence, so that will
 * announce itself rather than slip through.
 */
export function dangerMap(board: Board): Set<Square> {
  return attackMap(
    board.map((piece) => (piece?.color === 'w' ? null : piece)),
    'b',
  );
}

/** The squares of `color` pieces that cover `target`. */
export function attackers(board: Board, target: Square, color: Color): Square[] {
  return findPieces(board, color).filter((from) => attackedFrom(board, from).includes(target));
}

export function isAttacked(board: Board, target: Square, color: Color): boolean {
  return findPieces(board, color).some((from) => attackedFrom(board, from).includes(target));
}
