import { describe, expect, it } from 'vitest';

import { isWorldUnlocked, worldProgress } from '../progress/selectors';
import { ALL_LEVELS, FULL_CATALOGUE, catalogueFor, nextLevel, worldByKey } from './index';

const rook = worldByKey('rook')!;
const finishedTo = (maxTier: number) =>
  new Set(rook.levels.filter((l) => l.tier <= maxTier).map((l) => l.id));

describe('the difficulty ceiling', () => {
  it('at 3, is exactly the whole catalogue', () => {
    // The regression guard for the entire refactor: capping at the top must
    // leave today's behaviour untouched.
    expect(catalogueFor(3).levels).toEqual(ALL_LEVELS);
  });

  it('at 2, contains no "on your own" level anywhere', () => {
    const capped = catalogueFor(2);
    expect(capped.levels.some((l) => l.tier === 3)).toBe(false);
    expect(capped.worlds.every((w) => w.levels.every((l) => l.tier <= 2))).toBe(true);
  });

  it('at 1, is stars only', () => {
    expect(catalogueFor(1).levels.every((l) => l.tier === 1)).toBe(true);
  });

  it('keeps every piece world, so the selector still shows what is coming', () => {
    // The six piece worlds all start at tier 1, so no ceiling can empty one.
    const piecesWorlds = FULL_CATALOGUE.worlds.filter((w) => w.cast.length === 1);
    const kept = catalogueFor(1).worlds.map((w) => w.key);
    expect(kept).toEqual(piecesWorlds.map((w) => w.key));
  });

  it('drops a world the ceiling has emptied rather than showing an empty card', () => {
    // The theme worlds have no tier 1 at all. A parent capping at Stars should
    // see them gone, not see four cards that can never open — "treat it as if
    // it did not exist" has to hold on the selector too.
    const themed = FULL_CATALOGUE.worlds.filter((w) => w.cast.length > 1);
    expect(themed.length).toBeGreaterThan(0);
    for (const world of themed) {
      expect(world.levels.some((l) => l.tier === 1)).toBe(false);
      expect(catalogueFor(1).worlds.some((w) => w.key === world.key)).toBe(false);
      expect(catalogueFor(2).worlds.some((w) => w.key === world.key)).toBe(true);
    }
  });

  it('is memoised, so screens can call it every render', () => {
    expect(catalogueFor(2)).toBe(catalogueFor(2));
  });
});

describe('progression under a ceiling', () => {
  it('never offers a hidden level', () => {
    const capped = catalogueFor(2);
    expect(nextLevel(capped, finishedTo(1))!.tier).toBe(2);
  });

  it('counts a world finished without the hidden tier', () => {
    // The point of the setting: tiers 1 and 2 done means the rook is done, and
    // the bishop opens normally.
    const capped = catalogueFor(2);
    const cappedRook = capped.worlds.find((w) => w.key === 'rook')!;
    const cappedBishop = capped.worlds.find((w) => w.key === 'bishop')!;

    expect(worldProgress(cappedRook, finishedTo(2)).complete).toBe(true);
    expect(isWorldUnlocked(capped.worlds, cappedBishop, finishedTo(2))).toBe(true);
  });

  it('still counts that same world unfinished at the full ceiling', () => {
    expect(worldProgress(rook, finishedTo(2)).complete).toBe(false);
  });

  it('rolls on to the next piece rather than stalling', () => {
    const capped = catalogueFor(2);
    expect(nextLevel(capped, finishedTo(2))!.world).toBe('bishop');
  });

  it('hides results above the ceiling without discarding them', () => {
    // Lowering the setting must never destroy what she earned — the results
    // are simply not counted while the tier is hidden.
    const everything = new Set(rook.levels.map((l) => l.id));
    const cappedRook = catalogueFor(2).worlds.find((w) => w.key === 'rook')!;

    expect(worldProgress(cappedRook, everything).done).toBe(cappedRook.levels.length);
    expect(worldProgress(rook, everything).done).toBe(rook.levels.length);
  });
});
