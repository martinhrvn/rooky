import { describe, expect, it } from 'vitest';

import { DEFAULT_MAX_TIER, PROGRESS_VERSION } from './schema';
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

describe('migrating from the current version', () => {
  it('passes a current payload through untouched', () => {
    const current = {
      ...v1,
      profiles: v1.profiles.map((p) => ({ ...p, maxTier: 2 as const })),
    };
    expect(migrateProgress(current, PROGRESS_VERSION).profiles.map((p) => p.maxTier)).toEqual([
      2, 2,
    ]);
  });
});

describe('migrating from nothing', () => {
  it('survives a missing or empty payload rather than throwing', () => {
    // A first run, or storage that was cleared underneath us.
    expect(migrateProgress(undefined, 1).profiles).toEqual([]);
    expect(migrateProgress({ profiles: undefined }, 1).profiles).toEqual([]);
  });
});
