import type { PieceType } from '../chess/types';
import { toLevel } from '../game/engine';
import type { Level, LevelData, Tier, WorldKey } from '../game/types';
import { bishopLevels } from './levels/bishop';
import { captureLevels } from './levels/capture';
import { checkmateLevels } from './levels/checkmate';
import { combatLevels } from './levels/combat';
import { kingLevels } from './levels/king';
import { protectLevels } from './levels/protect';
import { knightLevels } from './levels/knight';
import { pawnLevels } from './levels/pawn';
import { queenLevels } from './levels/queen';
import { rookLevels } from './levels/rook';
import { withMirroredTier3 } from './mirror';

export interface World {
  readonly key: WorldKey;
  /**
   * The pieces on its tile: one for a world about a piece, a row of them for a
   * world about an idea.
   *
   * The length is the distinction, and everything downstream reads it rather
   * than a separate flag — one piece means Endless can generate for this world
   * and that it counts towards the row on the Mix card, several means neither.
   * See {@link soloPiece}.
   */
  readonly cast: readonly PieceType[];
  readonly title: string;
  /** One line on what this world is for. Supports the picture, never replaces it. */
  readonly blurb: string;
  readonly levels: readonly Level[];
}

interface WorldSpec {
  key: WorldKey;
  cast: readonly PieceType[];
  title: string;
  blurb: string;
  levels: readonly LevelData[];
}

/**
 * The piece a world is *about*, when it is about one.
 *
 * Endless builds levels for a single piece by random walk, so it has nothing to
 * offer a world whose subject is a shape across several pieces — it could not
 * produce a discovered attack if it tried. Undefined here is what switches it
 * off, rather than a flag someone has to remember to set.
 */
export const soloPiece = (world: World): PieceType | undefined =>
  world.cast.length === 1 ? world.cast[0] : undefined;

const world = ({ levels, ...rest }: WorldSpec): World => ({
  ...rest,
  levels: withMirroredTier3(levels).map(toLevel),
});

/**
 * Canonical world order: rook (simplest lines) first, queen straight after
 * bishop because it is their union, knight late because it is the hardest to
 * internalise, pawn last because it has the most special cases.
 *
 * The four theme worlds come after all six, and in that order for a reason:
 * capture teaches that a move can cost you something elsewhere, protect asks
 * her to fix it, combat is both at once, and checkmate needs a king before any
 * of it means anything. Unlocking is linear, so putting them last is also what
 * keeps them out of the way of everything that already works.
 *
 * Worlds with no levels yet still appear, shown locked. Seeing what is coming
 * is motivating, and hiding them would make the app look finished when it
 * isn't.
 */
export const WORLDS: readonly World[] = [
  world({
    key: 'rook',
    cast: ['r'],
    title: 'The Rook',
    blurb: 'Moves in straight lines',
    levels: rookLevels,
  }),
  world({
    key: 'bishop',
    cast: ['b'],
    title: 'The Bishop',
    blurb: 'Moves on diagonals',
    levels: bishopLevels,
  }),
  world({
    key: 'queen',
    cast: ['q'],
    title: 'The Queen',
    blurb: 'Lines and diagonals, both',
    levels: queenLevels,
  }),
  world({
    key: 'king',
    cast: ['k'],
    title: 'The King',
    blurb: 'One step, any way',
    levels: kingLevels,
  }),
  world({
    key: 'knight',
    cast: ['n'],
    title: 'The Knight',
    blurb: 'Jumps in an L',
    levels: knightLevels,
  }),
  world({
    key: 'pawn',
    cast: ['p'],
    title: 'The Pawn',
    blurb: 'Forward, but takes crossways',
    levels: pawnLevels,
  }),
  world({
    key: 'capture',
    cast: ['n', 'b', 'r'],
    title: 'Taking Pieces',
    blurb: 'Take them all — and watch what you open up',
    levels: captureLevels,
  }),
  world({
    key: 'protect',
    cast: ['n', 'p', 'r'],
    title: 'Under Attack',
    blurb: 'One of yours is in danger',
    levels: protectLevels,
  }),
  world({
    key: 'combat',
    cast: ['r', 'n', 'b'],
    title: 'The Fight',
    blurb: 'Get safe first, then take them all',
    levels: combatLevels,
  }),
  world({
    key: 'checkmate',
    cast: ['r', 'q', 'k'],
    title: 'Check and Mate',
    blurb: 'Corner the enemy king',
    levels: checkmateLevels,
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

  const worlds = WORLDS.flatMap((world) => {
    const levels = world.levels.filter((level) => level.tier <= maxTier);
    // A world the ceiling has emptied disappears entirely — the theme worlds
    // have no tier 1 at all, so a parent capping at Stars must not be left
    // looking at four cards that can never open. A world with no levels *at
    // all* is different, and stays: that one really is coming later.
    if (levels.length === 0 && world.levels.length > 0) return [];
    return [{ ...world, levels }];
  });
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
