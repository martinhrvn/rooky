import type { PieceType } from '../chess/types';
import { toLevel } from '../game/engine';
import type { Level, LevelData, Tier, WorldKey } from '../game/types';
import { rookLevels } from './levels/rook';

export interface World {
  readonly key: WorldKey;
  /** The piece the world is about, and the one shown on its tile. */
  readonly icon: PieceType;
  readonly title: string;
  /** One line on what this piece does. Supports the picture, never replaces it. */
  readonly blurb: string;
  readonly levels: readonly Level[];
}

interface WorldSpec {
  key: WorldKey;
  icon: PieceType;
  title: string;
  blurb: string;
  levels: readonly LevelData[];
}

const world = ({ levels, ...rest }: WorldSpec): World => ({
  ...rest,
  levels: levels.map(toLevel),
});

/**
 * Canonical world order: rook (simplest lines) first, queen straight after
 * bishop because it is their union, knight late because it is the hardest to
 * internalise, pawn last because it has the most special cases.
 *
 * Worlds with no levels yet still appear, shown locked. Seeing what is coming
 * is motivating, and hiding them would make the app look finished when it
 * isn't.
 */
export const WORLDS: readonly World[] = [
  world({
    key: 'rook',
    icon: 'r',
    title: 'The Rook',
    blurb: 'Moves in straight lines',
    levels: rookLevels,
  }),
  world({ key: 'bishop', icon: 'b', title: 'The Bishop', blurb: 'Moves on diagonals', levels: [] }),
  world({
    key: 'queen',
    icon: 'q',
    title: 'The Queen',
    blurb: 'Lines and diagonals, both',
    levels: [],
  }),
  world({ key: 'king', icon: 'k', title: 'The King', blurb: 'One step, any way', levels: [] }),
  world({ key: 'knight', icon: 'n', title: 'The Knight', blurb: 'Jumps in an L', levels: [] }),
  world({ key: 'pawn', icon: 'p', title: 'The Pawn', blurb: 'Forward, but takes crossways', levels: [] }),
];

/** Tiers in the order they are played inside a world. */
export const TIERS: readonly Tier[] = [1, 2, 3];

/** Every level in play order — the sequence `Continue` walks. */
export const ALL_LEVELS: readonly Level[] = WORLDS.flatMap((w) => w.levels);

const BY_ID = new Map(ALL_LEVELS.map((level) => [level.id, level]));

export const levelById = (id: string): Level | undefined => BY_ID.get(id);

export const worldByKey = (key: string): World | undefined => WORLDS.find((w) => w.key === key);

/** The levels of one tier within a world, in play order. */
export const tierLevels = (world: World, tier: Tier): readonly Level[] =>
  world.levels.filter((level) => level.tier === tier);

/**
 * What Play opens: the first level with no recorded result, falling back to
 * the last level once everything is done. Undefined only if there is no
 * content at all, which callers should render around rather than crash on.
 */
export function nextLevel(completedIds: ReadonlySet<string>): Level | undefined {
  return (
    ALL_LEVELS.find((level) => !completedIds.has(level.id)) ?? ALL_LEVELS[ALL_LEVELS.length - 1]
  );
}

/** The level immediately after `id` in play order, or undefined at the end. */
export function levelAfter(id: string): Level | undefined {
  const index = ALL_LEVELS.findIndex((level) => level.id === id);
  return index >= 0 ? ALL_LEVELS[index + 1] : undefined;
}

/** The world a level belongs to. */
export const worldOf = (level: Level): World | undefined => worldByKey(level.world);

/** True when nothing else in this level's own tier comes after it. */
export function isLastOfTier(level: Level): boolean {
  const world = worldOf(level);
  if (!world) return false;
  const siblings = tierLevels(world, level.tier);
  return siblings[siblings.length - 1]?.id === level.id;
}

/** The next tier in this world that actually has levels, if any. */
export function nextTierWithLevels(world: World, after: Tier): Tier | undefined {
  return TIERS.find((tier) => tier > after && tierLevels(world, tier).length > 0);
}
