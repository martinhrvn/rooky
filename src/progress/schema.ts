import type { Color, PieceType } from '../chess/types';

/**
 * Bump whenever the persisted shape changes, and add a matching branch to
 * `migrate` in store.ts. This ships from day one on purpose: retrofitting
 * migrations later is how you end up wiping a kid's saved progress.
 */
export const PROGRESS_VERSION = 1;

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
