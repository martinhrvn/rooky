import { describe, expect, it } from 'vitest';

import { XP_PER_STICKER, barProgress, fillsBetween, stickersFor, xpForResult } from './xp';

const award = (over: Partial<Parameters<typeof xpForResult>[0]> = {}) =>
  xpForResult({ stars: 3, isFirstClear: true, ...over });

describe('what a level is worth', () => {
  it('is decided by the stars, and by nothing else', () => {
    // The table, pinned. Three stars is always forty — playing a level better
    // is the only thing that can ever make it worth more, which is the whole
    // point of tying the award to stars.
    expect(award({ stars: 3 })).toBe(40);
    expect(award({ stars: 2 })).toBe(30);
    expect(award({ stars: 1 })).toBe(20);
  });

  it('fills the bar in exactly five three-star levels', () => {
    expect(award({ stars: 3 }) * 5).toBe(XP_PER_STICKER);
  });

  it('pays more for a first clear than for a replay', () => {
    // Or the shortest level in the game becomes the fastest way to earn, and
    // grinding one easy puzzle is not the behaviour to reward.
    for (const stars of [1, 2, 3] as const) {
      expect(award({ stars, isFirstClear: true })).toBeGreaterThan(
        award({ stars, isFirstClear: false }),
      );
    }
  });

  it('still pays more for more stars on a replay', () => {
    expect(award({ stars: 3, isFirstClear: false })).toBeGreaterThan(
      award({ stars: 1, isFirstClear: false }),
    );
  });

  it('never pays zero, however it is rounded', () => {
    // She will play the same level thirty times. A bar that stops moving reads
    // as broken, not as frugal.
    for (const stars of [1, 2, 3] as const) {
      for (const isFirstClear of [true, false]) {
        expect(award({ stars, isFirstClear })).toBeGreaterThan(0);
      }
    }
  });
});

describe('the cost of a sticker', () => {
  it('is the same for the first as for the fiftieth', () => {
    // The constant-cost decision, asserted rather than trusted. A stretching
    // curve reads to a four-year-old as the app getting stingier.
    const costOf = (n: number) => {
      const xpForNth = (i: number) => {
        let xp = 0;
        while (stickersFor(xp) < i) xp += 1;
        return xp;
      };
      return xpForNth(n) - xpForNth(n - 1);
    };

    expect(costOf(1)).toBe(XP_PER_STICKER);
    expect(costOf(50)).toBe(XP_PER_STICKER);
  });

  it('never goes down as XP goes up', () => {
    let previous = 0;
    for (let xp = 0; xp < XP_PER_STICKER * 5; xp += 7) {
      const stickers = stickersFor(xp);
      expect(stickers).toBeGreaterThanOrEqual(previous);
      previous = stickers;
    }
  });

  it('owes nothing before the first bar is full', () => {
    expect(stickersFor(0)).toBe(0);
    expect(stickersFor(XP_PER_STICKER - 1)).toBe(0);
    expect(stickersFor(XP_PER_STICKER)).toBe(1);
  });
});

describe('the bar', () => {
  it('reads as a proportion, empty at a fresh fill', () => {
    expect(barProgress(0)).toBe(0);
    expect(barProgress(XP_PER_STICKER)).toBe(0);
    expect(barProgress(XP_PER_STICKER / 2)).toBeCloseTo(0.5);
  });

  it('stays inside 0 and 1 at every point', () => {
    for (let xp = 0; xp < XP_PER_STICKER * 3; xp += 13) {
      expect(barProgress(xp)).toBeGreaterThanOrEqual(0);
      expect(barProgress(xp)).toBeLessThan(1);
    }
  });
});

describe('one award crossing two boundaries', () => {
  it('owes two stickers, not one', () => {
    // A big achievement bonus landing on top of a level's XP. Reporting a
    // boolean here is how the second sticker gets silently swallowed.
    expect(fillsBetween(0, XP_PER_STICKER * 2)).toBe(2);
  });

  it('owes nothing when the bar did not complete', () => {
    expect(fillsBetween(0, XP_PER_STICKER - 1)).toBe(0);
  });

  it('owes one for an ordinary crossing', () => {
    expect(fillsBetween(XP_PER_STICKER - 1, XP_PER_STICKER + 1)).toBe(1);
  });
});
