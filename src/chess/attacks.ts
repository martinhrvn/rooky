/**
 * Attack maps — the data behind tier 2's red "danger" squares.
 *
 * A square is dangerous when an enemy piece could capture something standing
 * on it. Note this is recomputed after every move: capturing a defender opens
 * up squares, which is precisely the pattern we want kids to notice.
 */

import { type Board, findPieces, pieceAt, setPiece } from './board';
import { attackedFrom } from './moves';
import { type Color, type Square, opposite } from './types';

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

/**
 * The overlay for one specific piece: squares black covers once *that* piece
 * has stepped off `from`, with her other pieces left where they stand.
 *
 * Exact, where `dangerMap` is only exact while she has a single piece. Moving
 * changes the position of one piece and one piece only, so lifting that one off
 * accounts for any line it was blocking, while the pieces that stay put keep
 * screening the lines they were screening. `dangerMap` lifts all of them and so
 * paints squares red that are in fact shielded by a piece going nowhere.
 */
export function dangerFrom(board: Board, from: Square): Set<Square> {
  const lifted = board.map((piece, sq) => (sq === from ? null : piece));
  const danger = new Set<Square>();

  for (const enemy of findPieces(lifted, 'b')) {
    const isKing = pieceAt(lifted, enemy)!.type === 'k';
    for (const target of attackedFrom(lifted, enemy)) {
      // An enemy king covers a square it may not actually take on. Painting it
      // red anyway would warn her off the square that mates.
      if (isKing && isAttacked(setPiece(lifted, target, null), target, 'w')) continue;
      danger.add(target);
    }
  }
  return danger;
}

/** The squares of `color` pieces that cover `target`. */
export function attackers(board: Board, target: Square, color: Color): Square[] {
  return findPieces(board, color).filter((from) => attackedFrom(board, from).includes(target));
}

/**
 * The pieces of `color` that could actually take what stands on `target`.
 *
 * Everything can, except a king: a king may not capture a defended piece,
 * because that would walk it into check. Nowhere else in the app needs this —
 * tiers 1 to 3 are kingless — but every mate in one turns on it. The mating
 * piece usually stands right next to the king, held there by a defender, and
 * without this rule the king would simply take it and the mate would read as a
 * blunder.
 *
 * The victim is lifted off before asking, because by then it has been captured
 * and is no longer defending anything, itself included.
 */
export function capturersOf(board: Board, target: Square, color: Color): Square[] {
  return attackers(board, target, color).filter((from) => {
    if (pieceAt(board, from)?.type !== 'k') return true;
    return !isAttacked(setPiece(board, target, null), target, opposite(color));
  });
}

export function isAttacked(board: Board, target: Square, color: Color): boolean {
  return findPieces(board, color).some((from) => attackedFrom(board, from).includes(target));
}

/**
 * Squares where a piece of `color` is standing under attack — the pieces that
 * could be taken where they are, rather than the squares they must not go to.
 *
 * Distinct from `dangerMap` on purpose. That answers "where would I be taken if
 * I went there"; this answers "what of mine is in trouble right now", which is
 * the question `danger: 'allPieces'` levels are built around and the only thing
 * the square overlay cannot say.
 */
export function attackedPieces(board: Board, color: Color): Set<Square> {
  return new Set(
    findPieces(board, color).filter((sq) => capturersOf(board, sq, opposite(color)).length > 0),
  );
}
