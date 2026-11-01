/**
 * Board setup: she puts the pieces where they start.
 *
 * The pure half, tested without React, the same split `canvasGeometry.ts` and
 * `grownUpGate.ts` make. Nothing here imports the store or draws anything.
 *
 * It is a tutorial in parts rather than one big puzzle. Thirty-two pieces on
 * an empty board is far too much to ask of someone who has never done it, so
 * each stage teaches one kind of piece (shown first, then placed) with
 * everything from earlier stages already standing, and only the last two
 * stages ask for the lot.
 */

import { type Board, emptyBoard, setPiece } from '../chess/board';
import {
  type Color,
  type Piece,
  type PieceType,
  type Square,
  fileOf,
  parseSquare,
  rankOf,
  squareName,
} from '../chess/types';
import { type Rng, randInt } from './random';

/** Where each kind of piece starts, for white. Black is the same files on the far side. */
const HOME_FILES: Record<PieceType, readonly number[]> = {
  r: [0, 7],
  n: [1, 6],
  b: [2, 5],
  q: [3],
  k: [4],
  p: [0, 1, 2, 3, 4, 5, 6, 7],
};

/** The squares a piece of this kind and colour starts on. */
export function homeSquares(color: Color, type: PieceType): Square[] {
  const rank = type === 'p' ? (color === 'w' ? 1 : 6) : color === 'w' ? 0 : 7;
  return HOME_FILES[type].map((file) => rank * 8 + file);
}

/** What should stand on this square at the start of a game, if anything. */
export function startingPieceOn(sq: Square): { color: Color; type: PieceType } | null {
  const rank = rankOf(sq);
  const file = fileOf(sq);
  const color: Color | null = rank <= 1 ? 'w' : rank >= 6 ? 'b' : null;
  if (!color) return null;
  if (rank === 1 || rank === 6) return { color, type: 'p' };
  const type = (Object.keys(HOME_FILES) as PieceType[]).find(
    (t) => t !== 'p' && HOME_FILES[t].includes(file),
  )!;
  return { color, type };
}

export type StageKey = 'r' | 'n' | 'b' | 'q' | 'k' | 'p' | 'all' | 'lone';

type Given = readonly (readonly [square: string, color: Color, type: PieceType])[];

export interface SetupStage {
  readonly key: StageKey;
  /** The kinds of piece she places in this stage. */
  readonly pieces: readonly PieceType[];
  /**
   * Pieces already standing when the stage opens, beyond everything earlier
   * stages placed. They are what tells her which side is whose: with a white
   * piece at the bottom and a black one at the top, "the other colour goes over
   * there" needs no words.
   *
   * A function for a stage whose opening is drawn at random, so "do it again"
   * is a different board rather than the same one remembered.
   */
  readonly given: Given | ((rng: Rng) => Given);
  /**
   * Whether this stage stands on the earlier ones. The final two do not —
   * they are the whole thing from an almost empty board, which is what makes
   * them the test rather than one more part.
   */
  readonly cumulative: boolean;
  /** Whether the pieces are shown on their squares before she places them. */
  readonly demo: boolean;
}

/**
 * The stages, in the order they are taught.
 *
 * Outside in along the back rank — rooks in the corners, then the knights
 * beside them, then the bishops — because each one is "next to the last", and
 * that is a rule she can follow by looking. Queen before king, so "the queen
 * goes on her own colour" is learned while the middle two squares are both
 * still free. Pawns last of the parts: eight of a kind is the easiest stage
 * to understand and the longest to do, so it comes once she is fluent at
 * putting things down.
 */
export const STAGES: readonly SetupStage[] = [
  {
    key: 'r',
    pieces: ['r'],
    // One of each colour, so the very first thing she sees already says which
    // side is hers. Her rook is in her bottom-left corner, as it is in every
    // real game.
    given: [
      ['a1', 'w', 'r'],
      ['a8', 'b', 'r'],
    ],
    cumulative: true,
    demo: true,
  },
  { key: 'n', pieces: ['n'], given: [], cumulative: true, demo: true },
  { key: 'b', pieces: ['b'], given: [], cumulative: true, demo: true },
  { key: 'q', pieces: ['q'], given: [], cumulative: true, demo: true },
  { key: 'k', pieces: ['k'], given: [], cumulative: true, demo: true },
  { key: 'p', pieces: ['p'], given: [], cumulative: true, demo: true },
  {
    key: 'all',
    pieces: ['r', 'n', 'b', 'q', 'k', 'p'],
    // The two kings, standing where they belong: one piece a side is enough to
    // say which way round the board is, and it is the pair she is least
    // likely to get right by symmetry alone.
    given: [
      ['e1', 'w', 'k'],
      ['e8', 'b', 'k'],
    ],
    cumulative: false,
    demo: false,
  },
  {
    key: 'lone',
    pieces: ['r', 'n', 'b', 'q', 'k', 'p'],
    // The lot again, from one pawn of one colour on a random square of its
    // home rank. This is the harder version, and on purpose the one stage
    // without a piece of each colour standing: she has to read which end is
    // whose from where that pawn is, and send the other colour to the far end.
    given: (rng) => {
      const color: Color = randInt(rng, 2) === 0 ? 'w' : 'b';
      const squares = homeSquares(color, 'p');
      return [[squareName(squares[randInt(rng, squares.length)]), color, 'p']];
    },
    cumulative: false,
    demo: false,
  },
];

