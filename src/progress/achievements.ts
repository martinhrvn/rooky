/**
 * Achievements: running tallies that cross a threshold and pay a lump of XP.
 *
 * They do not award a second currency. Everything feeds the one bar — see
 * `xp.ts` — and the reward is always a sticker. What an achievement adds is
 * **recognition**: crossing one is announced in its own right, because a bonus
 * she cannot perceive is not a reward.
 *
 * Two rules hold the design up:
 *
 * 1. **An achievement pays once.** That is what makes it safe to reward
 *    failure at all. "Taken 25 times" paying every time she is taken would
 *    make hanging a queen the fastest way to fill the bar; paying once means
 *    there is no loop to farm. `xpFor` is called only for ids not already in
 *    `earned`, and `achievements.test.ts` asserts a second pass pays nothing.
 * 2. **Never pay XP for a failure *event*, only for crossing a threshold.**
 *
 * Names are user-facing and live in `strings.ts`, keyed by achievement id.
 */

import { type PieceType, type Square, fileOf, rankOf } from '../chess/types';

/**
 * How the notification draws itself. A picture, since she cannot read the
 * name — the name is for the adult who is usually nearby.
 */
export type Mark =
  | 'move'
  | 'capture'
  | 'slide'
  | 'promote'
  | 'check'
  | 'mate'
  | 'star'
  | 'flag'
  | 'hint'
  | 'shuffle'
  | 'endless'
  | 'rescue';

export interface Achievement {
  readonly id: string;
  /** Which tally it watches. */
  readonly counter: string;
  /** Totals only ever grow; a streak resets. See `KIND`. */
  readonly kind: 'total' | 'streak';
  readonly threshold: number;
  /** One-off XP, paid the first time the threshold is met. */
  readonly xp: number;
  /** Drawn as this piece, if it is about one. */
  readonly piece?: PieceType;
  readonly mark: Mark;
}

/**
 * Bonus sizes.
 *
 * Deliberately large next to a level's ~40: the size of the jump is the only
 * "how big was that" signal she gets, and a bonus worth a tenth of the bar
 * reads as noise rather than as an event. The top tier is a whole sticker.
 */
const SMALL = 60;
const MEDIUM = 120;
const LARGE = 200;

const TIERED = [SMALL, MEDIUM, LARGE];

const PIECES: readonly PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k'];

/** Pieces that travel in lines, and so can cross the board in one move. */
const SLIDERS: readonly PieceType[] = ['b', 'r', 'q'];

/** Squares crossed before a slide counts as "all the way across". */
export const LONG_SLIDE = 5;

// --- counter ids -----------------------------------------------------------
// Ids are strings rather than an enum so `moved:n` can be built from a piece
// without a lookup table. Everything that produces one is in `countersFor`,
// and the test asserts the two sides agree in both directions.

export const moved = (piece: PieceType) => `moved:${piece}`;
export const took = (piece: PieceType) => `took:${piece}`;
export const slid = (piece: PieceType) => `slid:${piece}`;

export const PROMOTED = 'promoted';
export const CHECKED = 'checked';
export const MATED = 'mated';
export const STARS = 'stars';
export const LEVELS = 'levels';
export const HINTS = 'hints';
export const MIX_ROUNDS = 'mix';
export const ENDLESS_ROUNDS = 'endless';
export const TAKEN = 'taken';
export const STRANDED = 'stranded';

/**
 * The one streak: failures in a row on the level she is currently on.
 *
 * Reset by **clearing the level** — the good event, never a bad one — so the
 * reset can never be felt as a punishment. And because earning is one-shot,
 * a reset cannot take an achievement back off her.
 */
export const TRIES = 'tries';

// --- what a move produces --------------------------------------------------

/**
 * Everything the board knows at the moment a move lands. The engine has all of
 * this already; `LevelPlayer` passes it out rather than reaching for the store.
 */
export interface MoveEvent {
  readonly piece: PieceType;
  readonly from: Square;
  readonly to: Square;
  readonly captured?: PieceType;
  readonly promotedTo?: PieceType;
  readonly gaveCheck?: boolean;
  readonly gaveMate?: boolean;
}

