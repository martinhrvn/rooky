import type { Tier } from '../game/types';

/** Every difficulty is on unless a parent says otherwise. */
export const DEFAULT_MAX_TIER: Tier = 3;

/**
 * Bump whenever the persisted shape changes, and add a matching branch to
 * `migrate` in store.ts. This ships from day one on purpose: retrofitting
 * migrations later is how you end up wiping a kid's saved progress.
 */
export const PROGRESS_VERSION = 4;

/**
 * Avatars, so a profile is recognisable without reading.
 *
 * Emoji rather than chess pieces: twelve pieces all read as "a small dark
 * shape" at avatar size, and the app is already made entirely of them, so a
 * piece would be more furniture rather than *her*. A fox is memorable, and
 * choosing one is something a four-year-old can do alone.
 *
 * The system draws these, so there are no assets and no licence to track.
 */
export const AVATARS = [
  { id: 'fox', emoji: '🦊', name: 'Fox' },
  { id: 'frog', emoji: '🐸', name: 'Frog' },
  { id: 'cat', emoji: '🐱', name: 'Cat' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn' },
  { id: 'octopus', emoji: '🐙', name: 'Octopus' },
  { id: 'penguin', emoji: '🐧', name: 'Penguin' },
  { id: 'bear', emoji: '🐻', name: 'Bear' },
  { id: 'panda', emoji: '🐼', name: 'Panda' },
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'owl', emoji: '🦉', name: 'Owl' },
  { id: 'dragon', emoji: '🐲', name: 'Dragon' },
  { id: 'rocket', emoji: '🚀', name: 'Rocket' },
] as const satisfies readonly { id: string; emoji: string; name: string }[];

export type Avatar = (typeof AVATARS)[number];

/**
 * Stored on the profile. The **id**, never the character — so the set can
 * change later without orphaning saved profiles.
 */
export type AvatarId = Avatar['id'];

/**
 * Falls back to the first avatar for an id it does not recognise, which is
 * what stops an unknown stored value rendering as an empty chip.
 */
export const avatarById = (id: string): Avatar =>
  AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];

export interface Profile {
  readonly id: string;
  /**
   * For the adult's benefit only — it labels the profile in the parent-facing
   * screens so siblings can be told apart. A parent types it; the child never
   * has to. Stored on-device and never transmitted.
   */
  readonly name: string;
  readonly avatarId: AvatarId;
  readonly createdAt: number;
  /**
   * How far the difficulties go for this player: 1 is stars only, 2 adds the
   * danger overlay, 3 adds playing without it.
   *
   * Per profile rather than global, because siblings will differ. Lowering it
   * hides tiers rather than deleting anything — results already earned above
   * the ceiling stay stored and reappear if it is raised again.
   */
  readonly maxTier: Tier;
}

export interface LevelResult {
  readonly levelId: string;
  readonly stars: 1 | 2 | 3;
  /** Best (lowest) move count achieved — the local "highscore". */
  readonly bestMoves: number;
  readonly completedAt: number;
}

/** profileId -> some per-profile record. Every reward store has this shape. */
type ByProfile<T> = Readonly<Record<string, T>>;

export interface PersistedProgress {
  readonly activeProfileId: string | null;
  readonly profiles: readonly Profile[];
  /** profileId -> levelId -> result */
  readonly results: ByProfile<Readonly<Record<string, LevelResult>>>;

  /**
   * Lifetime XP. **One integer, and everything else is derived from it** —
   * how many stickers it has paid for, how full the bar is, which fill is
   * next. Storing "current level" alongside it would be two numbers that can
   * disagree, and the day they disagree is the day a child loses a sticker.
   */
  readonly xp: ByProfile<number>;

  /** counterId -> tally. Monotonic; nothing here ever goes down. */
  readonly counters: ByProfile<Readonly<Record<string, number>>>;

  /**
   * counterId -> current run. The one exception to the rule above.
   *
   * Resets on the **good** event — clearing the level — never on a bad one, so
   * a reset is never felt as a punishment. `earned` is what keeps a streak
   * achievement permanent once the run that won it is over.
   */
  readonly streaks: ByProfile<Readonly<Record<string, number>>>;

  /** achievementId -> when. Presence here is the whole of "pays once". */
  readonly earned: ByProfile<Readonly<Record<string, number>>>;

  /** Sticker ids owned, in the order she chose them. */
  readonly album: ByProfile<readonly string[]>;

  /**
   * The three offered but not yet chosen from.
   *
   * Persisted **before it is shown**, and that is not an optimisation. She is
   * four; she will be offered three stickers and wander off. Storing the offer
   * means it is still waiting next time she opens the album, rather than a
   * reward evaporating because something more interesting happened.
   */
  readonly pending: ByProfile<readonly string[]>;
}

export const emptyProgress: PersistedProgress = {
  activeProfileId: null,
  profiles: [],
  results: {},
  xp: {},
  counters: {},
  streaks: {},
  earned: {},
  album: {},
  pending: {},
};
