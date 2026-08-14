import type { CanvasState, Placement } from './schema';

/**
 * Editing her picture.
 *
 * Pure, like `selectors.ts` and for the same reason: the store action is then
 * one line, and everything that could actually go wrong — a duplicate key, a
 * placement lost on a move, `album` shortened by a removal — is covered by
 * vitest rather than by looking at the screen.
 *
 * Every function returns the **same object** when it changes nothing. Zustand
 * v5 compares by reference, so a fresh object for a no-op re-renders the canvas
 * under whatever gesture is in flight.
 */

/**
 * The next free placement key.
 *
 * Deliberately not `Math.random` or `Date.now`: this stays pure, so a test can
 * assert it never collides — and it cannot, because `s7` is only returned once
 * nothing already claims a number that high. Reusing a number freed by a
 * removal is harmless; nothing animates on placement identity.
 */
export function nextPlacementKey(placements: readonly Placement[]): string {
  let max = 0;
  for (const placement of placements) {
    if (placement.key[0] !== 's') continue;
    const n = Number(placement.key.slice(1));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `s${max + 1}`;
}

/**
 * Sticks a sticker on.
 *
 * Consults nothing about what is already there, which is the whole of
 * **unlimited copies**: owning a sticker means placing it as many times as she
 * likes. One-sticker-one-placement would only invent "I lost my sticker".
 */
export function place(
  state: CanvasState,
  stickerId: string,
  x: number,
  y: number,
): CanvasState {
  return {
    ...state,
    placements: [
      ...state.placements,
      { key: nextPlacementKey(state.placements), stickerId, x, y, scale: 1, rotation: 0 },
    ],
  };
}

/** Moves one, and sends it to the end — the last one touched is on top. */
export function move(state: CanvasState, key: string, x: number, y: number): CanvasState {
  const found = state.placements.find((p) => p.key === key);
  if (!found) return state;
  return {
    ...state,
    placements: [...state.placements.filter((p) => p.key !== key), { ...found, x, y }],
  };
}

/**
 * Resizes and turns one, and — like `move` — sends it to the end.
 *
 * Pinching is touching, so it obeys the same z-order rule rather than a second
 * one: whichever she last had her hands on is the one on top.
 *
 * Position comes in alongside, because growing a sticker near an edge has to
 * pull it back onto the picture, and only the screen knows how big the picture
 * is.
 */
export function transform(
  state: CanvasState,
  key: string,
  scale: number,
  rotation: number,
  x: number,
  y: number,
): CanvasState {
  const found = state.placements.find((p) => p.key === key);
  if (!found) return state;
  if (
    found.scale === scale &&
    found.rotation === rotation &&
    found.x === x &&
    found.y === y
  ) {
    return state;
  }
  return {
    ...state,
    placements: [
      ...state.placements.filter((p) => p.key !== key),
      { ...found, scale, rotation, x, y },
    ],
  };
}

/**
 * Takes one off the picture.
 *
 * **Nothing here touches `album`.** Peeling a sticker off costs her the
 * placement and never the sticker, which is the entire promise that makes the
 * tray safe to use as a bin.
 */
export function remove(state: CanvasState, key: string): CanvasState {
  const placements = state.placements.filter((p) => p.key !== key);
  return placements.length === state.placements.length ? state : { ...state, placements };
}

/** Changes the ground. Leaves the placements array reference-identical. */
export function setBackground(state: CanvasState, backgroundId: string): CanvasState {
  return backgroundId === state.backgroundId ? state : { ...state, backgroundId };
}
