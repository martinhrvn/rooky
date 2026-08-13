/**
 * Breadth-first solver over level states.
 *
 * Its job is to make hand-authoring ~100 levels safe. For each level it answers
 * "is this winnable at all, and in how few moves", which the test suite then
 * asserts against the level's declared `par`. Without it, a set this size is
 * guaranteed to contain an impossible level or a wrong par, and a wrong par is
 * visible to the player because it sizes the move-dot row.
 *
 * The state space stays small: at most a couple of white pieces (64 squares
 * each) times the subsets of stars and enemies still on the board, and the
 * visited set collapses transpositions.
 */

import { findPieces, toFen } from '../chess/board';
import { destinations } from '../chess/moves';
import type { Square } from '../chess/types';
import { applyMove, isPromotion, startLevel } from './engine';
import type { GameState, Level, PromotionType } from './types';

/** Collapses a position plus its uncollected stars into a dedup key. */
const keyOf = (state: GameState): string =>
  `${toFen({ board: state.board, turn: 'w' })}|${[...state.stars].sort((a, b) => a - b).join(',')}`;

export interface SolutionMove {
  readonly from: Square;
  readonly to: Square;
  /** Set only when the move promotes a pawn. */
  readonly promoteTo?: PromotionType;
}

export interface Solution {
  readonly moves: SolutionMove[];
  readonly length: number;
}

/**
 * Shortest winning line, or null if the level cannot be won.
 *
 * `maxDepth` bounds the search; levels are designed well under it, so hitting
 * the bound means the level is unwinnable in any reasonable number of moves.
 */
/** Promotion choices worth branching on, best-first so ties favour the queen. */
const PROMOTIONS: readonly PromotionType[] = ['q', 'n', 'r', 'b'];

export const solve = (level: Level, maxDepth = 12): Solution | null =>
  solveFrom(startLevel(level), maxDepth);

/**
 * True when the position can no longer be won.
 *
 * Used to take back a move that strands her — most obviously promoting to a
 * queen where only a knight reaches the last enemy. Nothing attacked her, so
 * she gets no "lost" state; without this the board would simply stop
 * responding.
 */
export const isDeadEnd = (state: GameState, maxDepth = 12): boolean =>
  state.phase === 'playing' && solveFrom(state, maxDepth) === null;

/** Shortest winning line from an arbitrary position. */
export function solveFrom(start: GameState, maxDepth = 12): Solution | null {
  if (start.phase === 'won') return { moves: [], length: 0 };
  if (start.phase === 'lost') return null;

  const visited = new Set<string>([keyOf(start)]);
  let frontier: { state: GameState; path: SolutionMove[] }[] = [{ state: start, path: [] }];

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: typeof frontier = [];

    for (const { state, path } of frontier) {
      for (const from of findPieces(state.board, 'w')) {
        for (const to of destinations(state.board, from)) {
          // A promotion is really four different moves. Branching here is what
          // lets par account for underpromotion being faster — a knight
          // reaches squares a queen cannot.
          const choices = isPromotion(state.board, from, to) ? PROMOTIONS : [undefined];

          for (const promoteTo of choices) {
            const candidate = applyMove(state, from, to, promoteTo);

            // Moving into an attacked square loses, so it is never part of a
            // solution — prune rather than expand.
            if (candidate.phase === 'lost') continue;

            const moves = [...path, { from, to, promoteTo }];
            if (candidate.phase === 'won') return { moves, length: moves.length };

            const key = keyOf(candidate);
            if (visited.has(key)) continue;
            visited.add(key);
            next.push({ state: candidate, path: moves });
          }
        }
      }
    }

    frontier = next;
  }

  return null;
}
