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

import { attackers } from '../chess/attacks';
import { type Board, emptyBoard, movePiece, toFen } from '../chess/board';
import { attackedFrom, destinations } from '../chess/moves';
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

/**
 * Restarts allowed when a walk paints itself into a corner. Capture levels
 * need far more, because placing enemies on the walk can block the very slides
 * the walk depends on.
 */
const MAX_ATTEMPTS = 40;
const MAX_CAPTURE_ATTEMPTS = 400;

const MIN_TARGETS = 2;
const MAX_STARS = 6;
/** Capture levels are harder per target, so they stay shorter. */
const MAX_ENEMIES = 4;

/**
 * Enemy types are drawn mostly from short-range pieces. A random queen or rook
 * covers so much board that almost no walk survives the safety check, and the
 * red overlay becomes a wash of colour rather than a readable shape.
 */
const ENEMY_TYPES: readonly PieceType[] = ['p', 'n', 'p', 'n', 'b', 'p'];

export const starCountFor = (difficulty: number): number =>
  Math.min(MIN_TARGETS + Math.floor(difficulty / 2), MAX_STARS);

export const enemyCountFor = (difficulty: number): number =>
  Math.min(MIN_TARGETS + Math.floor(difficulty / 3), MAX_ENEMIES);

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

/**
 * Walks `steps` moves from `from`, never revisiting a square.
 *
 * `step` decides what counts as a move. Star levels walk by `destinations`;
 * capture levels walk by `attackedFrom`, because every step there will land on
 * an enemy. The two agree for every piece except the pawn, which pushes
 * straight but takes diagonally — walking a pawn by its pushes would produce a
 * path it could never actually capture along.
 */
function walk(
  board: Board,
  from: Square,
  steps: number,
  rng: Rng,
  step: (board: Board, sq: Square) => Square[],
): Square[] | null {
  const visited = new Set<Square>([from]);
  const path: Square[] = [];
  let current = from;
  let position = board;

  for (let i = 0; i < steps; i++) {
    const options = step(position, current).filter((sq) => !visited.has(sq));
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
 * Checks the walk still works once enemies are standing on its landing
 * squares, and that every capture is safe when it happens.
 *
 * Both conditions are needed. Enemies can block the very slides the walk
 * depends on — a rook walking a1→a8→a5 is fine on an empty board, but with an
 * enemy sitting on a5 it can never reach a8. And a capture is only safe
 * relative to the enemies that are *still there*, since taking one removes its
 * cover.
 */
function walkSurvivesEnemies(board: Board, from: Square, path: readonly Square[]): boolean {
  let position = board;
  let current = from;

  for (const to of path) {
    if (!destinations(position, current).includes(to)) return false;
    position = movePiece(position, current, to);
    if (attackers(position, to, 'b').length > 0) return false;
    current = to;
  }
  return true;
}

/**
 * A random level for this piece and tier, or null if nothing workable turned
 * up. Callers should treat null as "try another seed".
 */
export function generateLevel({
  world,
  piece,
  tier,
  difficulty,
  rng,
  index,
}: GenerateOptions): Level | null {
  // Tier 1 collects stars; tiers 2 and 3 capture real pieces, and tier 3 is
  // simply tier 2 with the danger overlay switched off.
  const captures = tier > 1;
  const steps = captures ? enemyCountFor(difficulty) : starCountFor(difficulty);
  const starts = startSquares(piece, steps);
  const attempts = captures ? MAX_CAPTURE_ATTEMPTS : MAX_ATTEMPTS;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const from = starts[randInt(rng, starts.length)];

    const empty = emptyBoard().slice();
    empty[from] = { color: 'w', type: piece, id: `w${piece}${from}` };

    const path = walk(empty, from, steps, rng, captures ? attackedFrom : destinations);
    if (!path) continue;

    let board = empty;
    if (captures) {
      board = empty.slice();
      for (const sq of path) {
        const type = ENEMY_TYPES[randInt(rng, ENEMY_TYPES.length)];
        // A pawn on the first or last rank is not a position chess can reach.
        const rank = sq >> 3;
        const safeType = type === 'p' && (rank === 0 || rank === 7) ? 'n' : type;
        board[sq] = { color: 'b', type: safeType, id: `b${safeType}${sq}` };
      }
      if (!walkSurvivesEnemies(board, from, path)) continue;
    }

    const data: LevelData = {
      id: `endless-${world}-t${tier}-${index}`,
      world,
      tier,
      fen: toFen({ board, turn: 'w' }),
      stars: captures ? '' : path.map(squareName).join(' '),
      goal: captures ? 'captureAll' : 'collectAllStars',
      // Exact by construction — see the note at the top of this file.
      par: steps,
      // The walk is a known-good line, so it makes a genuinely useful hint.
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
