import type { Color, PieceType } from '../chess/types';
import type { Tier } from '../game/types';

/** Every difficulty is on unless a parent says otherwise. */
export const DEFAULT_MAX_TIER: Tier = 3;

/**
 * Bump whenever the persisted shape changes, and add a matching branch to
 * `migrate` in store.ts. This ships from day one on purpose: retrofitting
 * migrations later is how you end up wiping a kid's saved progress.
 */
export const PROGRESS_VERSION = 2;

/** Avatars are chess pieces, so a profile is recognisable without reading. */
export type AvatarId = `${Color}${PieceType}`;

export const AVATARS: readonly AvatarId[] = [
  'wr',
  'wn',
  'wb',
  'wq',
  'br',
  'bn',
  'bb',
  'bq',
];

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

export interface PersistedProgress {
  readonly activeProfileId: string | null;
  readonly profiles: readonly Profile[];
  /** profileId -> levelId -> result */
  readonly results: Readonly<Record<string, Readonly<Record<string, LevelResult>>>>;
}

export const emptyProgress: PersistedProgress = {
  activeProfileId: null,
  profiles: [],
  results: {},
};
