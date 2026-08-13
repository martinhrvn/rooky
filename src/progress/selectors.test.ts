import { describe, expect, it } from 'vitest';

import {
  catalogueFor,
  FULL_CATALOGUE,
  TIERS,
  tierLevels,
  type World,
  WORLDS,
  worldByKey,
} from '../content';
import {
  currentWorld,
  firstPlayableOfTier,
  isLevelUnlocked,
  isWorldUnlocked,
  mixPool,
  piecesPlayed,
  tierState,
  worldProgress,
} from './selectors';

const rook = worldByKey('rook')!;
const bishop = worldByKey('bishop')!;

/**
 * A world with no content, built here rather than borrowed from WORLDS.
 *
 * These tests used to point at the bishop because it happened to be empty —
 * which quietly stopped testing anything the moment it was authored. A
 * synthetic placeholder keeps the "not written yet" case covered for good.
 */
const unwritten: World = {
  key: 'mixed',
  cast: ['q'],
  title: 'Not written yet',
  blurb: '',
  levels: [],
};

const none = new Set<string>();
const allOf = (...ids: string[]) => new Set(ids);
const finished = (w: typeof rook) => new Set(w.levels.map((l) => l.id));

describe('worldProgress', () => {
  it('reports an untouched world', () => {
    const p = worldProgress(rook, none);
    expect(p.done).toBe(0);
    expect(p.total).toBe(rook.levels.length);
    expect(p.untouched).toBe(true);
    expect(p.complete).toBe(false);
  });

  it('counts a half-finished world, and splits the count by tier', () => {
    const p = worldProgress(rook, allOf('rook-t1-01', 'rook-t1-02', 'rook-t1-03'));
    expect(p.done).toBe(3);
    expect(p.byTier[1].done).toBe(3);
    expect(p.byTier[2].done).toBe(0);
    expect(p.untouched).toBe(false);
    expect(p.complete).toBe(false);
  });

  it('reports a finished world', () => {
    const p = worldProgress(rook, finished(rook));
    expect(p.complete).toBe(true);
    expect(p.done).toBe(p.total);
  });

  it('does not call an empty world complete', () => {
    // Worlds with no levels yet are placeholders, not finished work.
    const p = worldProgress(unwritten, none);
    expect(p.total).toBe(0);
    expect(p.complete).toBe(false);
  });

  it('ignores completed ids that belong to other worlds', () => {
    expect(worldProgress(bishop, allOf('rook-t1-01')).done).toBe(0);
  });
});

describe('isWorldUnlocked', () => {
  it('opens the first world immediately', () => {
    expect(isWorldUnlocked(WORLDS, rook, none)).toBe(true);
  });

  it('keeps the next world shut until the previous one is finished', () => {
    expect(isWorldUnlocked(WORLDS, bishop, none)).toBe(false);
    expect(isWorldUnlocked(WORLDS, bishop, allOf('rook-t1-01'))).toBe(false);
  });

  it('opens the next world once the previous one is finished', () => {
    expect(isWorldUnlocked(WORLDS, bishop, finished(rook))).toBe(true);
  });

  it('still refuses to open a world that has no levels yet', () => {
    // Everything before it is done, but there is nothing there to play.
    expect(isWorldUnlocked([rook, unwritten], unwritten, finished(rook))).toBe(false);
  });
});

describe('isLevelUnlocked', () => {
  it('always opens the first level, so a world can be replayed from the start', () => {
    expect(isLevelUnlocked(rook, rook.levels[0], none)).toBe(true);
  });

  it('opens a level once the previous one is done', () => {
    expect(isLevelUnlocked(rook, rook.levels[1], none)).toBe(false);
    expect(isLevelUnlocked(rook, rook.levels[1], allOf(rook.levels[0].id))).toBe(true);
  });

  it('does not care how well the previous level was played', () => {
    // Nothing is gated behind a star rating — completion is the only gate.
    expect(isLevelUnlocked(rook, rook.levels[1], allOf(rook.levels[0].id))).toBe(true);
  });

  it('rejects a level that is not in the world', () => {
    expect(isLevelUnlocked(bishop, rook.levels[0], none)).toBe(false);
  });
});

