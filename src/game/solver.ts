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
import { applyMove, startLevel } from './engine';
import type { GameState, Level } from './types';

/** Collapses a position plus its uncollected stars into a dedup key. */
const keyOf = (state: GameState): string =>
  `${toFen({ board: state.board, turn: 'w' })}|${[...state.stars].sort((a, b) => a - b).join(',')}`;

export interface Solution {
  readonly moves: { from: Square; to: Square }[];
  readonly length: number;
}

/**
 * Shortest winning line, or null if the level cannot be won.
 *
 * `maxDepth` bounds the search; levels are designed well under it, so hitting
 * the bound means the level is unwinnable in any reasonable number of moves.
 */
export function solve(level: Level, maxDepth = 12): Solution | null {
  const start = startLevel(level);
  if (start.phase === 'won') return { moves: [], length: 0 };

  const visited = new Set<string>([keyOf(start)]);
  let frontier: { state: GameState; path: { from: Square; to: Square }[] }[] = [
    { state: start, path: [] },
  ];

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: typeof frontier = [];

    for (const { state, path } of frontier) {
      for (const from of findPieces(state.board, 'w')) {
        for (const to of destinations(state.board, from)) {
          const candidate = applyMove(state, from, to);

          // Moving into an attacked square loses, so it is never part of a
          // solution — prune rather than expand.
          if (candidate.phase === 'lost') continue;

          const moves = [...path, { from, to }];
          if (candidate.phase === 'won') return { moves, length: moves.length };

          const key = keyOf(candidate);
          if (visited.has(key)) continue;
          visited.add(key);
          next.push({ state: candidate, path: moves });
        }
      }
    }

    frontier = next;
  }

  return null;
}
