// AsyncStorage rather than expo-sqlite: the whole of a child's progress is a
// few kilobytes of JSON, which is a settings file, not a database. It also
// keeps the web build working, which is the fastest loop for board work.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Tier } from '../game/types';
import {
  AVATARS,
  type AvatarId,
  DEFAULT_MAX_TIER,
  type LevelResult,
  type PersistedProgress,
  PROGRESS_VERSION,
  type Profile,
  emptyProgress,
} from './schema';

interface ProgressStore extends PersistedProgress {
  /** False until the saved progress has been read back off disk. */
  hydrated: boolean;
  markHydrated: () => void;
  createProfile: (name: string, avatarId: AvatarId) => string;
  renameProfile: (id: string, name: string) => void;
  setProfileAvatar: (id: string, avatarId: AvatarId) => void;
  setMaxTier: (tier: Tier) => void;
  selectProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  resetProgress: () => void;
  completeLevels: (entries: readonly Omit<LevelResult, 'completedAt'>[]) => void;
  recordResult: (levelId: string, stars: 1 | 2 | 3, moves: number) => void;
}

let counter = 0;
const makeId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Brings a saved payload up to the current shape.
 *
 * Exported so it can be tested directly against an old payload — this ran for
 * the first time when the difficulty ceiling landed, and a migration that has
 * never been executed is a migration you do not have.
 *
 * Each version adds a branch; none of them may discard results, because on the
 * other side of this function is a child's saved progress.
 */
export function migrateProgress(persisted: unknown, version: number): PersistedProgress {
  let state = (persisted ?? emptyProgress) as PersistedProgress;

  // v1 had no per-profile difficulty ceiling. Everyone gets all three tiers,
  // which is exactly what they were already playing.
  if (version < 2) {
    state = {
      ...state,
      profiles: (state.profiles ?? []).map((profile) => ({
        ...profile,
        maxTier: profile.maxTier ?? DEFAULT_MAX_TIER,
      })),
    };
  }

  // v2 stored avatars as chess pieces ('wr'). They are emoji now, assigned by
  // position so two profiles never land on the same face.
  if (version < 3) {
    state = {
      ...state,
      profiles: (state.profiles ?? []).map((profile, i) => ({
        ...profile,
        avatarId: AVATARS[i % AVATARS.length].id,
      })),
    };
  }

  return state;
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...emptyProgress,
      hydrated: false,

      markHydrated: () => set({ hydrated: true }),

      createProfile: (name, avatarId) => {
        const profile: Profile = {
          id: makeId(),
          name,
          avatarId,
          createdAt: Date.now(),
          maxTier: DEFAULT_MAX_TIER,
        };
        set((s) => ({
          profiles: [...s.profiles, profile],
          activeProfileId: profile.id,
          results: { ...s.results, [profile.id]: {} },
        }));
        return profile.id;
      },

      renameProfile: (id, name) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, name } : p)) })),

      /**
       * Changes a profile's face. Takes an id rather than acting on the active
       * profile so it reads the same way as renaming, which it sits next to.
       *
       * Results are keyed by profile id and untouched by this, so a child can
       * be a dragon on Tuesday without losing a single star.
       */
      setProfileAvatar: (id, avatarId) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, avatarId } : p)) })),

      setMaxTier: (tier) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === s.activeProfileId ? { ...p, maxTier: tier } : p,
          ),
        })),

      /** Clears the active profile's results. Other profiles are untouched. */
      resetProgress: () =>
        set((s) =>
          s.activeProfileId ? { results: { ...s.results, [s.activeProfileId]: {} } } : {},
        ),

      /** Bulk write, for the developer panel. */
      completeLevels: (entries) =>
        set((s) => {
          const profileId = s.activeProfileId;
          if (!profileId) return {};

          const forProfile = { ...(s.results[profileId] ?? {}) };
          for (const entry of entries) {
            forProfile[entry.levelId] = { ...entry, completedAt: Date.now() };
          }
          return { results: { ...s.results, [profileId]: forProfile } };
        }),

      selectProfile: (id) => set({ activeProfileId: id }),

      deleteProfile: (id) =>
        set((s) => {
          const { [id]: _removed, ...results } = s.results;
          const profiles = s.profiles.filter((p) => p.id !== id);
          return {
            profiles,
            results,
            activeProfileId:
              s.activeProfileId === id ? (profiles[0]?.id ?? null) : s.activeProfileId,
          };
        }),

      recordResult: (levelId, stars, moves) => {
        const profileId = get().activeProfileId;
        if (!profileId) return;

        set((s) => {
          const forProfile = s.results[profileId] ?? {};
          const previous = forProfile[levelId];
          // Keep the best run, so a sloppy replay never erases a good score.
          const result: LevelResult = {
            levelId,
            stars: previous ? (Math.max(previous.stars, stars) as 1 | 2 | 3) : stars,
            bestMoves: previous ? Math.min(previous.bestMoves, moves) : moves,
            completedAt: Date.now(),
          };
          return { results: { ...s.results, [profileId]: { ...forProfile, [levelId]: result } } };
        });
      },
    }),
    {
      name: 'rooky-progress',
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      // Only the data is persisted; the actions and `hydrated` are not.
      partialize: ({ activeProfileId, profiles, results }) => ({
        activeProfileId,
        profiles,
        results,
      }),
      migrate: migrateProgress,
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);

/**
 * Level ids the active profile has finished.
 *
 * The selector returns the stored record (a stable reference) and the Set is
 * built in a memo — selecting `new Set(...)` directly would return a fresh
 * object every render and spin zustand's reference check forever.
 */
export function useCompletedIds(): ReadonlySet<string> {
  const results = useProgress((s) =>
    s.activeProfileId ? s.results[s.activeProfileId] : undefined,
  );
  return useMemo(() => new Set(Object.keys(results ?? {})), [results]);
}

export function useActiveProfile(): Profile | null {
  return useProgress((s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? null);
}

/** The active player's difficulty ceiling, or all three if there is no profile yet. */
export function useMaxTier(): Tier {
  return useProgress(
    (s) => s.profiles.find((p) => p.id === s.activeProfileId)?.maxTier ?? DEFAULT_MAX_TIER,
  );
}

export function useLevelResult(levelId: string): LevelResult | undefined {
  return useProgress((s) =>
    s.activeProfileId ? s.results[s.activeProfileId]?.[levelId] : undefined,
  );
}
