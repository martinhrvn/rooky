import { describe, expect, it } from 'vitest';

import { move, nextPlacementKey, place, remove, setBackground, transform } from './canvas';
import { type CanvasState, emptyCanvas } from './schema';

const withTwo = (): CanvasState => place(place(emptyCanvas, '1F438', 0.2, 0.3), '1F98A', 0.7, 0.8);

describe('naming a placement', () => {
  it('starts at s1 on an empty picture', () => {
    expect(nextPlacementKey([])).toBe('s1');
  });

  it('never hands back a key that is already there', () => {
    // The whole point of deriving it rather than counting: a canvas that has
    // had things removed from it still cannot collide.
    let state = emptyCanvas;
    for (let i = 0; i < 20; i++) state = place(state, '1F438', 0.5, 0.5);
    state = remove(remove(state, 's3'), 's11');

    const keys = new Set(state.placements.map((p) => p.key));
    expect(keys.has(nextPlacementKey(state.placements))).toBe(false);
  });

  it('steps past a gap rather than filling it', () => {
    expect(nextPlacementKey([placement('s1'), placement('s3')])).toBe('s4');
  });

  it('ignores a key it does not recognise', () => {
    expect(nextPlacementKey([placement('legacy'), placement('s2')])).toBe('s3');
  });
});

describe('sticking one on', () => {
  it('records where it went', () => {
    const [first] = place(emptyCanvas, '1F438', 0.25, 0.75).placements;
    expect(first).toMatchObject({ stickerId: '1F438', x: 0.25, y: 0.75, scale: 1, rotation: 0 });
  });

  it('allows the same sticker any number of times', () => {
    // Unlimited copies is a promise, not an accident: she can cover the canvas
    // in twenty-five knights, and one-sticker-one-placement would only invent
    // "I lost my sticker".
    const twice = place(place(emptyCanvas, '1F438', 0.1, 0.1), '1F438', 0.9, 0.9);
    expect(twice.placements).toHaveLength(2);
    expect(twice.placements[0].key).not.toBe(twice.placements[1].key);
  });

  it('leaves everything already there in order', () => {
    const three = place(withTwo(), '1F680', 0.5, 0.5);
    expect(three.placements.map((p) => p.stickerId)).toEqual(['1F438', '1F98A', '1F680']);
  });
});

describe('moving one', () => {
  it('keeps its key and its sticker', () => {
    const moved = move(withTwo(), 's1', 0.4, 0.4);
    const found = moved.placements.find((p) => p.key === 's1');
    expect(found).toMatchObject({ stickerId: '1F438', x: 0.4, y: 0.4 });
  });

  it('sends it to the end, which is what puts it on top', () => {
    const moved = move(withTwo(), 's1', 0.4, 0.4);
    expect(moved.placements.map((p) => p.key)).toEqual(['s2', 's1']);
  });

  it('changes nothing at all for a key that is not there', () => {
    // The same object back, not an equal one: zustand compares by reference,
    // and a fresh object for a no-op re-renders the canvas mid-gesture.
    const before = withTwo();
    expect(move(before, 's99', 0.1, 0.1)).toBe(before);
  });
});

describe('pinching and turning one', () => {
  it('keeps the size and the angle she left it at', () => {
    const after = transform(withTwo(), 's1', 1.8, -14, 0.3, 0.3);
    expect(after.placements.find((p) => p.key === 's1')).toMatchObject({
      scale: 1.8,
      rotation: -14,
      x: 0.3,
      y: 0.3,
    });
  });

  it('sends it to the top, because pinching is touching', () => {
    // The same z-order rule as moving rather than a second one.
    expect(transform(withTwo(), 's1', 1.5, 0, 0.2, 0.3).placements.map((p) => p.key)).toEqual([
      's2',
      's1',
    ]);
  });

  it('changes nothing when nothing changed', () => {
    // Pinch and rotation both commit on their own end, so the second of the
    // two arrives with the values the first already stored.
    const before = transform(withTwo(), 's1', 1.5, 20, 0.2, 0.3);
    expect(transform(before, 's1', 1.5, 20, 0.2, 0.3)).toBe(before);
  });

  it('changes nothing for a key that is not there', () => {
    const before = withTwo();
    expect(transform(before, 's99', 2, 0, 0.5, 0.5)).toBe(before);
  });
});

describe('taking one off', () => {
  it('removes exactly that placement and leaves the rest in order', () => {
    const three = place(withTwo(), '1F680', 0.5, 0.5);
    expect(remove(three, 's2').placements.map((p) => p.key)).toEqual(['s1', 's3']);
  });

  it('changes nothing for a key that is not there', () => {
    const before = withTwo();
    expect(remove(before, 's99')).toBe(before);
  });
});

describe('changing the ground', () => {
  it('leaves the placements reference-identical', () => {
    const before = withTwo();
    const after = setBackground(before, 'night');
    expect(after.backgroundId).toBe('night');
    expect(after.placements).toBe(before.placements);
  });

  it('changes nothing when it is already that one', () => {
    const before = withTwo();
    expect(setBackground(before, before.backgroundId)).toBe(before);
  });
});

const placement = (key: string) => ({
  key,
  stickerId: '1F438',
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
});
