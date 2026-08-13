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

import { TIERS, type World, tierLevels } from '../content';
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
