/**
 * Left-to-right mirroring of a level.
 *
 * Tier 3 is tier 2 with the danger overlay switched off, and its positions are
 * tier 2's mirrored. Holding the lesson and the difficulty identical means "no
 * help" is the only variable that changed — but the board looks different
 * enough that she can't coast on remembering the answer.
 *
 * Mirroring across files is safe for every piece that moves symmetrically
 * left-to-right, which is all of them: a pawn's direction is vertical, so a
 * horizontal flip leaves it alone.
 */

import { emptyBoard, parseFen, toFen } from '../chess/board';
import { type Square, fileOf, parseSquares, rankOf, squareAt, squareName } from '../chess/types';
import type { LevelData, Tier } from '../game/types';

/** The same square on the other side of the board. */
export const mirrorSquare = (sq: Square): Square => squareAt(7 - fileOf(sq), rankOf(sq));

export function mirrorFen(fen: string): string {
  const { board, turn } = parseFen(fen);
  const flipped = emptyBoard().slice();
  board.forEach((piece, sq) => {
    if (piece) flipped[mirrorSquare(sq)] = piece;
  });
  return toFen({ board: flipped, turn });
}

/**
 * A mirrored copy of `level`, renumbered into `tier` with a fresh id.
 *
 * `par` carries over untouched: a mirrored position is isomorphic to its
 * original, so the optimal line is the same length. The solver test asserts
 * this rather than trusting it.
 */
export function mirrorLevel(level: LevelData, tier: Tier, id: string): LevelData {
  return {
    ...level,
    id,
    tier,
    fen: mirrorFen(level.fen),
    stars: parseSquares(level.stars ?? [])
      .map((sq) => squareName(mirrorSquare(sq)))
      .join(' '),
    hint: level.hint?.map(
      ([from, to]) =>
        [
          squareName(mirrorSquare(parseSquares(from)[0])),
          squareName(mirrorSquare(parseSquares(to)[0])),
        ] as const,
    ),
  };
}

/**
 * A world's authored levels plus its derived tier 3, which is tier 2 mirrored
 * left-to-right.
 *
 * The lesson and the difficulty are held identical, so "no help" is the only
 * variable that changed — but it looks different enough that she can't coast on
 * remembering the answer. Derived rather than authored twice, so the two tiers
 * can never drift apart.
 *
 * Lives here rather than in `index.ts` so the content gate can call it too: a
 * world ships these levels, so a world's own test has to check them. They were
 * once covered only by a global sweep over every level at once, which is
 * exactly the thing the per-world gate exists to replace.
 */
export const withMirroredTier3 = (levels: readonly LevelData[]): LevelData[] => {
  const tier2 = levels.filter((level) => level.tier === 2);
  return [
    ...levels,
    ...tier2.map((level, i) =>
      mirrorLevel(level, 3, `${level.world}-t3-${String(i + 1).padStart(2, '0')}`),
    ),
  ];
};
