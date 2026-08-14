import { describe, expect, it } from 'vitest';

import {
  CANVAS_ASPECT,
  MAX_SCALE,
  MIN_SCALE,
  type Rect,
  clampPlacement,
  clampScale,
  fitCanvas,
  hitTest,
  normalise,
  resolvePlacedDrop,
  resolveTrayDrop,
  stickerSizeFor,
} from './canvasGeometry';

/** A 300x400 picture whose top-left corner sits 100 across and 200 down. */
const CANVAS: Rect = { x: 100, y: 200, width: 300, height: 400 };
const TRAY: Rect = { x: 0, y: 200, width: 80, height: 400 };
const SIZE = stickerSizeFor(CANVAS); // 54

describe('fitting the picture into the room it has', () => {
  it('always comes out the same shape', () => {
    for (const available of [
      { width: 300, height: 900 },
      { width: 900, height: 300 },
      { width: 411, height: 731 },
    ]) {
      const box = fitCanvas(available);
      expect(box.width / box.height).toBeCloseTo(CANVAS_ASPECT);
    }
  });

  it('is limited by the width in a tall room', () => {
    expect(fitCanvas({ width: 300, height: 900 })).toEqual({ width: 300, height: 400 });
  });

  it('is limited by the height in a wide one', () => {
    expect(fitCanvas({ width: 900, height: 400 })).toEqual({ width: 300, height: 400 });
  });

  it('returns zeros rather than NaN before anything is laid out', () => {
    expect(fitCanvas({ width: 0, height: 0 })).toEqual({ width: 0, height: 0 });
  });
});

describe('keeping a sticker on the picture', () => {
  const box = { width: 300, height: 400 };
  const half = { x: SIZE / 2 / 300, y: SIZE / 2 / 400 };

  it('leaves an interior point exactly where it is', () => {
    expect(clampPlacement({ x: 0.42, y: 0.61 }, box, SIZE)).toEqual({ x: 0.42, y: 0.61 });
  });

  it('pulls a corner in far enough that the whole sticker shows', () => {
    expect(clampPlacement({ x: 0, y: 0 }, box, SIZE)).toEqual(half);
    expect(clampPlacement({ x: 1, y: 1 }, box, SIZE)).toEqual({ x: 1 - half.x, y: 1 - half.y });
  });

  it('collapses to the middle for a sticker wider than the picture', () => {
    // Rather than inverting the range and handing back something nonsensical.
    expect(clampPlacement({ x: 0.1, y: 0.9 }, box, 5000)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('survives a box of zero', () => {
    const p = clampPlacement({ x: 0.3, y: 0.3 }, { width: 0, height: 0 }, SIZE);
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
  });
});

describe('how far a sticker may be pinched', () => {
  it('leaves a sensible size alone', () => {
    expect(clampScale(1.4)).toBe(1.4);
  });

  it('will not let one shrink to a speck or swallow the picture', () => {
    // Both ends matter: too small and she cannot get hold of it again, too
    // large and everything underneath becomes unreachable.
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(40)).toBe(MAX_SCALE);
  });

  it('falls back to plain size rather than storing nonsense', () => {
    // Two fingers landing on the same point can produce a NaN scale, and a
    // stored NaN is a sticker that never draws again.
    expect(clampScale(Number.NaN)).toBe(1);
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('hit-testing', () => {
  it('is true inside and on every edge', () => {
    expect(hitTest(CANVAS, 250, 400)).toBe(true);
    expect(hitTest(CANVAS, 100, 200)).toBe(true);
    expect(hitTest(CANVAS, 400, 600)).toBe(true);
  });

  it('is false a pixel outside any edge', () => {
    expect(hitTest(CANVAS, 99, 400)).toBe(false);
    expect(hitTest(CANVAS, 401, 400)).toBe(false);
    expect(hitTest(CANVAS, 250, 199)).toBe(false);
    expect(hitTest(CANVAS, 250, 601)).toBe(false);
  });

  it('never hits a box that has not been measured', () => {
    // Which is what stops a drag before layout from throwing.
    expect(hitTest(null, 250, 400)).toBe(false);
  });
});

describe('turning a window point into fractions', () => {
  it('round-trips a point well inside the picture', () => {
    const p = normalise(100 + 0.4 * 300, 200 + 0.7 * 400, CANVAS, SIZE);
    expect(p.x).toBeCloseTo(0.4);
    expect(p.y).toBeCloseTo(0.7);
  });
});

describe('what a drag out of the tray meant', () => {
  it('places it where the finger was', () => {
    const drop = resolveTrayDrop({
      x: 100 + 0.5 * 300,
      y: 200 + 0.25 * 400,
      travelled: 200,
      canvas: CANVAS,
      stickerSize: SIZE,
    });
    expect(drop.kind).toBe('canvas');
    if (drop.kind === 'canvas') {
      expect(drop.x).toBeCloseTo(0.5);
      expect(drop.y).toBeCloseTo(0.25);
    }
  });

  it('pulls a drop in the very corner far enough in to be seen', () => {
    const drop = resolveTrayDrop({
      x: 100,
      y: 200,
      travelled: 200,
      canvas: CANVAS,
      stickerSize: SIZE,
    });
    expect(drop.kind === 'canvas' && drop.x > 0).toBe(true);
  });

  it('drops one in the middle when the finger barely moved', () => {
    // She held a sticker, meant to let go, and her hand shifted. That has to
    // put a sticker on the picture rather than do nothing at all.
    expect(
      resolveTrayDrop({ x: 40, y: 300, travelled: 3, canvas: CANVAS, stickerSize: SIZE }).kind,
    ).toBe('middle');
  });

  it('does nothing for a long drag that ended off the picture', () => {
    expect(
      resolveTrayDrop({ x: 250, y: 40, travelled: 300, canvas: CANVAS, stickerSize: SIZE }).kind,
    ).toBe('nothing');
  });

  it('does not throw before the picture has been measured', () => {
    expect(
      resolveTrayDrop({ x: 250, y: 400, travelled: 300, canvas: null, stickerSize: SIZE }).kind,
    ).toBe('nothing');
  });
});

describe('what a drag of a placed sticker meant', () => {
  const fallback = { x: 0.2, y: 0.2 };
  const args = { canvas: CANVAS, tray: TRAY, stickerSize: SIZE, fallback };

  it('takes it off the picture when it is dropped on the tray', () => {
    expect(resolvePlacedDrop({ ...args, x: 40, y: 300 })).toEqual({ kind: 'remove' });
  });

  it('moves it when it is dropped on the picture', () => {
    const drop = resolvePlacedDrop({ ...args, x: 100 + 0.6 * 300, y: 200 + 0.6 * 400 });
    expect(drop.kind).toBe('move');
    if (drop.kind === 'move') expect(drop.x).toBeCloseTo(0.6);
  });

  it('puts it back where it was when it is dropped on neither, never removing it', () => {
    // The rule that makes the tray safe to aim at: everywhere that is not the
    // bin is "put it back", so an overshoot she did not mean costs nothing.
    expect(resolvePlacedDrop({ ...args, x: 250, y: 40 })).toEqual({ kind: 'move', ...fallback });
    expect(resolvePlacedDrop({ ...args, x: 250, y: 900 })).toEqual({ kind: 'move', ...fallback });
  });
});
