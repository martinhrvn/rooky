import { describe, expect, it } from 'vitest';

import { makeRng } from './random';
import { reshuffle, shuffle } from './shuffle';

const ITEMS = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    const out = shuffle(ITEMS, makeRng(1));
    expect([...out].sort()).toEqual([...ITEMS].sort());
  });

  it('does not mutate the input', () => {
    const input = [...ITEMS];
    shuffle(input, makeRng(2));
    expect(input).toEqual(ITEMS);
  });

  it('is reproducible from a seed', () => {
    expect(shuffle(ITEMS, makeRng(7))).toEqual(shuffle(ITEMS, makeRng(7)));
  });

  it('actually reorders, given enough seeds', () => {
    const orders = new Set(Array.from({ length: 20 }, (_, i) => shuffle(ITEMS, makeRng(i)).join('')));
    expect(orders.size).toBeGreaterThan(5);
  });

  it('handles empty and single-item lists', () => {
    expect(shuffle([], makeRng(1))).toEqual([]);
    expect(shuffle(['only'], makeRng(1))).toEqual(['only']);
  });
});

describe('reshuffle', () => {
  it('never starts with the level just played', () => {
    // The seam between one cycle and the next is the only place a repeat is
    // noticeable, so it is the only one worth preventing.
    for (let seed = 0; seed < 50; seed++) {
      expect(reshuffle(ITEMS, makeRng(seed), 'c')[0]).not.toBe('c');
    }
  });

  it('still keeps every item exactly once', () => {
    const out = reshuffle(ITEMS, makeRng(3), 'a');
    expect([...out].sort()).toEqual([...ITEMS].sort());
  });

  it('repeats when there is only one level, rather than hanging', () => {
    expect(reshuffle(['only'], makeRng(1), 'only')).toEqual(['only']);
  });

  it('behaves like a plain shuffle when nothing is being avoided', () => {
    expect(reshuffle(ITEMS, makeRng(9))).toEqual(shuffle(ITEMS, makeRng(9)));
  });
});
