/**
 * Random level generation for Endless mode.
 *
 * Built by **random walk** rather than by random placement plus search: drop
 * the piece somewhere, then take N legal moves, and make every square it lands
 * on a star.
 *
 * That construction gives two guarantees for free, which is why it's worth
 * doing this way:
 *
 * 1. The level is always winnable — the walk itself is a solution of length N.
 * 2. `par` is exactly N. Each star needs its own landing, so no line can beat
 *    N moves, and the walk achieves it.
 *
 * So no solver call is needed at generation time, which matters because this
 * runs on a phone between levels. The solver still checks the property in
 * `generator.test.ts`, where being slow costs nothing.
 *
 * Endless levels are never scored or saved: this is the pressure-free mode,
 * valuable exactly when she's stuck on a numbered level and wants to just mess
 * about with the piece.
 */

import { type Board, emptyBoard, movePiece, toFen } from '../chess/board';
import { destinations } from '../chess/moves';
import { type PieceType, type Square, squareName } from '../chess/types';
import { toLevel } from './engine';
import { type Rng, randInt } from './random';
import type { Level, LevelData, Tier, WorldKey } from './types';

export interface GenerateOptions {
  readonly world: WorldKey;
  readonly piece: PieceType;
  readonly tier: Tier;
  /** 0-based. Higher means more stars. */
  readonly difficulty: number;
  readonly rng: Rng;
  /** Distinguishes the generated level's id from its neighbours. */
  readonly index: number;
}

/** Restarts allowed when a walk paints itself into a corner. */
const MAX_ATTEMPTS = 40;

const MIN_STARS = 2;
const MAX_STARS = 6;

export const starCountFor = (difficulty: number): number =>
  Math.min(MIN_STARS + Math.floor(difficulty / 2), MAX_STARS);

/**
 * A pawn only moves forward, so it needs `steps` ranks of room ahead of it —
 * and it can never stand on the first or last rank. Every other piece can
 * start anywhere.
 */
const startSquares = (piece: PieceType, steps: number): readonly Square[] =>
  Array.from({ length: 64 }, (_, i) => i).filter((sq) => {
    if (piece !== 'p') return true;
    const rank = sq >> 3;
    return rank >= 1 && rank <= 7 - steps;
  });

/** Walks `steps` legal moves from `from`, never revisiting a square. */
function walk(board: Board, from: Square, steps: number, rng: Rng): Square[] | null {
  const visited = new Set<Square>([from]);
  const path: Square[] = [];
  let current = from;
  let position = board;

  for (let i = 0; i < steps; i++) {
    const options = destinations(position, current).filter((sq) => !visited.has(sq));
    if (options.length === 0) return null;

    const to = options[randInt(rng, options.length)];
    position = movePiece(position, current, to);
    visited.add(to);
    path.push(to);
    current = to;
  }

  return path;
}

/**
 * A random level for this piece and tier, or null if the piece could not be
 * walked far enough. Callers should treat null as "try another seed".
 */
export function generateLevel({
  world,
  piece,
  tier,
  difficulty,
  rng,
  index,
}: GenerateOptions): Level | null {
  const steps = starCountFor(difficulty);
  const starts = startSquares(piece, steps);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const from = starts[randInt(rng, starts.length)];

    const board = emptyBoard().slice();
    board[from] = { color: 'w', type: piece, id: `w${piece}${from}` };

    const path = walk(board, from, steps, rng);
    if (!path) continue;

    const data: LevelData = {
      id: `endless-${world}-t${tier}-${index}`,
      world,
      tier,
      fen: toFen({ board, turn: 'w' }),
      stars: path.map(squareName).join(' '),
      goal: 'collectAllStars',
      // Exact by construction — see the note at the top of this file.
      par: steps,
      // The walk is a known-optimal line, so it makes a genuinely useful hint.
      hint: [[squareName(from), squareName(path[0])]],
    };

    return toLevel(data);
  }

  return null;
}

/**
 * Falls back to an easier level rather than returning nothing, so Endless can
 * always hand the player something to do.
 */
export function generateLevelOrEasier(options: GenerateOptions): Level | null {
  for (let difficulty = options.difficulty; difficulty >= 0; difficulty--) {
    const level = generateLevel({ ...options, difficulty });
    if (level) return level;
  }
  return null;
}
