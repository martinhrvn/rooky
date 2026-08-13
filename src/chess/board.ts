/**
 * Board representation and FEN.
 *
 * This is deliberately our own rather than a chess library: nearly every level
 * position is KINGLESS, which real libraries reject as invalid, and we only
 * ever need "where can this piece go" and "what does the enemy attack".
 * See the plan's "Chess core" section.
 */

import {
  type Color,
  type Piece,
  type PieceType,
  type Square,
  fileOf,
  rankOf,
  squareAt,
} from './types';

/** 64 slots, index 0 = a1. `null` means empty. */
export type Board = readonly (Piece | null)[];

export interface Position {
  readonly board: Board;
  readonly turn: Color;
}

export const emptyBoard = (): Board => new Array(64).fill(null);

export const pieceAt = (board: Board, sq: Square): Piece | null => board[sq] ?? null;

/** Returns a new board with `sq` set to `piece` (or cleared when null). */
export function setPiece(board: Board, sq: Square, piece: Piece | null): Board {
  const next = board.slice();
  next[sq] = piece;
  return next;
}

/** Returns a new board with the piece on `from` moved to `to`. */
export function movePiece(board: Board, from: Square, to: Square): Board {
  const next = board.slice();
  next[to] = next[from];
  next[from] = null;
  return next;
}

export function findPieces(board: Board, color?: Color): Square[] {
  const found: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece && (color === undefined || piece.color === color)) found.push(sq);
  }
  return found;
}

const SYMBOLS: Record<string, PieceType> = {
  p: 'p',
  n: 'n',
  b: 'b',
  r: 'r',
  q: 'q',
  k: 'k',
};

/**
 * Parses the board and side-to-move fields of a FEN. Castling, en passant and
 * the clocks are accepted but ignored — tiers 1-3 have no use for them.
 *
 * Unlike a real chess library this does NOT validate the position, so kingless
 * setups like '8/8/8/8/8/8/4R3/8 w - -' load fine.
 */
export function parseFen(fen: string): Position {
  const [placement, turnField] = fen.trim().split(/\s+/);
  if (!placement) throw new Error(`Invalid FEN: ${fen}`);

  const rows = placement.split('/');
  if (rows.length !== 8) {
    throw new Error(`Invalid FEN, expected 8 ranks but got ${rows.length}: ${fen}`);
  }

  const board = new Array<Piece | null>(64).fill(null);

  rows.forEach((row, rowIndex) => {
    // FEN lists rank 8 first, so row 0 is rank index 7.
    const rank = 7 - rowIndex;
    let file = 0;
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        file += Number(ch);
        continue;
      }
      const type = SYMBOLS[ch.toLowerCase()];
      if (!type) throw new Error(`Invalid FEN piece '${ch}': ${fen}`);
      if (file > 7) throw new Error(`Invalid FEN, rank ${rank + 1} overflows: ${fen}`);
      const sq = squareAt(file, rank);
      const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
      // Starting square makes a unique, stable id — one piece per square here.
      board[sq] = { color, type, id: `${color}${type}${sq}` };
      file += 1;
    }
    if (file !== 8) {
      throw new Error(`Invalid FEN, rank ${rank + 1} covers ${file} files: ${fen}`);
    }
  });

  return { board, turn: turnField === 'b' ? 'b' : 'w' };
}

export function toFen({ board, turn }: Position): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let gap = 0;
    for (let file = 0; file < 8; file++) {
      const piece = board[squareAt(file, rank)];
      if (!piece) {
        gap += 1;
        continue;
      }
      if (gap) {
        row += gap;
        gap = 0;
      }
      row += piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
    }
    if (gap) row += gap;
    rows.push(row);
  }
  return `${rows.join('/')} ${turn} - -`;
}

export { fileOf, rankOf, squareAt };
