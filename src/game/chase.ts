/**
 * The chase: a row of pawns against one piece, played against the computer.
 *
 * Two sides, and she is always white:
 *
 * - **Race** — her eight pawns against one of its pieces. A pawn reaching the
 *   far side wins; losing every pawn loses.
 * - **Hunt** — her queen against its pawns, two then four then eight. Catching
 *   the lot wins; one getting past her to her side loses.
 *
 * This is the first thing in the app where the other side *moves on its own
 * turn* — everywhere else black only punishes. So it has its own rules here
 * rather than borrowing `engine.ts`, whose puzzle rules (rewind on capture,
 * stars, par) are exactly what a game must not do: losing a pawn is a normal
 * part of the race, not a mistake to take back.
 *
 * Pure, like the rest of `src/game/`: no React, no timers. The opponent is in
 * `opponent.ts`.
 */

import { type Board, findPieces, movePiece, parseFen, pieceAt } from '../chess/board';
import { destinations, promotionRank } from '../chess/moves';
import { type Color, type PieceType, type Square, opposite, rankOf } from '../chess/types';

export type ChaseSide = 'race' | 'hunt';

export interface ChaseMove {
  readonly from: Square;
  readonly to: Square;
}

/** How hard the computer tries. See `opponent.ts`. */
export interface Strength {
  /** Plies searched, its own move included. */
  readonly depth: number;
  /**
   * How far below its best move (in the evaluation's units, a pawn ≈ 100) a
   * move may score and still be picked. Zero plays its best every time; more
   * is a computer that sometimes looks the wrong way.
   */
  readonly slack: number;
}

export interface ChaseRound {
  readonly side: ChaseSide;
  /** What the computer plays: the piece in a race, `'p'` in a hunt. */
  readonly opponent: PieceType;
  /** Pawns on the board at the start. Eight in every race. */
  readonly pawnCount: number;
  readonly fen: string;
  readonly strength: Strength;
}

/** White moves first in every round, so she always opens. */
const round = (
  side: ChaseSide,
  opponent: PieceType,
  pawnCount: number,
  placement: string,
  strength: Strength,
): ChaseRound => ({ side, opponent, pawnCount, fen: `${placement} w - -`, strength });

/**
 * The two ladders.
 *
 * **Race goes knight, bishop, rook, queen**, because that is the order a lone
 * piece gets better at stopping pawns: a knight cannot sweep a file at all, a
 * bishop only covers one colour, and the rook and queen can sit behind the
 * whole row. The strength rises alongside, so the last round is both the
 * strongest piece and the computer trying hardest.
 *
 * **Hunt goes two, four, eight pawns**, always against her queen — the one
 * piece that can beat eight pawns, and one she has met in her own world by the
 * time this opens. Two pawns side by side are the first lesson: they guard
 * each other, so the one to take is never the one in front of you.
 *
 * The strengths are tuned by `chase.test.ts`, which plays each round out and
 * fails if she could not win it — so a tweak here that makes a round unfair
 * says so rather than shipping.
 */
export const ROUNDS: Readonly<Record<ChaseSide, readonly ChaseRound[]>> = {
  race: [
    round('race', 'n', 8, '3n4/8/8/8/8/8/PPPPPPPP/8', { depth: 1, slack: 90 }),
    round('race', 'b', 8, '3b4/8/8/8/8/8/PPPPPPPP/8', { depth: 2, slack: 60 }),
    round('race', 'r', 8, '3r4/8/8/8/8/8/PPPPPPPP/8', { depth: 3, slack: 20 }),
    round('race', 'q', 8, '3q4/8/8/8/8/8/PPPPPPPP/8', { depth: 2, slack: 40 }),
  ],
  hunt: [
    round('hunt', 'p', 2, '8/3pp3/8/8/8/8/8/3Q4', { depth: 1, slack: 100 }),
    round('hunt', 'p', 4, '8/2pppp2/8/8/8/8/8/3Q4', { depth: 1, slack: 40 }),
    round('hunt', 'p', 8, '8/pppppppp/8/8/8/8/8/3Q4', { depth: 2, slack: 40 }),
  ],
};

export const SIDES: readonly ChaseSide[] = ['race', 'hunt'];

/** Which colour has the pawns. The other one has the piece. */
export const pawnColor = (side: ChaseSide): Color => (side === 'race' ? 'w' : 'b');

export function startBoard(r: ChaseRound): Board {
  return parseFen(r.fen).board;
}

/** Every move `color` has. Pseudo-legal, as everywhere in the app — there are no kings. */
export function movesFor(board: Board, color: Color): ChaseMove[] {
  const out: ChaseMove[] = [];
  for (const from of findPieces(board, color)) {
    for (const to of destinations(board, from)) out.push({ from, to });
  }
  return out;
}

/**
 * Makes the move. A pawn reaching the end is **not** promoted: arriving is the
 * win, so there is nothing for it to become and no question to ask her.
 */
export const play = (board: Board, move: ChaseMove): Board => movePiece(board, move.from, move.to);

/**
 * Who has won, with `toMove` about to play — or null while it goes on.
 *
 * Checked after every move, in this order:
 * 1. A pawn on its last rank wins for the pawns. First, because the move that
 *    got it there may also have been its last pawn move available.
 * 2. No pawns left wins for the piece, and no piece left wins for the pawns
 *    (a pawn can take it, and that is a real way to win the race).
 * 3. A side with nothing it can do has lost. In practice that is every pawn
 *    stood blocked, which the piece engineered, so it is the piece's win —
 *    and without this rule the board would simply stop answering her.
 *
 * There is no draw, and that is not an omission: every pawn move advances or
 * captures, and the pawns must move every other turn, so a game cannot last
 * more than about a hundred moves and always ends in one of the above.
 */
export function winner(board: Board, side: ChaseSide, toMove: Color): Color | null {
  const pawns = pawnColor(side);
  const piece = opposite(pawns);
  const last = promotionRank(pawns);

  const pawnSquares = findPieces(board, pawns);
  if (pawnSquares.some((sq) => rankOf(sq) === last)) return pawns;
  if (pawnSquares.length === 0) return piece;
  if (findPieces(board, piece).length === 0) return pawns;
  if (movesFor(board, toMove).length === 0) return opposite(toMove);
  return null;
}

/** Her targets for the piece on `from`, or none if it is not hers. */
export function targetsFrom(board: Board, from: Square | null): Square[] {
  if (from === null || pieceAt(board, from)?.color !== 'w') return [];
  return destinations(board, from);
}

/**
 * How far into a ladder she may go: every round she has won, and the one after.
 * `won` is how many rounds of that side she has beaten, in order.
 */
export const isRoundOpen = (index: number, won: number): boolean => index <= won;

/** The round to open on: the one she is up to, or the last once she has beaten them all. */
export const openingRound = (side: ChaseSide, won: number): number =>
  Math.min(won, ROUNDS[side].length - 1);
