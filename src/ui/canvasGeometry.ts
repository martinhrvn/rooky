/**
 * The maths behind the sticker canvas: where a picture sits, where a finger
 * dropped something, and what that means.
 *
 * No JSX and no React, so vitest imports it directly — and every function is
 * `'worklet'`-marked, so the *same* code decides a drop on the UI thread inside
 * a gesture and in a node test. A drop rule that only exists inside a gesture
 * callback is a drop rule nothing can check.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A box in window coordinates, as `measure()` reports it. */
export interface Rect extends Size {
  readonly x: number;
  readonly y: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * The picture is always this shape — fixed, never fitted to the device.
 *
 * Without it, a sun she put in the top-right corner on a phone is somewhere
 * else on a tablet, and the composition she made is not the one she gets back.
 * 3:4 is a portrait photograph: tall enough to use the column the tray leaves,
 * familiar enough to read as a picture rather than a strip.
 */
export const CANVAS_ASPECT = 3 / 4;

/**
 * A sticker's size as a fraction of the canvas **width**, never a constant in
 * points. The other half of "the same picture everywhere": 48pt is a third of
 * a phone canvas and a tenth of a tablet one.
 */
export const STICKER_FRACTION = 0.18;

/**
 * How far a sticker may be pinched.
 *
 * Both ends matter. Below the floor it is a speck she cannot get hold of
 * again; above the ceiling one sticker covers the picture and everything under
 * it becomes unreachable — and there is no "send to back" she could use to dig
 * anything out.
 */
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.5;

export function clampScale(scale: number): number {
  'worklet';
  // Not `Math.min(Math.max())` alone: a pinch that produces NaN (two fingers
  // landing on the same point) would otherwise be stored and never recover.
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * How far a drag may travel and still count as a tap.
 *
 * Generous on purpose. She holds a sticker, means to let go, and her hand
 * moves — that has to place one in the middle rather than do nothing at all.
 */
export const TAP_SLOP = 12;

/** The largest box of `aspect` that fits. Letterboxes rather than distorts. */
export function fitCanvas(available: Size, aspect: number = CANVAS_ASPECT): Size {
  'worklet';
  const width = Math.max(0, Math.min(available.width, available.height * aspect));
  return { width, height: width / aspect };
}

/** How big a sticker is drawn on a canvas of this size. */
export function stickerSizeFor(box: Size, scale = 1): number {
  'worklet';
  return box.width * STICKER_FRACTION * scale;
}

/** Whether the point is inside. A box that has not been measured is never hit. */
export function hitTest(rect: Rect | null, x: number, y: number): boolean {
  'worklet';
  return (
    rect !== null &&
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

/**
 * Pulls a centre far enough from the edge that the **whole** sticker stays on
 * the picture.
 *
 * Half-off-the-edge would look better and is the wrong trade at four: a
 * sticker that is mostly gone reads as a sticker she lost, and there is
 * nothing on screen to say it is still there.
 */
export function clampPlacement(point: Point, box: Size, stickerSize: number): Point {
  'worklet';
  // A box of zero (before layout) or a sticker wider than the canvas would
  // otherwise invert the range and hand back NaN.
  const mx = box.width > 0 ? Math.min(0.5, stickerSize / 2 / box.width) : 0.5;
  const my = box.height > 0 ? Math.min(0.5, stickerSize / 2 / box.height) : 0.5;
  return {
    x: Math.min(1 - mx, Math.max(mx, point.x)),
    y: Math.min(1 - my, Math.max(my, point.y)),
  };
}

/** A window point as clamped fractions of the canvas it landed on. */
export function normalise(x: number, y: number, canvas: Rect, stickerSize: number): Point {
  'worklet';
  return clampPlacement(
    { x: (x - canvas.x) / canvas.width, y: (y - canvas.y) / canvas.height },
    canvas,
    stickerSize,
  );
}

/** The exact middle, where a tap drops one. */
export const MIDDLE: Point = { x: 0.5, y: 0.5 };

/** What a drag that started in the tray meant, where it ended. */
export type TrayDrop =
  | { readonly kind: 'canvas'; readonly x: number; readonly y: number }
  | { readonly kind: 'middle' }
  | { readonly kind: 'nothing' };

export function resolveTrayDrop(args: {
  readonly x: number;
  readonly y: number;
  readonly travelled: number;
  readonly canvas: Rect | null;
  readonly stickerSize: number;
}): TrayDrop {
  'worklet';
  if (hitTest(args.canvas, args.x, args.y)) {
    const p = normalise(args.x, args.y, args.canvas as Rect, args.stickerSize);
    return { kind: 'canvas', x: p.x, y: p.y };
  }
  // A gesture that barely moved is a tap, wherever the long-press timer
  // happened to fire. Without this, holding a sticker and letting go where you
  // picked it up is a null event, which reads as the app ignoring her.
  if (args.travelled < TAP_SLOP) return { kind: 'middle' };
  return { kind: 'nothing' };
}

/** What a drag of an already-placed sticker meant. */
export type PlacedDrop =
  | { readonly kind: 'move'; readonly x: number; readonly y: number }
  | { readonly kind: 'remove' };

/**
 * A placement only comes off when it is dropped **on the tray**.
 *
 * Dropped on the header, the swatches, or the plum around the picture, it goes
 * back on, clamped to the nearest legal spot. Losing a sticker takes a
 * deliberate aim at a target — which is "nothing by accident" applied to a
 * gesture rather than to a button.
 */
export function resolvePlacedDrop(args: {
  readonly x: number;
  readonly y: number;
  readonly canvas: Rect | null;
  readonly tray: Rect | null;
  readonly stickerSize: number;
  readonly fallback: Point;
}): PlacedDrop {
  'worklet';
  if (hitTest(args.tray, args.x, args.y)) return { kind: 'remove' };
  if (hitTest(args.canvas, args.x, args.y)) {
    const p = normalise(args.x, args.y, args.canvas as Rect, args.stickerSize);
    return { kind: 'move', x: p.x, y: p.y };
  }
  return { kind: 'move', x: args.fallback.x, y: args.fallback.y };
}