const distance = (from: Square, to: Square): number =>
  Math.max(Math.abs(fileOf(to) - fileOf(from)), Math.abs(rankOf(to) - rankOf(from)));

/**
 * The counters one move bumps.
 *
 * All the *(piece × verb)* logic is here, in one pure function, rather than as
 * twenty `bump()` calls scattered through the board screen — which is how
 * these drift apart from each other.
 */
export function countersFor(event: MoveEvent): readonly string[] {
  const ids = [moved(event.piece)];

  if (event.captured) ids.push(took(event.piece));
  if (SLIDERS.includes(event.piece) && distance(event.from, event.to) >= LONG_SLIDE) {
    ids.push(slid(event.piece));
  }
  if (event.promotedTo) ids.push(PROMOTED);
  if (event.gaveCheck) ids.push(CHECKED);
  if (event.gaveMate) ids.push(MATED);

  return ids;
}

// --- the catalogue ---------------------------------------------------------

const tiered = (
  counter: string,
  thresholds: readonly number[],
  mark: Mark,
  piece?: PieceType,
): Achievement[] =>
  thresholds.map((threshold, i) => ({
    id: `${counter}@${threshold}`,
    counter,
    kind: 'total' as const,
    threshold,
    xp: TIERED[Math.min(i, TIERED.length - 1)],
    mark,
    ...(piece ? { piece } : {}),
  }));

export const ACHIEVEMENTS: readonly Achievement[] = [
  // Doing things: a verb crossed with a piece. This carries most of the
  // catalogue, and it rewards the pieces she *likes* rather than only forward
  // progress — a child who adores the knight collects nothing for it today.
  ...PIECES.flatMap((piece) => tiered(moved(piece), [25, 100], 'move', piece)),
  ...PIECES.flatMap((piece) => tiered(took(piece), [5, 20], 'capture', piece)),
  ...SLIDERS.flatMap((piece) => tiered(slid(piece), [5, 20], 'slide', piece)),

  ...tiered(PROMOTED, [1, 5, 25], 'promote', 'p'),
  ...tiered(CHECKED, [1, 10], 'check'),
  ...tiered(MATED, [1, 10], 'mate'),

  ...tiered(STARS, [10, 50, 200], 'star'),
  ...tiered(LEVELS, [5, 25, 100], 'flag'),

  // Using the hint is rewarded, not merely tolerated. It shows the danger,
  // which is the thing she is there to learn to see; an app that quietly
  // shames her for pressing it teaches the opposite of what it is for.
  ...tiered(HINTS, [1, 5, 25], 'hint'),

  ...tiered(MIX_ROUNDS, [5, 25], 'shuffle'),
  ...tiered(ENDLESS_ROUNDS, [5, 25], 'endless'),

  // Failing. She is sometimes afraid of it, so it pays: if losing a piece is
  // a thing that earns something, losing a piece is a thing that is supposed
  // to happen, and the app says so rather than a parent having to.
  ...tiered(TAKEN, [5, 10, 25], 'rescue'),
  ...tiered(STRANDED, [1, 5, 10], 'rescue'),

  // "Never give up" — the one that matters most, and the only streak. Five
  // failures on the same level and then clearing it says *you stayed with the
  // hard one*, which is a better thing than *you have lost a lot over time*.
  {
    id: `${TRIES}@5`,
    counter: TRIES,
    kind: 'streak',
    threshold: 5,
    xp: MEDIUM,
    mark: 'rescue',
  },
  {
    id: `${TRIES}@10`,
    counter: TRIES,
    kind: 'streak',
    threshold: 10,
    xp: LARGE,
    mark: 'rescue',
  },
];

const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export const achievementById = (id: string): Achievement | undefined => byId.get(id);

// --- families --------------------------------------------------------------

/**
 * Every tier of one counter, together.
 *
 * The collection screen groups by this rather than listing achievements flat,
 * because names are keyed by *counter* — all three tiers of `moved:n` are
 * called "Hop, hop, hop", so a flat list shows the same name three times with
 * nothing to tell them apart. Grouped, the tiers become pips against one name,
 * which is also the form a non-reader can count.
 */
