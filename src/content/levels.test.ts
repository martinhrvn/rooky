import { describe, expect, it } from 'vitest';

import { ALL_LEVELS, FULL_CATALOGUE, WORLDS, nextLevel, nextWorldWithLevels } from './index';

/**
 * What is true *between* worlds.
 *
 * Everything about a single level — winnable, par honest, goal and pieces in
 * agreement, the overlay telling the truth — belongs to `validate.ts` and runs
 * from each world's own one-line test file. That split is the point: several
 * people (or agents) author worlds at once, and a global sweep over
 * `ALL_LEVELS` breaks everyone's run the moment one file is half-written.
 *
 * So this file holds only the checks no single world can make about itself.
 */
describe('the catalogue as a whole', () => {
  it('has unique ids across every world', () => {
    const ids = ALL_LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is not empty', () => {
    expect(ALL_LEVELS.length).toBeGreaterThan(0);
  });

  it('keeps every world contiguous, so Continue never jumps back to a piece', () => {
    const order = ALL_LEVELS.map((level) => level.world);
    const firstSeen = order.map((key) => order.indexOf(key));
    expect(firstSeen).toEqual([...firstSeen].sort((a, b) => a - b));
  });

  describe('moving from one world to the next', () => {
    const playable = WORLDS.filter((w) => w.levels.length > 0);

    it('points every finished world at another one, except the last', () => {
      playable.slice(0, -1).forEach((world) => {
        const next = nextWorldWithLevels(FULL_CATALOGUE, world);
        expect(next, `${world.key} leads nowhere`).toBeDefined();
        expect(next!.levels.length).toBeGreaterThan(0);
      });
    });

    it('offers nothing after the final world rather than wrapping round', () => {
      expect(nextWorldWithLevels(FULL_CATALOGUE, playable[playable.length - 1])).toBeUndefined();
    });

    it('skips worlds that have no levels yet', () => {
      // Placeholder worlds are shown locked on the selector; they must never
      // be somewhere Continue or "Next piece" can land.
      for (const world of playable) {
        expect(nextWorldWithLevels(FULL_CATALOGUE, world)?.levels.length ?? 1).toBeGreaterThan(0);
      }
    });

    it('lands Continue on the next world once one is finished', () => {
      // Only meaningful with somewhere to go: with a single world, Continue
      // correctly falls back to that world's last level.
      if (playable.length < 2) return;

      const done = new Set(playable[0].levels.map((l) => l.id));
      expect(nextLevel(FULL_CATALOGUE, done)).toBe(playable[1].levels[0]);
    });
  });
});
