/**
 * Unlock and completion logic, as pure functions.
 *
 * Lives here rather than inline in a screen so both the home and the piece
 * selector read from one source, and so it can be tested without React.
 *
 * Unlocking is deliberately lenient: a level opens when the one before it is
 * done, a world when the previous world is finished, and **nothing is ever
 * gated behind a star rating**. Stars are for pride, not access.
 */

import { type Catalogue, TIERS, type World, soloPiece, tierLevels } from '../content';
import type { PieceType } from '../chess/types';
import type { Level, Tier } from '../game/types';

export interface Counted {
  readonly done: number;
  readonly total: number;
}

export interface WorldProgress extends Counted {
  readonly byTier: Readonly<Record<Tier, Counted>>;
  /** True only when the world has levels and all of them are done. */
  readonly complete: boolean;
  /** True before a single level here has been finished. */
  readonly untouched: boolean;
}

const count = (levels: readonly Level[], completedIds: ReadonlySet<string>): Counted => ({
  done: levels.filter((level) => completedIds.has(level.id)).length,
  total: levels.length,
});

export function worldProgress(world: World, completedIds: ReadonlySet<string>): WorldProgress {
  const overall = count(world.levels, completedIds);
  const byTier = Object.fromEntries(
    TIERS.map((tier) => [tier, count(tierLevels(world, tier), completedIds)]),
  ) as Record<Tier, Counted>;

  return {
    ...overall,
    byTier,
    complete: overall.total > 0 && overall.done === overall.total,
    untouched: overall.done === 0,
  };
}

/**
 * A world opens once every earlier world is finished. Worlds with no levels
 * yet are never unlocked — they are placeholders for what is coming.
 */
export function isWorldUnlocked(
  worlds: readonly World[],
  world: World,
  completedIds: ReadonlySet<string>,
): boolean {
  const index = worlds.indexOf(world);
  if (index < 0 || world.levels.length === 0) return false;
  return worlds
    .slice(0, index)
    .every((earlier) => worldProgress(earlier, completedIds).complete);
}

/**
 * A level opens when the previous level in its own world is done. The first
 * level of an unlocked world is always open, so a world can be restarted from
 * the beginning at any time.
 */
export function isLevelUnlocked(world: World, level: Level, completedIds: ReadonlySet<string>): boolean {
  const index = world.levels.indexOf(level);
  if (index < 0) return false;
  if (index === 0) return true;
  return completedIds.has(world.levels[index - 1].id);
}

/** How a tier reads on the path: shut, open to play, or finished. */
export type TierState = 'locked' | 'open' | 'done';

/**
 * One circle's state on the path.
 *
 * A tier is shut until its world opens and its own first level is reachable,
 * which is the same lenient rule everything else uses — nothing here is gated
 * behind a star rating.
 */
export function tierState(
  worlds: readonly World[],
  world: World,
  tier: Tier,
  completedIds: ReadonlySet<string>,
): TierState {
  const levels = tierLevels(world, tier);
  if (levels.length === 0) return 'locked';
  if (levels.every((level) => completedIds.has(level.id))) return 'done';
  if (!isWorldUnlocked(worlds, world, completedIds)) return 'locked';
  return isLevelUnlocked(world, levels[0], completedIds) ? 'open' : 'locked';
}

/**
 * What tapping a circle opens: the first level of the tier with no result yet.
 *
 * Falls back to the tier's *first* level once they are all done, and that
 * fallback is the whole of "tapping a finished circle plays it again". Nothing
 * is cleared by doing so — `recordResult` keeps the best stars and the fewest
 * moves, so a sloppy replay cannot cost her anything.
 */
export function firstPlayableOfTier(
  world: World,
  tier: Tier,
  completedIds: ReadonlySet<string>,
): Level | undefined {
  const levels = tierLevels(world, tier);
  return levels.find((level) => !completedIds.has(level.id)) ?? levels[0];
}

/**
 * Everything she has already beaten, in play order — what Mix draws from.
 *
 * Only completed levels, so every one is hand-authored and safe to record a
 * result against.
 */
export const mixPool = (
  { levels }: Catalogue,
  completedIds: ReadonlySet<string>,
): readonly Level[] => levels.filter((level) => completedIds.has(level.id));

/**
 * The pieces she has finished something with, in world order.
 *
 * Heads the Mix card, where the piece card is headed by a single piece — so
 * the difference in scope is visible without reading either label. It grows as
 * she unlocks more, which is a small reward in itself.
 */
export function piecesPlayed(
  worlds: readonly World[],
  completedIds: ReadonlySet<string>,
): readonly PieceType[] {
  return worlds
    .filter((world) => world.levels.some((level) => completedIds.has(level.id)))
    .map(soloPiece)
    // The theme worlds drop out: they are about an idea rather than a piece, so
    // adding their cast here would double up pieces she has already earned and
    // make the row say less rather than more.
    .filter((piece): piece is PieceType => piece !== undefined);
}

/** The world the player is currently working through — the first unfinished one. */
export function currentWorld(
  worlds: readonly World[],
  completedIds: ReadonlySet<string>,
): World | undefined {
  return (
    worlds.find((w) => w.levels.length > 0 && !worldProgress(w, completedIds).complete) ??
    [...worlds].reverse().find((w) => w.levels.length > 0)
  );
}
