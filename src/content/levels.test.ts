import { describe, expect, it } from 'vitest';

import { dangerMap } from '../chess/attacks';
import { findPieces, parseFen, toFen } from '../chess/board';
import { destinations } from '../chess/moves';
import { squareName } from '../chess/types';
import { applyMove, startLevel } from '../game/engine';
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

  it('runs in tier order, which is what Continue walks', () => {
    const tiers = ALL_LEVELS.map((level) => level.tier);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });

  it('gives every capture level real enemies to take', () => {
    for (const level of ALL_LEVELS.filter((l) => l.goal === 'captureAll')) {
      expect(findPieces(parseFen(level.fen).board, 'b').length, level.id).toBeGreaterThan(0);
    }
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

    it('warns about exactly the squares that punish her', () => {
      // The overlay's contract: red means you get taken there, and no red
      // means you don't. Under-warning is the worse failure -- it punishes a
      // danger it never displayed -- so this walks the level's whole reachable
      // state space rather than just the opening position.
      if (level.tier < 2) return;

      const seen = new Set<string>();
      let frontier = [startLevel(level)];

      for (let depth = 0; depth < level.par && frontier.length > 0; depth++) {
        const next: typeof frontier = [];
        for (const state of frontier) {
          const warned = dangerMap(state.board);
          for (const from of findPieces(state.board, 'w')) {
            for (const to of destinations(state.board, from)) {
              const after = applyMove(state, from, to);
              expect(
                warned.has(to),
                `${level.id}: ${squareName(from)}${squareName(to)} ${
                  after.phase === 'lost' ? 'loses but is not marked' : 'is marked but is safe'
                }`,
              ).toBe(after.phase === 'lost');

              if (after.phase !== 'playing') continue;
              const key = toFen({ board: after.board, turn: 'w' });
              if (seen.has(key)) continue;
              seen.add(key);
              next.push(after);
            }
          }
        }
        frontier = next;
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
