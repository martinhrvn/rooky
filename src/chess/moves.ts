/**
 * Pseudo-legal move generation.
 *
 * "Pseudo-legal" is exactly what we want: we never filter moves that would
 * leave a king in check, because most levels have no kings, and because in
 * tiers 2/3 the whole lesson is that stepping into danger HAS a consequence.
 * Preventing the mistake would teach nothing.
 *
 * All arithmetic goes through file/rank pairs rather than raw index offsets,
 * which is what keeps a knight on h1 from "wrapping" round to the a-file.
 */

import { type Board, pieceAt } from './board';
import {
  type Color,
  type Piece,
  type Square,
  fileOf,
  onBoard,
  rankOf,
  squareAt,
} from './types';

type Vector = readonly [file: number, rank: number];

const ROOK_DIRS: readonly Vector[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const BISHOP_DIRS: readonly Vector[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const QUEEN_DIRS: readonly Vector[] = [...ROOK_DIRS, ...BISHOP_DIRS];

const KNIGHT_HOPS: readonly Vector[] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

/** Direction a pawn of this colour advances. */
const pawnStep = (color: Color): number => (color === 'w' ? 1 : -1);

/** Rank a pawn of this colour starts on, where the double push is available. */
const pawnHomeRank = (color: Color): number => (color === 'w' ? 1 : 6);

/** Rank a pawn of this colour promotes on. */
export const promotionRank = (color: Color): number => (color === 'w' ? 7 : 0);

/** Walks outward along `dirs` until blocked; includes the blocking square if it holds an enemy. */
/**
 * Squares a sliding piece covers, walking outward until something blocks it.
 *
 * The blocking square is **included whatever colour stands there**. That is
 * the difference between coverage and legal moves: a piece defends its own
 * side's squares even though it cannot move onto them, and a defended enemy is
 * exactly the square that must be tinted red.
 */
function slideCover(board: Board, from: Square, dirs: readonly Vector[]): Square[] {
  const out: Square[] = [];
  const startFile = fileOf(from);
  const startRank = rankOf(from);

  for (const [df, dr] of dirs) {
    let file = startFile + df;
    let rank = startRank + dr;
    while (onBoard(file, rank)) {
      const sq = squareAt(file, rank);
      out.push(sq);
      if (pieceAt(board, sq)) break;
      file += df;
      rank += dr;
    }
  }
  return out;
}

/** Squares a jumping piece (knight, king) covers, occupied or not. */
function hopCover(from: Square, hops: readonly Vector[]): Square[] {
  const out: Square[] = [];
  const startFile = fileOf(from);
  const startRank = rankOf(from);

  for (const [df, dr] of hops) {
    const file = startFile + df;
    const rank = startRank + dr;
    if (onBoard(file, rank)) out.push(squareAt(file, rank));
  }
  return out;
}

/** Coverage minus your own pieces: you cannot move onto a friend. */
const movable = (board: Board, mover: Piece, squares: Square[]): Square[] =>
  squares.filter((sq) => {
    const occupant = pieceAt(board, sq);
    return !occupant || occupant.color !== mover.color;
  });

const slide = (board: Board, from: Square, dirs: readonly Vector[], mover: Piece): Square[] =>
  movable(board, mover, slideCover(board, from, dirs));

const hop = (board: Board, from: Square, hops: readonly Vector[], mover: Piece): Square[] =>
  movable(board, mover, hopCover(from, hops));

function pawnDestinations(board: Board, from: Square, mover: Piece): Square[] {
  const out: Square[] = [];
  const file = fileOf(from);
  const rank = rankOf(from);
  const step = pawnStep(mover.color);

  // Forward pushes: only onto empty squares, and never a capture.
  const oneAhead = rank + step;
  if (onBoard(file, oneAhead) && !pieceAt(board, squareAt(file, oneAhead))) {
    out.push(squareAt(file, oneAhead));

    const twoAhead = rank + step * 2;
    if (
      rank === pawnHomeRank(mover.color) &&
      onBoard(file, twoAhead) &&
      !pieceAt(board, squareAt(file, twoAhead))
    ) {
      out.push(squareAt(file, twoAhead));
    }
  }

  // Diagonal captures: only onto an enemy piece. (No en passant — tiers 1-3
  // never set it up, and it would confuse before real games are introduced.)
  for (const df of [-1, 1]) {
    const captureFile = file + df;
    if (!onBoard(captureFile, oneAhead)) continue;
    const sq = squareAt(captureFile, oneAhead);
    const occupant = pieceAt(board, sq);
    if (occupant && occupant.color !== mover.color) out.push(sq);
  }

  return out;
}

/**
 * Squares the piece on `from` may move to. Returns [] if the square is empty.
 */
export function destinations(board: Board, from: Square): Square[] {
  const mover = pieceAt(board, from);
  if (!mover) return [];

  switch (mover.type) {
    case 'r':
      return slide(board, from, ROOK_DIRS, mover);
    case 'b':
      return slide(board, from, BISHOP_DIRS, mover);
    case 'q':
      return slide(board, from, QUEEN_DIRS, mover);
    case 'n':
      return hop(board, from, KNIGHT_HOPS, mover);
    case 'k':
      return hop(board, from, QUEEN_DIRS, mover);
    case 'p':
      return pawnDestinations(board, from, mover);
  }
}

/**
 * Squares the piece on `from` COVERS — everywhere it could capture something,
 * *including squares its own side occupies*.
 *
 * This is coverage, not legal movement, and the difference matters twice over:
 *
 * - A piece defending a friend still covers that square. Without this, a
 *   defended enemy shows no red tint even though taking it loses — the level
 *   punishes a danger it never displayed.
 * - A pawn attacks diagonally but moves straight, so the square directly in
 *   front of an enemy pawn is the one square it cannot touch you on.
 */
export function attackedFrom(board: Board, from: Square): Square[] {
  const mover = pieceAt(board, from);
  if (!mover) return [];

  switch (mover.type) {
    case 'r':
      return slideCover(board, from, ROOK_DIRS);
    case 'b':
      return slideCover(board, from, BISHOP_DIRS);
    case 'q':
      return slideCover(board, from, QUEEN_DIRS);
    case 'n':
      return hopCover(from, KNIGHT_HOPS);
    case 'k':
      return hopCover(from, QUEEN_DIRS);
    case 'p': {
      const file = fileOf(from);
      const rank = rankOf(from) + pawnStep(mover.color);
      return [-1, 1]
        .filter((df) => onBoard(file + df, rank))
        .map((df) => squareAt(file + df, rank));
    }
  }
}

export function canMove(board: Board, from: Square, to: Square): boolean {
  return destinations(board, from).includes(to);
}
