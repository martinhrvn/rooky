/**
 * The pure half of the home shelf: how toys are laid out on planks.
 *
 * Kept apart from `Shelf.tsx` so it is tested without React, the same split
 * `grownUpGate.ts` and `canvasGeometry.ts` make.
 */

/**
 * Toys on one plank.
 *
 * Three is what a phone holds at a size a four-year-old can hit: each toy gets
 * a third of the width, roughly 100pt. A fourth starts a second plank rather
 * than shrinking the first three — shrinking would quietly make every toy
 * harder to hit the moment one is added.
 */
export const PER_PLANK = 3;

/** Toys split into planks, top plank first, never an empty plank. */
export function planks<T>(toys: readonly T[], perPlank: number = PER_PLANK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < toys.length; i += perPlank) out.push(toys.slice(i, i + perPlank));
  return out;
}
