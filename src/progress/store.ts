// AsyncStorage rather than expo-sqlite: the whole of a child's progress is a
// few kilobytes of JSON, which is a settings file, not a database. It also
// keeps the web build working, which is the fastest loop for board work.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  type AvatarId,
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
  selectProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  recordResult: (levelId: string, stars: 1 | 2 | 3, moves: number) => void;
}

let counter = 0;
const makeId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...emptyProgress,
      hydrated: false,

      markHydrated: () => set({ hydrated: true }),

      createProfile: (name, avatarId) => {
        const profile: Profile = { id: makeId(), name, avatarId, createdAt: Date.now() };
        set((s) => ({
          profiles: [...s.profiles, profile],
          activeProfileId: profile.id,
          results: { ...s.results, [profile.id]: {} },
        }));
        return profile.id;
      },

      renameProfile: (id, name) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, name } : p)) })),

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
      migrate: (persisted) => {
        // v1 is the first shape, so there is nothing to migrate from yet.
        // Future versions add a branch here rather than discarding state.
        return persisted as PersistedProgress;
      },
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

export function useLevelResult(levelId: string): LevelResult | undefined {
  return useProgress((s) =>
    s.activeProfileId ? s.results[s.activeProfileId]?.[levelId] : undefined,
  );
}