export const LAST_STAGE = STAGES.length - 1;

/** The stage she is up to, given how many she has finished. Clamped to the last. */
export const openingStage = (finished: number): number =>
  Math.max(0, Math.min(finished, LAST_STAGE));

/** Every stage up to and including the next unfinished one is open. */
export const isStageOpen = (stage: number, finished: number): boolean =>
  stage >= 0 && stage <= Math.min(finished, LAST_STAGE);

export interface SetupState {
  readonly stage: number;
  readonly board: Board;
  /** Pieces still to place, the next one first. */
  readonly queue: readonly Piece[];
  /** The square the last piece went on, for the board's last-move tint. */
  readonly last: Square | null;
}

const mint = (color: Color, type: PieceType, n: number): Piece => ({
  color,
  type,
  id: `setup-${color}${type}${n}`,
});

/**
 * Opens a stage: the board with everything already standing, and the queue of
 * pieces to come.
 *
 * The queue alternates white and black, so every second piece asks "which end
 * of the board is this one's?" — that is half of what setting up is.
 *
 * `rng` only matters to a stage whose opening is drawn at random.
 */
export function startStage(stage: number, rng: Rng = Math.random): SetupState {
  const spec = STAGES[stage];
  let board = emptyBoard();
  let n = 0;
  const stand = (sq: Square, color: Color, type: PieceType) => {
    board = setPiece(board, sq, mint(color, type, n++));
  };

  if (spec.cumulative) {
    for (const earlier of STAGES.slice(0, stage)) {
      for (const type of earlier.pieces) {
        for (const color of ['w', 'b'] as const) {
          for (const sq of homeSquares(color, type)) stand(sq, color, type);
        }
      }
    }
  }
  const given = typeof spec.given === 'function' ? spec.given(rng) : spec.given;
  for (const [name, color, type] of given) stand(parseSquare(name), color, type);

  const queue: Piece[] = [];
  for (const type of spec.pieces) {
    const white = homeSquares('w', type).filter((sq) => !board[sq]);
    const black = homeSquares('b', type).filter((sq) => !board[sq]);
    for (let i = 0; i < Math.max(white.length, black.length); i++) {
      if (i < white.length) queue.push(mint('w', type, n++));
      if (i < black.length) queue.push(mint('b', type, n++));
    }
  }

  return { stage, board, queue, last: null };
}

/**
 * Where a piece may go: any square of its kind and colour that is still empty.
 *
 * Either rook goes in either corner — the two are the same piece, and asking
 * her to tell them apart would be marking her wrong for something that is
 * not wrong.
 */
export function squaresFor(board: Board, piece: { color: Color; type: PieceType }): Square[] {
  return homeSquares(piece.color, piece.type).filter((sq) => !board[sq]);
}

/**
 * Puts the next piece on `sq`, if that is where it goes.
 *
 * A wrong square returns the same state object, untouched. Nothing is counted
 * against her: the piece going back to the tray is the whole of the answer.
 */
export function place(state: SetupState, sq: Square): SetupState {
  const piece = state.queue[0];
  if (!piece || !squaresFor(state.board, piece).includes(sq)) return state;
  return {
    ...state,
    board: setPiece(state.board, sq, piece),
    queue: state.queue.slice(1),
    last: sq,
  };
}

export const isComplete = (state: SetupState): boolean => state.queue.length === 0;

/**
 * What the stage shows before she starts: every square she is about to fill,
 * with the piece that belongs there.
 */
export function demoOf(state: SetupState): { square: Square; color: Color; type: PieceType }[] {
  const kinds = new Set(state.queue.map((p) => `${p.color}${p.type}`));
  const out: { square: Square; color: Color; type: PieceType }[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const home = startingPieceOn(sq);
    if (home && !state.board[sq] && kinds.has(`${home.color}${home.type}`)) {
      out.push({ square: sq, ...home });
    }
  }
  return out;
}

/** The hint: where the piece in her hand can go, and nothing about the rest. */
export function hintOf(state: SetupState): { square: Square; color: Color; type: PieceType }[] {
  const piece = state.queue[0];
  if (!piece) return [];
  return squaresFor(state.board, piece).map((square) => ({
    square,
    color: piece.color,
    type: piece.type,
  }));
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The square under a point in window coordinates, white at the bottom, or -1
 * if the point is off the board or the board has not been measured.
 *
 * A worklet, so the drag can work out where it landed on the UI thread and
 * the same function runs in vitest.
 */
export function squareAtPoint(px: number, py: number, board: Rect | null): number {
  'worklet';
  if (!board || board.width <= 0 || board.height <= 0) return -1;
  const fx = (px - board.x) / board.width;
  const fy = (py - board.y) / board.height;
  if (fx < 0 || fx >= 1 || fy < 0 || fy >= 1) return -1;
  const file = Math.floor(fx * 8);
  const rank = 7 - Math.floor(fy * 8);
  return rank * 8 + file;
}

/** The centre of a square in window coordinates, for flying a piece to it. */
export function squareCentre(sq: number, board: Rect): { x: number; y: number } {
  'worklet';
  const cell = board.width / 8;
  const file = sq % 8;
  const rank = Math.floor(sq / 8);
  return { x: board.x + (file + 0.5) * cell, y: board.y + (7 - rank + 0.5) * cell };
}
