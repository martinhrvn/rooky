import { describe, expect, it } from 'vitest';

import { squareName } from '../chess/types';
import { solve } from '../game/solver';
import { ALL_LEVELS } from './index';

describe('level content', () => {
  it('has unique ids', () => {
    const ids = ALL_LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is not empty', () => {
    expect(ALL_LEVELS.length).toBeGreaterThan(0);
  });

  describe.each(ALL_LEVELS.map((level) => [level.id, level] as const))('%s', (_id, level) => {
    it('is winnable, and its par is the true optimum', () => {
      const solution = solve(level);
      expect(solution, 'no winning line exists').not.toBeNull();

      const line = solution!.moves.map((m) => `${squareName(m.from)}${squareName(m.to)}`).join(' ');
      expect(solution!.length, `declared par ${level.par}, solver found: ${line}`).toBe(level.par);
    });

    it('declares stars consistently with its goal', () => {
      if (level.goal === 'captureAll') {
        expect(level.stars).toHaveLength(0);
      } else {
        expect(level.stars.length, 'star goals need stars').toBeGreaterThan(0);
      }
    });

    it('has hints that start from a real square and stay on the board', () => {
      for (const { from, to } of level.hint) {
        expect(from).toBeGreaterThanOrEqual(0);
        expect(to).toBeLessThan(64);
      }
    });
  });
});
