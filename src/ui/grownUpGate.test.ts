import { describe, expect, it } from 'vitest';

import {
  CHALLENGE_LENGTH,
  GATE_DIGITS,
  type GateDigit,
  drawChallenge,
  matches,
  withDigit,
} from './grownUpGate';

/** Deals the given numbers in order, wrapping — a stand-in for `Math.random`. */
const dealing = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const type = (digits: readonly GateDigit[]) =>
  digits.reduce<readonly GateDigit[]>((typed, digit) => withDigit(typed, digit), []);

describe('the grown-up gate', () => {
  it('draws a challenge of the right length from the pad', () => {
    for (let i = 0; i < 200; i++) {
      const challenge = drawChallenge();
      expect(challenge).toHaveLength(CHALLENGE_LENGTH);
      expect(challenge.every((digit) => GATE_DIGITS.includes(digit))).toBe(true);
    }
  });

  it('has no zero on the pad', () => {
    // "Zero" and "oh" are one key and two words, which is the one number this
    // gate cannot spell without ambiguity.
    expect(GATE_DIGITS).not.toContain(0);
  });

  it('stays inside the pad at both ends of the random range', () => {
    // `Math.random` is [0, 1), so the top of the range must not fall off the
    // end of the array — the classic off-by-one in a draw like this.
    expect(drawChallenge(dealing(0))).toEqual([1, 1, 1]);
    expect(drawChallenge(dealing(0.999999))).toEqual([9, 9, 9]);
  });

  it('lets a digit repeat', () => {
    // A sequence to copy, not a combination. Forbidding repeats would only
    // shrink the pool.
    expect(drawChallenge(dealing(0.5))).toEqual([5, 5, 5]);
  });

  it('opens only on the exact sequence', () => {
    const challenge: readonly GateDigit[] = [1, 5, 7];

    expect(matches(type([1, 5, 7]), challenge)).toBe(true);
    expect(matches(type([7, 5, 1]), challenge)).toBe(false);
    expect(matches(type([1, 5, 8]), challenge)).toBe(false);
  });

  it('is not satisfied by a prefix', () => {
    expect(matches(type([1, 5]), [1, 5, 7])).toBe(false);
    expect(matches([], [1, 5, 7])).toBe(false);
  });

  it('cannot be overrun', () => {
    expect(type([1, 5, 7, 9])).toEqual([1, 5, 7]);
  });
});
