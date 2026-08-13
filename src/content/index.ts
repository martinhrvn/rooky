import { toLevel } from '../game/engine';
import type { Level, LevelData, WorldKey } from '../game/types';
import { rookLevels } from './levels/rook';

export interface World {
  readonly key: WorldKey;
  /** The piece shown on the world's tile, and the one the world is about. */
  readonly icon: 'r' | 'b' | 'q' | 'k' | 'n' | 'p';
  readonly levels: readonly Level[];
}

const world = (key: WorldKey, icon: World['icon'], levels: readonly LevelData[]): World => ({
  key,
  icon,
  levels: levels.map(toLevel),
});

/**
 * Canonical world order: rook (simplest lines) first, queen straight after
 * bishop because it is their union, knight late because it is the hardest to
 * internalise, pawn last because it has the most special cases.
 */
export const WORLDS: readonly World[] = [world('rook', 'r', rookLevels)];

/** Every level in play order — the sequence `Continue` walks. */
export const ALL_LEVELS: readonly Level[] = WORLDS.flatMap((w) => w.levels);

const BY_ID = new Map(ALL_LEVELS.map((level) => [level.id, level]));

export const levelById = (id: string): Level | undefined => BY_ID.get(id);

export const worldByKey = (key: string): World | undefined =>
  WORLDS.find((w) => w.key === key);

/**
 * What `Continue` opens: the first level with no recorded result, falling back
 * to the last level once everything is done.
 */
export function nextLevel(completedIds: ReadonlySet<string>): Level {
  return (
    ALL_LEVELS.find((level) => !completedIds.has(level.id)) ?? ALL_LEVELS[ALL_LEVELS.length - 1]
  );
}

/** The level immediately after `id` in play order, or undefined at the end. */
export function levelAfter(id: string): Level | undefined {
  const index = ALL_LEVELS.findIndex((level) => level.id === id);
  return index >= 0 ? ALL_LEVELS[index + 1] : undefined;
}
