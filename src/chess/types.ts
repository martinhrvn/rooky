/**
 * Core chess types.
 *
 * Squares are plain numbers 0..63 with a1 = 0 and h8 = 63, so
 * `file = sq & 7` and `rank = sq >> 3`. Level data uses the readable
 * `SquareName` form ('e4') and is converted at load time.
 */

export type Color = 'w' | 'b';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  readonly color: Color;
  readonly type: PieceType;
  /**
   * Stable per-piece identity, minted once when the position is parsed.
   *
   * Board updates copy the piece object to its new square, so this id follows
   * a piece around for the whole level. That is what lets the UI animate a
   * rook *sliding* down its file instead of unmounting one piece and mounting
   * another — and the slide is itself instructional, since the path is the
   * lesson.
   */
  readonly id: string;
}

/** Board index, 0..63, a1 = 0, h8 = 63. */
export type Square = number;

/** Human-readable square, e.g. 'e4'. Used in level data only. */
export type SquareName = string;

export const FILES = 'abcdefgh';
export const RANKS = '12345678';

export const fileOf = (sq: Square): number => sq & 7;
export const rankOf = (sq: Square): number => sq >> 3;
export const squareAt = (file: number, rank: number): Square => rank * 8 + file;

export const onBoard = (file: number, rank: number): boolean =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8;

export function squareName(sq: Square): SquareName {
  return FILES[fileOf(sq)] + RANKS[rankOf(sq)];
}

export function parseSquare(name: SquareName): Square {
  const file = FILES.indexOf(name[0]);
  const rank = RANKS.indexOf(name[1]);
  if (file < 0 || rank < 0 || name.length !== 2) {
    throw new Error(`Invalid square name: ${name}`);
  }
  return squareAt(file, rank);
}

/**
 * Level data writes square lists as either 'a4 g3 g4' or ['a4', 'g3'].
 * Both collapse to Square[] here.
 */
export function parseSquares(input: string | readonly SquareName[]): Square[] {
  const names = typeof input === 'string' ? input.trim().split(/\s+/).filter(Boolean) : input;
  return names.map(parseSquare);
}

export const opposite = (color: Color): Color => (color === 'w' ? 'b' : 'w');
