import { describe, expect, it } from 'vitest';

import { AVATARS, DEFAULT_MAX_TIER, PROGRESS_VERSION, avatarById } from './schema';
import { migrateProgress } from './store';

/**
 * A payload exactly as version 1 wrote it: profiles with no `maxTier`.
 *
 * This is the first time the migration hook has run against stored data since
 * it shipped in Phase A, and on the other side of it is a child's saved
 * progress — so the thing these tests really guard is that nothing is lost.
 */
const v1 = {
  activeProfileId: 'p1',
  profiles: [
    { id: 'p1', name: 'Player 1', avatarId: 'wr', createdAt: 1000 },
    { id: 'p2', name: 'Sibling', avatarId: 'bn', createdAt: 2000 },
  ],
  results: {
    p1: {
      'rook-t1-01': { levelId: 'rook-t1-01', stars: 3, bestMoves: 1, completedAt: 1500 },
      'rook-t1-02': { levelId: 'rook-t1-02', stars: 2, bestMoves: 3, completedAt: 1600 },
    },
    p2: {},
  },
};

describe('migrating from version 1', () => {
  const migrated = migrateProgress(structuredClone(v1), 1);

  it('gives every profile the full set of difficulties', () => {
    // They were already playing all three; the ceiling is new, not a change.
    expect(migrated.profiles.map((p) => p.maxTier)).toEqual([DEFAULT_MAX_TIER, DEFAULT_MAX_TIER]);
  });

  it('keeps every result, which is the whole point', () => {
    expect(migrated.results.p1['rook-t1-01']).toEqual(v1.results.p1['rook-t1-01']);
    expect(Object.keys(migrated.results.p1)).toHaveLength(2);
  });

  it('keeps profile identity and the active selection', () => {
    expect(migrated.activeProfileId).toBe('p1');
    expect(migrated.profiles.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(migrated.profiles[1].name).toBe('Sibling');
  });

  it('does not mutate what it was given', () => {
    const input = structuredClone(v1);
    migrateProgress(input, 1);
    expect(input.profiles[0]).not.toHaveProperty('maxTier');
  });
});

describe('migrating from version 2', () => {
  /** v2 stored avatars as chess pieces. */
  const v2 = {
    ...v1,
    profiles: v1.profiles.map((p) => ({ ...p, maxTier: 2 as const })),
  };
  const migrated = migrateProgress(structuredClone(v2), 2);

  it('replaces chess-piece avatars with real emoji ids', () => {
    for (const profile of migrated.profiles) {
      expect(avatarById(profile.avatarId).id).toBe(profile.avatarId);
    }
  });

  it('gives each profile a different face', () => {
    // By position rather than at random, so two siblings never collide.
    const ids = migrated.profiles.map((p) => p.avatarId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('leaves the difficulty ceiling and results alone', () => {
    expect(migrated.profiles.map((p) => p.maxTier)).toEqual([2, 2]);
    expect(migrated.results.p1['rook-t1-01']).toEqual(v1.results.p1['rook-t1-01']);
  });
});

describe('migrating a version 1 payload all the way up', () => {
  // A payload from the very first release crosses both branches in one go.
  const migrated = migrateProgress(structuredClone(v1), 1);

  it('gains both the ceiling and an emoji avatar', () => {
    expect(migrated.profiles[0].maxTier).toBe(DEFAULT_MAX_TIER);
    expect(avatarById(migrated.profiles[0].avatarId).id).toBe(migrated.profiles[0].avatarId);
  });

  it('still has every result', () => {
    expect(Object.keys(migrated.results.p1)).toHaveLength(2);
  });
});

describe('migrating from version 3', () => {
  /** v3 had results and profiles, but no rewards at all. */
  const v3 = {
    ...v1,
    profiles: v1.profiles.map((p, i) => ({
      ...p,
      maxTier: 3 as const,
      avatarId: i === 0 ? ('lion' as const) : ('owl' as const),
    })),
  };
  const migrated = migrateProgress(structuredClone(v3), 3);

  it('keeps every result, which is the whole point', () => {
    expect(migrated.results.p1['rook-t1-01']).toEqual(v1.results.p1['rook-t1-01']);
    expect(Object.keys(migrated.results.p1)).toHaveLength(2);
  });

  it('starts everyone at nothing rather than back-filling', () => {
    // Deliberate: paying out for a hundred already-finished levels would dump
    // a dozen sticker choices in a row on first launch, which is a mess and
    // not a celebration. The counters could not be back-filled in any case —
    // nothing ever recorded how many times she had been taken.
    expect(migrated.xp).toEqual({});
    expect(migrated.album).toEqual({});
    expect(migrated.counters).toEqual({});
    expect(migrated.earned).toEqual({});
  });

  it('gives every new record a value rather than leaving it undefined', () => {
    for (const key of ['xp', 'counters', 'streaks', 'earned', 'album', 'pending'] as const) {
      expect(migrated[key], key).toBeDefined();
    }
  });
});

describe('migrating from version 4', () => {
  /** A v4 payload: rewards, but nowhere yet to stick them. */
  const v4 = {
    ...v1,
    profiles: v1.profiles.map((p) => ({ ...p, maxTier: 3 as const, avatarId: 'fox' as const })),
    xp: { p1: 450 },
    counters: { p1: { 'moved:n': 12 } },
    streaks: { p1: {} },
    earned: { p1: { 'moved:n:1': 1700 } },
    album: { p1: ['1F438', '1F98A'] },
    pending: { p1: [] },
  };
  const migrated = migrateProgress(structuredClone(v4), 4);

  it('starts everyone with an empty picture', () => {
    // There is nothing in a v4 payload to derive a composition from, and an
    // empty canvas is the correct starting state rather than anything lost.
    expect(migrated.canvas).toEqual({});
  });

  it('leaves everything she had earned exactly as it was', () => {
    expect(migrated.xp).toEqual(v4.xp);
    expect(migrated.album).toEqual(v4.album);
    expect(migrated.earned).toEqual(v4.earned);
    expect(migrated.counters).toEqual(v4.counters);
    expect(migrated.results.p1['rook-t1-01']).toEqual(v1.results.p1['rook-t1-01']);
  });
});

describe('migrating from the current version', () => {
  it('passes a current payload through untouched', () => {
    const current = {
      ...v1,
      profiles: v1.profiles.map((p, i) => ({
        ...p,
        maxTier: 2 as const,
        avatarId: i === 0 ? ('lion' as const) : ('owl' as const),
      })),
    };
    const migrated = migrateProgress(current, PROGRESS_VERSION);
    expect(migrated.profiles.map((p) => p.avatarId)).toEqual(['lion', 'owl']);
    expect(migrated.profiles.map((p) => p.maxTier)).toEqual([2, 2]);
  });

  it('leaves a picture she has already made alone', () => {
    const canvas = {
      p1: {
        backgroundId: 'night',
        placements: [{ key: 's1', stickerId: '1F438', x: 0.4, y: 0.6, scale: 1, rotation: 0 }],
      },
    };
    expect(migrateProgress({ ...v1, canvas }, PROGRESS_VERSION).canvas).toEqual(canvas);
  });
});

describe('avatars', () => {
  it('falls back rather than rendering nothing for an unknown id', () => {
    // Guards against a stored id from a set that has since changed.
    expect(avatarById('no-such-avatar').emoji).toBeTruthy();
  });

  it('has a distinct emoji and name for every entry', () => {
    expect(new Set(AVATARS.map((a) => a.emoji)).size).toBe(AVATARS.length);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
  });
});

describe('migrating from nothing', () => {
  it('survives a missing or empty payload rather than throwing', () => {
    // A first run, or storage that was cleared underneath us.
    expect(migrateProgress(undefined, 1).profiles).toEqual([]);
    expect(migrateProgress({ profiles: undefined }, 1).profiles).toEqual([]);
  });
});
