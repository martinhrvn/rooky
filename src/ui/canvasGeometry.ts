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

/**
 * How the picture is being looked at: magnified by `zoom`, shifted by `pan`.
 *
 * **Never persisted.** Every visit opens at `FIT`, which is the whole safety
 * net for a zoom she cannot read her way out of — the worst state she can
 * reach is one screen away from being forgotten, and pinching back out fixes
 * it in the meantime.
 */
export interface Viewport {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

/** The whole picture, filling its frame. */
export const FIT: Viewport = { zoom: 1, panX: 0, panY: 0 };

/**
 * Three is as far in as it goes, and one is as far out.
 *
 * Zooming *out* past fit is what would let her lose the picture — a small
 * square adrift in a big dark frame, with nothing on screen saying which way
 * to go. So the picture always fills its frame, and the pan is clamped to
 * match.
 */
export const MAX_ZOOM = 3;

const between = (v: number, lo: number, hi: number) => {
  'worklet';
  // The `+ 0` is not decoration: `Math.max(-0, -90)` is `-0`, which compares
  // equal to zero but is a different value once it has been through JSON — so
  // without it a picture at fit can be saved holding a negative nothing.
  return Math.min(hi, Math.max(lo, v)) + 0;
};

/**
 * The nearest viewport that still covers the frame.
 *
 * The pan range falls straight out of the zoom: at `1` it is zero, so a
 * picture at fit cannot be nudged off-centre at all, and there is no way to
 * end up looking at nothing.
 */
export function clampViewport(view: Viewport, box: Size): Viewport {
  'worklet';
  const zoom = Number.isFinite(view.zoom) ? between(view.zoom, 1, MAX_ZOOM) : 1;
  const spanX = (box.width * (zoom - 1)) / 2;
  const spanY = (box.height * (zoom - 1)) / 2;
  return {
    zoom,
    panX: Number.isFinite(view.panX) ? between(view.panX, -spanX, spanX) : 0,
    panY: Number.isFinite(view.panY) ? between(view.panY, -spanY, spanY) : 0,
  };
}

/**
 * Zooms to `nextZoom` keeping whatever is under her fingers under her fingers.
 *
 * Zooming about the centre instead is a third of the code and feels broken the
 * moment she pinches a corner: the thing she was looking at slides away from
 * her while she is holding it.
 *
 * `focal` is relative to the canvas's own top-left, which is what RNGH's
 * `focalX/focalY` already report.
 */
export function zoomAbout(
  from: Viewport,
  focal: Point,
  nextZoom: number,
  box: Size,
): Viewport {
  'worklet';
  const zoom = Number.isFinite(nextZoom) ? between(nextZoom, 1, MAX_ZOOM) : 1;
  const cx = box.width / 2;
  const cy = box.height / 2;
  // The view scales about its own centre, so holding a point still means
  // moving the pan by however much that point would otherwise have travelled.
  const k = zoom / from.zoom;
  return clampViewport(
    {
      zoom,
      panX: focal.x - cx - k * (focal.x - cx - from.panX),
      panY: focal.y - cy - k * (focal.y - cy - from.panY),
    },
    box,
  );
}

/**
 * A window point as clamped fractions of the picture underneath it.
 *
 * The viewport has to be undone here, and this is the one place it is: a
 * placement is stored against the *picture*, not against however she happened
 * to be looking at it when she let go.
 */
export function normalise(
  x: number,
  y: number,
  canvas: Rect,
  stickerSize: number,
  view: Viewport = FIT,
): Point {
  'worklet';
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const localX = cx + (x - canvas.x - cx - view.panX) / view.zoom;
  const localY = cy + (y - canvas.y - cy - view.panY) / view.zoom;
  return clampPlacement(
    { x: localX / canvas.width, y: localY / canvas.height },
    canvas,
    stickerSize,
  );
}

/**
 * The middle of what she can *see*, where a tap drops one.
 *
 * Not the middle of the picture: zoomed into a corner, a sticker landing in
 * the true centre lands somewhere off screen, which reads as the tap having
 * done nothing.
 */
export function visibleCentre(box: Size, view: Viewport = FIT): Point {
  'worklet';
  if (box.width <= 0 || box.height <= 0) return { x: 0.5, y: 0.5 };
  return {
    x: 0.5 - view.panX / (view.zoom * box.width),
    y: 0.5 - view.panY / (view.zoom * box.height),
  };
}

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
  /** In picture points, so it is the same number however she is looking. */
  readonly stickerSize: number;
  readonly view: Viewport;
}): TrayDrop {
  'worklet';
  if (hitTest(args.canvas, args.x, args.y)) {
    const p = normalise(args.x, args.y, args.canvas as Rect, args.stickerSize, args.view);
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
  readonly view: Viewport;
}): PlacedDrop {
  'worklet';
  if (hitTest(args.tray, args.x, args.y)) return { kind: 'remove' };
  if (hitTest(args.canvas, args.x, args.y)) {
    const p = normalise(args.x, args.y, args.canvas as Rect, args.stickerSize, args.view);
    return { kind: 'move', x: p.x, y: p.y };
  }
  return { kind: 'move', x: args.fallback.x, y: args.fallback.y };
}
