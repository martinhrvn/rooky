// AsyncStorage rather than expo-sqlite: the whole of a child's progress is a
// few kilobytes of JSON, which is a settings file, not a database. It also
// keeps the web build working, which is the fastest loop for board work.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STICKERS } from '../content/stickers';
import type { Tier } from '../game/types';
import { type Achievement, newlyEarned, xpFor } from './achievements';
import { offerFor } from './offer';
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
import { stickersFor } from './xp';

/**
 * What one settled level did, so the UI can play it back in order:
 * achievement notifications, then the bar filling, then any sticker choices.
 */
export interface Settlement {
  readonly xp: number;
  readonly achievements: readonly Achievement[];
  /** How many times the bar completed. Usually one, occasionally two. */
  readonly fills: number;
  /** Lifetime XP either side, so a bar can be shown travelling between them. */
  readonly xpBefore: number;
  readonly xpAfter: number;
}

interface ProgressStore extends PersistedProgress {
  /** False until the saved progress has been read back off disk. */
  hydrated: boolean;
  markHydrated: () => void;

  /**
   * The most recent settlement, for whatever wants to announce it.
   *
   * Transient and **not persisted** — a toast that survived a relaunch would
   * congratulate her on something she did last Tuesday. It lets the toast host
   * live at the root rather than each play screen threading achievements down
   * into the board, which is the same reason `LevelPlayer` takes callbacks.
   */
  lastSettlement: Settlement | null;
  clearSettlement: () => void;
  createProfile: (name: string, avatarId: AvatarId) => string;
  renameProfile: (id: string, name: string) => void;
  setProfileAvatar: (id: string, avatarId: AvatarId) => void;
  setMaxTier: (tier: Tier) => void;
  selectProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  resetProgress: () => void;
  completeLevels: (entries: readonly Omit<LevelResult, 'completedAt'>[]) => void;
  recordResult: (levelId: string, stars: 1 | 2 | 3, moves: number) => void;

  /** Adds to tallies during play. Cheap, and never evaluates anything. */
  bump: (counterIds: readonly string[]) => void;
  extendStreak: (id: string) => void;
  resetStreak: (id: string) => void;

  /**
   * Ends a level: pays its XP, pays for any achievement it just earned, and
   * reports what happened.
   *
   * Evaluation is here rather than in `bump` on purpose — nothing may be shown
   * mid-level, because a failure bonus would otherwise land in the middle of
   * the rewind animation, on top of the moment her piece was taken.
   */
  settle: (xp: number) => Settlement;

  /** Puts an offer on record if one is owed and none is outstanding. */
  ensureOffer: () => void;
  chooseSticker: (stickerId: string) => void;

  /** Developer panel only. */
  grantAlbum: () => void;
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

  // v3 had no rewards at all. Everyone starts at zero XP with an empty album,
  // deliberately **not** back-filled from what they have already finished:
  // paying out a hundred levels' worth of XP on first launch would dump a
  // dozen sticker choices on her in a row, which is a mess rather than a
  // celebration. The counters cannot be back-filled in any case — nothing ever
  // recorded how many times she had been taken.
  if (version < 4) {
    state = {
      ...state,
      xp: state.xp ?? {},
      counters: state.counters ?? {},
      streaks: state.streaks ?? {},
      earned: state.earned ?? {},
      album: state.album ?? {},
      pending: state.pending ?? {},
    };
  }

  return state;
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...emptyProgress,
      hydrated: false,
      lastSettlement: null,

      markHydrated: () => set({ hydrated: true }),
      clearSettlement: () => set({ lastSettlement: null }),

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

