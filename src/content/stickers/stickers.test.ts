import { describe, expect, it } from 'vitest';

import { CANDIDATES } from './catalogue';
import { STICKERS, stickerById } from './index';

describe('the sticker catalogue', () => {
  it('has no duplicate ids', () => {
    const ids = new Set(CANDIDATES.map((s) => s.id));
    expect(ids.size).toBe(CANDIDATES.length);
  });

  it('has no duplicate pictures', () => {
    // Two stickers she cannot tell apart are one sticker, and winning the
    // "second" one reads as being given something she already had.
    const emoji = new Set(CANDIDATES.map((s) => s.emoji));
    expect(emoji.size).toBe(CANDIDATES.length);
  });

  it('offers a curated subset, not the raw catalogue', () => {
    expect(STICKERS.length).toBeGreaterThan(0);
    expect(STICKERS.length).toBeLessThan(CANDIDATES.length);
  });
});

describe('stickerById', () => {
  it('still resolves one that curation has since dropped', () => {
    // The whole point: excluding a sticker stops it being *offered*, but a
    // child who already earned it must keep it. Same rule as `levelById`.
    const offered = new Set(STICKERS.map((s) => s.id));
    const dropped = CANDIDATES.find((s) => !offered.has(s.id));

    expect(dropped).toBeDefined();
    expect(stickerById(dropped!.id).emoji).toBe(dropped!.emoji);
  });

  it('falls back rather than returning nothing for an unknown id', () => {
    expect(stickerById('not-a-hexcode').emoji).toBeTruthy();
  });
});
