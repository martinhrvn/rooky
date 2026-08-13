import type { PieceType } from '../chess/types';
import { toLevel } from '../game/engine';
import type { Level, LevelData, Tier, WorldKey } from '../game/types';
import { bishopLevels } from './levels/bishop';
import { kingLevels } from './levels/king';
import { knightLevels } from './levels/knight';
import { pawnLevels } from './levels/pawn';
import { queenLevels } from './levels/queen';
import { rookLevels } from './levels/rook';
import { mirrorLevel } from './mirror';

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

/**
 * Tier 3 is tier 2 mirrored left-to-right.
 *
 * The lesson and the difficulty are held identical, so "no help" is the only
 * variable that changed — but it looks different enough that she can't coast
 * on remembering the answer. Derived here rather than authored twice, so the
 * two tiers can never drift apart.
 */
const withMirroredTier3 = (levels: readonly LevelData[]): LevelData[] => {
  const tier2 = levels.filter((level) => level.tier === 2);
  return [
    ...levels,
    ...tier2.map((level, i) =>
      mirrorLevel(level, 3, `${level.world}-t3-${String(i + 1).padStart(2, '0')}`),
    ),
  ];
};

const world = ({ levels, ...rest }: WorldSpec): World => ({
  ...rest,
  levels: withMirroredTier3(levels).map(toLevel),
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
  world({
    key: 'bishop',
    icon: 'b',
    title: 'The Bishop',
    blurb: 'Moves on diagonals',
    levels: bishopLevels,
  }),
  world({
    key: 'queen',
    icon: 'q',
    title: 'The Queen',
    blurb: 'Lines and diagonals, both',
    levels: queenLevels,
  }),
  world({
    key: 'king',
    icon: 'k',
    title: 'The King',
    blurb: 'One step, any way',
    levels: kingLevels,
  }),
  world({
    key: 'knight',
    icon: 'n',
    title: 'The Knight',
    blurb: 'Jumps in an L',
    levels: knightLevels,
  }),
  world({
    key: 'pawn',
    icon: 'p',
    title: 'The Pawn',
    blurb: 'Forward, but takes crossways',
    levels: pawnLevels,
  }),
];

/** Tiers in the order they are played inside a world. */
export const TIERS: readonly Tier[] = [1, 2, 3];

/** Every level in play order. The full catalogue, ignoring any difficulty ceiling. */
export const ALL_LEVELS: readonly Level[] = WORLDS.flatMap((w) => w.levels);

/**
 * The content a given player actually sees.
 *
 * A parent can cap the difficulty, and "treat *On your own* as if it did not
 * exist" has to hold in progression, unlocking, the selector and Mix at once —
 * so screens ask for the active catalogue rather than filtering for
 * themselves, which is how the rule stays in one place.
 */
export interface Catalogue {
  readonly maxTier: Tier;
  readonly worlds: readonly World[];
  readonly levels: readonly Level[];
}

const CATALOGUES = new Map<Tier, Catalogue>();

/** Memoised — there are only three possible values. */
export function catalogueFor(maxTier: Tier): Catalogue {
  const cached = CATALOGUES.get(maxTier);
  if (cached) return cached;

  const worlds = WORLDS.map((world) => ({
    ...world,
    levels: world.levels.filter((level) => level.tier <= maxTier),
  }));
  const catalogue: Catalogue = { maxTier, worlds, levels: worlds.flatMap((w) => w.levels) };

  CATALOGUES.set(maxTier, catalogue);
  return catalogue;
}

/** The whole thing, for anywhere that must not be affected by the ceiling. */
export const FULL_CATALOGUE: Catalogue = catalogueFor(3);

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
export function nextLevel(
  { levels }: Catalogue,
  completedIds: ReadonlySet<string>,
): Level | undefined {
  return levels.find((level) => !completedIds.has(level.id)) ?? levels[levels.length - 1];
}

/** The level immediately after `id` in play order, or undefined at the end. */
export function levelAfter({ levels }: Catalogue, id: string): Level | undefined {
  const index = levels.findIndex((level) => level.id === id);
  return index >= 0 ? levels[index + 1] : undefined;
}

/** The world a level belongs to, within a given catalogue. */
export const worldOf = ({ worlds }: Catalogue, level: Level): World | undefined =>
  worlds.find((world) => world.key === level.world);

/** True when nothing else in this level's own tier comes after it. */
export function isLastOfTier(catalogue: Catalogue, level: Level): boolean {
  const world = worldOf(catalogue, level);
  if (!world) return false;
  const siblings = tierLevels(world, level.tier);
  return siblings[siblings.length - 1]?.id === level.id;
}

/** The next tier in this world that actually has levels, if any. */
export function nextTierWithLevels(world: World, after: Tier): Tier | undefined {
  return TIERS.find((tier) => tier > after && tierLevels(world, tier).length > 0);
}

/**
 * The next piece to learn after this one.
 *
 * Finishing a world's hardest tier used to be a dead end — the only offers
 * were Endless and Start over, at exactly the proudest moment. This is what
 * carries her on to the bishop.
 */
export function nextWorldWithLevels({ worlds }: Catalogue, after: World): World | undefined {
  // Matched by key, not identity: a filtered catalogue holds copies, so
  // indexOf on the original array would silently find nothing.
  const index = worlds.findIndex((world) => world.key === after.key);
  if (index < 0) return undefined;
  return worlds.slice(index + 1).find((world) => world.levels.length > 0);
}
