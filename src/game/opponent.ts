/**
 * The computer's side of the chase: a small alpha-beta search, written for
 * this game rather than borrowed.
 *
 * An off-the-shelf engine was considered and set aside, for reasons that will
 * still be true when one is wanted for full games later:
 *
 * - **There are no kings.** Real engines are built around the king and reject
 *   a position without one, which is every position here.
 * - **It would play a different game.** A pawn reaching the end is the win
 *   here, and catching every pawn is too. To an engine those are a promotion
 *   worth some points and a material count.
 * - **The hard part is being beatable.** The game tree is tiny — at most
 *   eight pawns against one piece, no castling, no check — so a few plies are
 *   instant on a phone, and the real work is a computer that loses to a
 *   four-year-old *convincingly*. That is `Strength`, and it is easier to tune
 *   in code we own.
 *
 * Pure and seeded: the same position, strength and seed always give the same
 * move, which is what lets `chase.test.ts` play whole games out.
 */

import type { Board } from '../chess/board';
import { findPieces, pieceAt } from '../chess/board';
import { attackedFrom } from '../chess/moves';
import { type Color, type Square, opposite, rankOf } from '../chess/types';
import { type ChaseMove, type ChaseSide, type Strength, movesFor, pawnColor, play, winner } from './chase';
import type { Rng } from './random';

/** Bigger than anything the evaluation can reach. */
const WIN = 100_000;

const PAWN = 100;
/** Per rank advanced, squared — a pawn two steps from home is worth far more than one just off it. */
const ADVANCE = 7;
/** A pawn another pawn guards: the shape that makes eight pawns a match for a queen. */
const GUARDED = 18;

/** How far a pawn of `color` on `sq` has come from its starting rank. */
const advanced = (sq: Square, color: Color): number =>
  color === 'w' ? rankOf(sq) - 1 : 6 - rankOf(sq);

/**
 * The position, scored for the **pawns**: what they have, how far on, and
 * whether they stand together.
 *
 * With the piece to move, the most valuable pawn it can take for free is
 * already counted as gone. That one term is what keeps a shallow search from
 * walking a pawn into the piece's reach and calling it progress.
 */
function evaluate(board: Board, side: ChaseSide, toMove: Color): number {
  const pawns = pawnColor(side);
  const piece = opposite(pawns);

  const guarded = new Set<Square>();
  for (const sq of findPieces(board, pawns)) for (const g of attackedFrom(board, sq)) guarded.add(g);
  const covered = new Set<Square>();
  for (const sq of findPieces(board, piece)) for (const c of attackedFrom(board, sq)) covered.add(c);

  let score = 0;
  let hanging = 0;
  for (const sq of findPieces(board, pawns)) {
    const a = advanced(sq, pawns);
    const value = PAWN + a * a * ADVANCE;
    score += value + (guarded.has(sq) ? GUARDED : 0);
    if (covered.has(sq) && !guarded.has(sq)) hanging = Math.max(hanging, value);
  }
  if (toMove === piece) score -= hanging;
  return score;
}

/** Captures first, then the furthest pawn pushes: good moves early is what makes the pruning bite. */
function ordered(board: Board, moves: ChaseMove[], color: Color): ChaseMove[] {
  const weight = (m: ChaseMove) => {
    const taken = pieceAt(board, m.to) ? 1000 : 0;
    const mover = pieceAt(board, m.from);
    return taken + (mover?.type === 'p' ? advanced(m.to, color) : 0);
  };
  return [...moves].sort((a, b) => weight(b) - weight(a));
}

/** Negamax with alpha-beta. The score is for `toMove`. */
function search(
  board: Board,
  side: ChaseSide,
  toMove: Color,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
): number {
  const won = winner(board, side, toMove);
  // Sooner wins score higher and later losses score higher, so the computer
  // finishes a won game rather than toying with it, and drags a lost one out.
  if (won) return won === toMove ? WIN - ply : -(WIN - ply);

  if (depth === 0) {
    const forPawns = evaluate(board, side, toMove);
    return toMove === pawnColor(side) ? forPawns : -forPawns;
  }

  let best = -Infinity;
  for (const move of ordered(board, movesFor(board, toMove), toMove)) {
    const score = -search(play(board, move), side, opposite(toMove), depth - 1, -beta, -alpha, ply + 1);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Every move `color` has, with what the search makes of it. Exposed for the tests. */
export function scoreMoves(
  board: Board,
  side: ChaseSide,
  color: Color,
  depth: number,
): { move: ChaseMove; score: number }[] {
  return movesFor(board, color).map((move) => ({
    move,
    score: -search(play(board, move), side, opposite(color), depth - 1, -Infinity, Infinity, 1),
  }));
}

/**
 * The computer's move, or null if it has none (which `winner` will already
 * have called a loss).
 *
 * It scores every move and picks at random among those within `slack` of the
 * best. A finishing move scores so far above everything else that it is
 * always taken, and a move that loses on the spot is never inside the slack of
 * one that does not — so a gentle computer misses chances and wanders, but
 * does not throw a game in a way that looks like it was thrown.
 */
export function chooseMove(
  board: Board,
  side: ChaseSide,
  color: Color,
  strength: Strength,
  rng: Rng,
): ChaseMove | null {
  const scored = scoreMoves(board, side, color, Math.max(1, strength.depth));
  if (scored.length === 0) return null;
  const best = Math.max(...scored.map((s) => s.score));
  const near = scored.filter((s) => s.score >= best - strength.slack);
  return near[Math.floor(rng() * near.length)].move;
}