export interface Family {
  readonly counter: string;
  /** Its achievements, ascending by threshold. */
  readonly tiers: readonly Achievement[];
  readonly kind: 'total' | 'streak';
  readonly piece?: PieceType;
  readonly mark: Mark;
}

/**
 * Every counter, once, in catalogue order.
 *
 * Built from `ACHIEVEMENTS` rather than declared beside it, so a new entry
 * joins its family — or starts one — without a second list to remember.
 */
export const FAMILIES: readonly Family[] = (() => {
  const order: string[] = [];
  const tiers = new Map<string, Achievement[]>();

  for (const achievement of ACHIEVEMENTS) {
    const existing = tiers.get(achievement.counter);
    if (existing) {
      existing.push(achievement);
    } else {
      order.push(achievement.counter);
      tiers.set(achievement.counter, [achievement]);
    }
  }

  return order.map((counter) => {
    const group = tiers.get(counter)!.slice().sort((a, b) => a.threshold - b.threshold);
    const [first] = group;
    return {
      counter,
      tiers: group,
      kind: first.kind,
      mark: first.mark,
      ...(first.piece ? { piece: first.piece } : {}),
    };
  });
})();

/** How many of a family's tiers have been earned. */
const earnedCount = (family: Family, earned: Readonly<Record<string, number>>): number =>
  family.tiers.filter((tier) => earned[tier.id]).length;

/**
 * The tally a family watches — its streak if it is one, otherwise its total.
 *
 * Exported because the collection shows how far along she is, and reading
 * `counters[counter]` at the call site is exactly how a streak family ends up
 * being read from the wrong record: `tries` has an entry in *both*, and the
 * totals one is the number the achievement does not use.
 */
export const tallyOf = (family: Family, { counters, streaks }: Tallies): number =>
  family.kind === 'streak' ? (streaks[family.counter] ?? 0) : (counters[family.counter] ?? 0);

/** Families with at least one tier earned, in catalogue order. */
export function earnedFamilies(
  earned: Readonly<Record<string, number>>,
): readonly { family: Family; count: number }[] {
  return FAMILIES.map((family) => ({ family, count: earnedCount(family, earned) })).filter(
    (entry) => entry.count > 0,
  );
}

/**
 * The families she has *nothing* of yet, nearest first.
 *
 * What the collection screen shows as silhouettes, so what is dangled in front
 * of her moves as she plays instead of being a fixed three she may never
 * approach. Ranked by how far along the first tier is, and ties broken by
 * catalogue order — which matters most on a fresh profile, where every tally is
 * zero and the order would otherwise be arbitrary.
 *
 * Families with a tier already earned are left out on purpose: those are
 * already on the screen above, with an empty pip saying the same thing.
 */
export function nextUp(
  tallies: Tallies,
  earned: Readonly<Record<string, number>>,
  count = 3,
): readonly Family[] {
  return FAMILIES.filter((family) => earnedCount(family, earned) === 0)
    .map((family, i) => ({ family, i, progress: tallyOf(family, tallies) / family.tiers[0].threshold }))
    .sort((a, b) => b.progress - a.progress || a.i - b.i)
    .slice(0, count)
    .map((entry) => entry.family);
}

// --- evaluation ------------------------------------------------------------

export interface Tallies {
  readonly counters: Readonly<Record<string, number>>;
  readonly streaks: Readonly<Record<string, number>>;
}

/**
 * Which achievements have just been met and not yet paid for.
 *
 * Pure: the caller pays the XP and records the ids in `earned`, and that
 * record is the whole of "pays once". Passing `earned` in rather than
 * filtering afterwards keeps the one-shot rule visible at the call site.
 */
export function newlyEarned(
  { counters, streaks }: Tallies,
  earned: Readonly<Record<string, number>>,
): readonly Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => {
    if (earned[achievement.id]) return false;
    const tally =
      achievement.kind === 'streak'
        ? (streaks[achievement.counter] ?? 0)
        : (counters[achievement.counter] ?? 0);
    return tally >= achievement.threshold;
  });
}

/** Total XP owed for a set of newly-earned achievements. */
export const xpFor = (achievements: readonly Achievement[]): number =>
  achievements.reduce((total, a) => total + a.xp, 0);