describe('the Mix pool', () => {
  it('is empty on a fresh profile, which is why the card is hidden then', () => {
    expect(mixPool(FULL_CATALOGUE, none)).toEqual([]);
    expect(piecesPlayed(WORLDS, none)).toEqual([]);
  });

  it('holds only levels she has actually finished', () => {
    const done = allOf('rook-t1-01', 'rook-t1-03');
    expect(mixPool(FULL_CATALOGUE, done).map((l) => l.id)).toEqual(['rook-t1-01', 'rook-t1-03']);
  });

  it('keeps play order rather than the order she happened to finish in', () => {
    const done = allOf('rook-t1-03', 'rook-t1-01');
    expect(mixPool(FULL_CATALOGUE, done).map((l) => l.id)).toEqual(['rook-t1-01', 'rook-t1-03']);
  });

  it('ignores ids that match no level', () => {
    expect(mixPool(FULL_CATALOGUE, allOf('not-a-level'))).toEqual([]);
  });

  it('lists each piece once, in world order', () => {
    const done = new Set([...finished(bishop), ...finished(rook)].map((id) => id));
    expect(piecesPlayed(WORLDS, done)).toEqual([rook.cast[0], bishop.cast[0]]);
  });

  it('lists a piece after a single finished level, not only a finished world', () => {
    expect(piecesPlayed(WORLDS, allOf('rook-t1-01'))).toEqual([rook.cast[0]]);
  });
});

describe('currentWorld', () => {
  it('is the first world with levels while nothing is done', () => {
    expect(currentWorld(WORLDS, none)).toBe(rook);
  });

  it('stays on a world that is still in progress', () => {
    expect(currentWorld(WORLDS, allOf('rook-t1-01'))).toBe(rook);
  });

  it('moves on to the next world once one is finished', () => {
    expect(currentWorld(WORLDS, finished(rook))).toBe(bishop);
  });

  it('falls back to the last playable world once everything is finished', () => {
    const everything = new Set(WORLDS.flatMap((w) => w.levels.map((l) => l.id)));
    const last = [...WORLDS].reverse().find((w) => w.levels.length > 0);
    expect(currentWorld(WORLDS, everything)).toBe(last);
  });
});

describe('tierState', () => {
  it('opens the first tier of the first world before anything is done', () => {
    expect(tierState(WORLDS, rook, 1, none)).toBe('open');
  });

  it('locks a later tier until the one before it is finished', () => {
    expect(tierState(WORLDS, rook, 2, none)).toBe('locked');
    expect(tierState(WORLDS, rook, 2, finished(rook))).toBe('done');
  });

  it('opens a later tier once the previous tier is done', () => {
    const throughT1 = new Set(
      rook.levels.filter((l) => l.tier === 1).map((l) => l.id),
    );
    expect(tierState(WORLDS, rook, 1, throughT1)).toBe('done');
    expect(tierState(WORLDS, rook, 2, throughT1)).toBe('open');
  });

  it('locks every tier of a world whose predecessors are unfinished', () => {
    expect(tierState(WORLDS, bishop, 1, none)).toBe('locked');
    expect(tierState(WORLDS, bishop, 1, finished(rook))).toBe('open');
  });

  it('locks a tier the world does not have', () => {
    // Theme worlds have no tier 1 at all — stars teach movement and these do
    // not. An absent tier is not a tier waiting to open.
    const capture = worldByKey('capture')!;
    expect(tierLevels(capture, 1)).toHaveLength(0);
    expect(tierState(WORLDS, capture, 1, none)).toBe('locked');
  });

  it('calls a finished tier done even inside a world that is still locked', () => {
    // Progress above the difficulty ceiling is kept, not deleted, so a tier can
    // legitimately be finished in a world that later reads as locked.
    expect(tierState(WORLDS, bishop, 1, finished(bishop))).toBe('done');
  });
});

describe('firstPlayableOfTier', () => {
  it('starts an untouched tier at its first level', () => {
    expect(firstPlayableOfTier(rook, 1, none)?.id).toBe('rook-t1-01');
  });

  it('resumes a half-finished tier at the first level with no result', () => {
    expect(firstPlayableOfTier(rook, 1, allOf('rook-t1-01', 'rook-t1-02'))?.id).toBe(
      'rook-t1-03',
    );
  });

  it('sends a finished tier back to its first level, so the circle replays', () => {
    // This fallback is the whole of "tapping a finished circle plays it again".
    // Returning undefined here would make a completed tier untappable.
    expect(firstPlayableOfTier(rook, 1, finished(rook))?.id).toBe('rook-t1-01');
  });

  it('has nothing to open for a tier the world does not have', () => {
    expect(firstPlayableOfTier(worldByKey('capture')!, 1, none)).toBeUndefined();
  });
});

describe('the path under a difficulty ceiling', () => {
  it('shows only the tiers the ceiling leaves, numbered from one', () => {
    // The path numbers circles by position among the tiers that exist rather
    // than by tier id, so capping at Watch out gives 1 and 2 — not 1 and 2-of-3.
    const capped = catalogueFor(2);
    const cappedRook = capped.worlds.find((w) => w.key === 'rook')!;
    const present = TIERS.filter((tier) => tierLevels(cappedRook, tier).length > 0);
    expect(present).toEqual([1, 2]);
  });

  it('drops a world the ceiling has emptied rather than showing a shut ribbon', () => {
    const capped = catalogueFor(1);
    expect(capped.worlds.some((w) => w.key === 'capture')).toBe(false);
  });
});
