import { describe, expect, it } from 'vitest';

import { parseSquare } from '../chess/types';
import {
  ACHIEVEMENTS,
  LONG_SLIDE,
  type MoveEvent,
  TRIES,
  countersFor,
  newlyEarned,
  xpFor,
} from './achievements';

const move = (over: Partial<MoveEvent> = {}): MoveEvent => ({
  piece: 'n',
  from: parseSquare('b1'),
  to: parseSquare('c3'),
  ...over,
});

const tallies = (counters: Record<string, number> = {}, streaks: Record<string, number> = {}) => ({
  counters,
  streaks,
});

describe('the catalogue', () => {
  it('has unique ids', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('never pays nothing', () => {
    for (const achievement of ACHIEVEMENTS) expect(achievement.xp).toBeGreaterThan(0);
  });

  it('orders the thresholds within a tally strictly upwards', () => {
    const byCounter = new Map<string, number[]>();
    for (const { counter, threshold } of ACHIEVEMENTS) {
      byCounter.set(counter, [...(byCounter.get(counter) ?? []), threshold]);
    }
    for (const [counter, thresholds] of byCounter) {
      const sorted = [...thresholds].sort((a, b) => a - b);
      expect(thresholds, counter).toEqual(sorted);
      expect(new Set(thresholds).size, counter).toBe(thresholds.length);
    }
  });

  it('pays at least as much for a harder tier of the same tally', () => {
    const byCounter = new Map<string, number[]>();
    for (const { counter, xp } of ACHIEVEMENTS) {
      byCounter.set(counter, [...(byCounter.get(counter) ?? []), xp]);
    }
    for (const [counter, awards] of byCounter) {
      for (let i = 1; i < awards.length; i += 1) {
        expect(awards[i], counter).toBeGreaterThanOrEqual(awards[i - 1]);
      }
    }
  });

  it('is reachable: every one is earned by some state', () => {
    // The same idea as the solver content gate — it catches the achievement
    // nobody can ever get.
    for (const achievement of ACHIEVEMENTS) {
      const at = { [achievement.counter]: achievement.threshold };
      const earned = newlyEarned(
        achievement.kind === 'streak' ? tallies({}, at) : tallies(at),
        {},
      );
      expect(earned.map((a) => a.id), achievement.id).toContain(achievement.id);
    }
  });
});

describe('countersFor and the catalogue agree', () => {
  // A *(piece × verb)* achievement that nothing ever increments is the failure
  // mode this shape invites, so check both directions.
  const producible = new Set<string>();
  for (const piece of ['p', 'n', 'b', 'r', 'q', 'k'] as const) {
    for (const captured of [undefined, 'p'] as const) {
      for (const promotedTo of [undefined, 'q'] as const) {
        for (const gaveCheck of [false, true]) {
          for (const gaveMate of [false, true]) {
            for (const to of ['c3', 'h8'] as const) {
              countersFor(
                move({ piece, from: parseSquare('a1'), to: parseSquare(to), captured, promotedTo, gaveCheck, gaveMate }),
              ).forEach((id) => producible.add(id));
            }
          }
        }
      }
    }
  }

  // These are bumped by the screens rather than by a move.
  const fromScreens = new Set(['stars', 'levels', 'hints', 'mix', 'endless', 'taken', 'stranded', TRIES]);

  it('produces every counter the catalogue watches', () => {
    for (const { counter } of ACHIEVEMENTS) {
      expect(producible.has(counter) || fromScreens.has(counter), counter).toBe(true);
    }
  });

  it('produces nothing the catalogue ignores', () => {
    const watched = new Set(ACHIEVEMENTS.map((a) => a.counter));
    for (const id of producible) expect(watched.has(id), id).toBe(true);
  });
});

describe('what a move counts as', () => {
  it('always counts as a move by that piece', () => {
    expect(countersFor(move({ piece: 'r' }))).toContain('moved:r');
  });

  it('counts a capture as taken-with, not just as a move', () => {
    expect(countersFor(move({ piece: 'p', captured: 'n' }))).toContain('took:p');
    expect(countersFor(move({ piece: 'p' }))).not.toContain('took:p');
  });

  it('counts a long slide only for a piece that travels in lines', () => {
    const far = { from: parseSquare('a1'), to: parseSquare('a8') };
    expect(countersFor(move({ piece: 'r', ...far }))).toContain('slid:r');
    // A knight cannot cross the board in one move, so it must never qualify.
    expect(countersFor(move({ piece: 'n', ...far }))).not.toContain('slid:n');
  });

  it('does not count a short slide as a long one', () => {
    const short = { from: parseSquare('a1'), to: parseSquare(`a${LONG_SLIDE}`) };
    expect(countersFor(move({ piece: 'r', ...short }))).not.toContain('slid:r');
  });
});

describe('paying out', () => {
  it('pays an achievement once and never again', () => {
    // The rule that stops "reward the failures" becoming "farm the bar by
    // losing". Evaluate twice against the same state; the second pays nothing.
    const state = tallies({ taken: 25 });

    const first = newlyEarned(state, {});
    expect(xpFor(first)).toBeGreaterThan(0);

    const earned = Object.fromEntries(first.map((a) => [a.id, 1]));
    expect(xpFor(newlyEarned(state, earned))).toBe(0);
  });

  it('pays every tier crossed at once', () => {
    const earned = newlyEarned(tallies({ taken: 25 }), {}).map((a) => a.id);
    expect(earned).toContain('taken@5');
    expect(earned).toContain('taken@10');
    expect(earned).toContain('taken@25');
  });

  it('pays nothing below the threshold', () => {
    expect(newlyEarned(tallies({ taken: 4 }), {})).toHaveLength(0);
  });
});

describe('the streak', () => {
  it('is earned from the streak tally, not the totals', () => {
    expect(newlyEarned(tallies({ [TRIES]: 5 }), {})).toHaveLength(0);
    expect(newlyEarned(tallies({}, { [TRIES]: 5 }), {}).map((a) => a.id)).toContain(`${TRIES}@5`);
  });

  it('survives the reset that follows it', () => {
    // "Never give up" is granted for a run of failures and the run is reset by
    // *clearing the level* — the event that earns it. If evaluation looked at
    // the live streak alone, the achievement would be taken straight back off
    // her. `earned` is what makes it permanent, and this asserts the ordering.
    const earned = Object.fromEntries(
      newlyEarned(tallies({}, { [TRIES]: 5 }), {}).map((a) => [a.id, 1]),
    );

    expect(earned[`${TRIES}@5`]).toBeDefined();
    expect(newlyEarned(tallies({}, { [TRIES]: 0 }), earned)).toHaveLength(0);
  });
});
