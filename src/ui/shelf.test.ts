import { describe, expect, it } from 'vitest';

import { PER_PLANK, planks } from './shelf';

describe('planks', () => {
  it('draws no plank at all for an empty shelf', () => {
    expect(planks([])).toEqual([]);
  });

  it('keeps up to a full plank on one plank', () => {
    expect(planks(['jar'])).toEqual([['jar']]);
    expect(planks(['a', 'b', 'c'])).toHaveLength(1);
  });

  it('starts a new plank rather than shrinking the toys', () => {
    expect(planks(['a', 'b', 'c', 'd'])).toEqual([['a', 'b', 'c'], ['d']]);
    expect(PER_PLANK).toBe(3);
  });
});