      /**
       * Clears the active profile's results *and* everything they earned.
       * Other profiles are untouched.
       *
       * A half-reset would be the confusing one to explain: "start over" is
       * parent-facing and it means start over. The album goes with it, which
       * is the part worth hesitating over — it is the only thing here she
       * *made* rather than earned — but leaving stickers behind after wiping
       * the XP that bought them is a state nothing else in the app can reach.
       */
      resetProgress: () =>
        set((s) => {
          const id = s.activeProfileId;
          if (!id) return {};
          return {
            results: { ...s.results, [id]: {} },
            xp: { ...s.xp, [id]: 0 },
            counters: { ...s.counters, [id]: {} },
            streaks: { ...s.streaks, [id]: {} },
            earned: { ...s.earned, [id]: {} },
            album: { ...s.album, [id]: [] },
            pending: { ...s.pending, [id]: [] },
          };
        }),

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
          const profiles = s.profiles.filter((p) => p.id !== id);
          const without = <T,>(record: Readonly<Record<string, T>>) => {
            const { [id]: _removed, ...rest } = record;
            return rest;
          };
          return {
            profiles,
            results: without(s.results),
            xp: without(s.xp),
            counters: without(s.counters),
            streaks: without(s.streaks),
            earned: without(s.earned),
            album: without(s.album),
            pending: without(s.pending),
            activeProfileId:
              s.activeProfileId === id ? (profiles[0]?.id ?? null) : s.activeProfileId,
          };
        }),

      bump: (counterIds) =>
        set((s) => {
          const profileId = s.activeProfileId;
          if (!profileId || counterIds.length === 0) return {};

          const forProfile = { ...(s.counters[profileId] ?? {}) };
          for (const id of counterIds) forProfile[id] = (forProfile[id] ?? 0) + 1;
          return { counters: { ...s.counters, [profileId]: forProfile } };
        }),

      extendStreak: (id) =>
        set((s) => {
          const profileId = s.activeProfileId;
          if (!profileId) return {};

          const forProfile = s.streaks[profileId] ?? {};
          return {
            streaks: {
              ...s.streaks,
              [profileId]: { ...forProfile, [id]: (forProfile[id] ?? 0) + 1 },
            },
          };
        }),

      resetStreak: (id) =>
        set((s) => {
          const profileId = s.activeProfileId;
          if (!profileId) return {};

          const forProfile = s.streaks[profileId] ?? {};
          if (!forProfile[id]) return {};
          return { streaks: { ...s.streaks, [profileId]: { ...forProfile, [id]: 0 } } };
        }),

      settle: (levelXp) => {
        const nothing: Settlement = {
          xp: 0,
          achievements: [],
          fills: 0,
          xpBefore: 0,
          xpAfter: 0,
        };
        const s = get();
        const profileId = s.activeProfileId;
        if (!profileId) return nothing;

        const earnedSoFar = s.earned[profileId] ?? {};
        const achievements = newlyEarned(
          { counters: s.counters[profileId] ?? {}, streaks: s.streaks[profileId] ?? {} },
          earnedSoFar,
        );

        const before = s.xp[profileId] ?? 0;
        const gained = levelXp + xpFor(achievements);
        const after = before + gained;

        const now = Date.now();
        set({
          xp: { ...s.xp, [profileId]: after },
          earned: {
            ...s.earned,
            [profileId]: {
              ...earnedSoFar,
              // Recorded here and never again — this is the whole of "an
              // achievement pays once", and so the whole reason rewarding
              // failure cannot become a way to farm the bar.
              ...Object.fromEntries(achievements.map((a) => [a.id, now])),
            },
          },
        });

        const settlement: Settlement = {
          xp: gained,
          achievements,
          fills: stickersFor(after) - stickersFor(before),
          xpBefore: before,
          xpAfter: after,
        };

        set({ lastSettlement: settlement });
        get().ensureOffer();
        return settlement;
      },

      /**
       * How many stickers she is owed is *derived*: everything the XP has paid
       * for, minus everything she has chosen. So a crash mid-choice loses
       * nothing — the next launch works out that one is still outstanding and
       * puts the offer back up.
       *
       * The offer itself is keyed on how many she already has, which makes it
       * stable across a reload and stops force-quitting from re-rolling it.
       */
      ensureOffer: () =>
        set((s) => {
          const profileId = s.activeProfileId;
          if (!profileId) return {};

          const album = s.album[profileId] ?? [];
          const outstanding = stickersFor(s.xp[profileId] ?? 0) - album.length;
          if (outstanding <= 0 || (s.pending[profileId] ?? []).length > 0) return {};

          return {
            pending: { ...s.pending, [profileId]: offerFor(album.length, new Set(album)) },
          };
        }),

      chooseSticker: (stickerId) =>
        set((s) => {
          const profileId = s.activeProfileId;
          if (!profileId) return {};
          if (!(s.pending[profileId] ?? []).includes(stickerId)) return {};

          const album = s.album[profileId] ?? [];
          return {
            album: { ...s.album, [profileId]: [...album, stickerId] },
            // Cleared rather than refilled: `ensureOffer` decides whether
            // another is owed, so there is one place that rule lives.
            pending: { ...s.pending, [profileId]: [] },
          };
        }),

      grantAlbum: () =>
        set((s) =>
          s.activeProfileId
            ? {
                album: { ...s.album, [s.activeProfileId]: STICKERS.map((sticker) => sticker.id) },
                pending: { ...s.pending, [s.activeProfileId]: [] },
              }
            : {},
        ),

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
      // Anything missing from this list is silently forgotten on relaunch —
      // `store.test.ts` asserts every key survives a round trip.
      partialize: ({
        activeProfileId,
        profiles,
        results,
        xp,
        counters,
        streaks,
        earned,
        album,
        pending,
      }) => ({
        activeProfileId,
        profiles,
        results,
        xp,
        counters,
        streaks,
        earned,
        album,
        pending,
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

/** Lifetime XP for the active player. The bar is derived from this alone. */
export function useXp(): number {
  return useProgress((s) => (s.activeProfileId ? (s.xp[s.activeProfileId] ?? 0) : 0));
}

/**
 * The stickers she owns, oldest first.
 *
 * Returns the stored array rather than mapping to `Sticker` objects, so the
 * reference stays stable and zustand's equality check does not spin.
 */
export function useAlbum(): readonly string[] {
  return useProgress((s) => (s.activeProfileId ? (s.album[s.activeProfileId] ?? EMPTY) : EMPTY));
}

/** The three on offer, or empty when nothing is owed. */
export function usePendingOffer(): readonly string[] {
  return useProgress((s) =>
    s.activeProfileId ? (s.pending[s.activeProfileId] ?? EMPTY) : EMPTY,
  );
}

/** Shared so an absent record does not return a fresh array every render. */
const EMPTY: readonly string[] = [];
