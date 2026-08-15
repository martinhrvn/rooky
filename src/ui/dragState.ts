import { useCallback } from 'react';
import Animated, {
  type AnimatedRef,
  type MeasuredDimensions,
  type SharedValue,
  measure,
  useAnimatedRef,
  useSharedValue,
} from 'react-native-reanimated';

import { FIT, type Rect, type Size, type Viewport } from './canvasGeometry';

/**
 * What is currently in the air.
 *
 * **React state, not a shared value** — and that split is the whole reason the
 * drag does not flicker. Whether a sticker is held decides two things that
 * must change in the same breath: the ghost disappearing and the placement
 * re-appearing where she left it. Driven from the UI thread those land on
 * different frames, and she sees the sticker snap back to where it started
 * before jumping to where she put it. Cleared in the same JS tick as the store
 * write, React renders both at once and nothing moves twice.
 *
 * Only the *position* stays on the UI thread, in `DragState` below, because
 * that is the part that has to keep up with a finger.
 */
export interface Held {
  readonly stickerId: string;
  /** The size it is drawn at — its base size times its own scale. */
  readonly size: number;
  readonly rotation: number;
  /**
   * The placement being moved, or `''` when it came out of the tray.
   *
   * This is what says whether the tray is a bin right now: a sticker on its
   * way *out* of the tray must not be deletable by letting go where it started.
   */
  readonly fromKey: string;
}

/** The parts of a drag that have to keep up with the finger. */
export interface DragState {
  /** The finger, in window coordinates. */
  readonly x: SharedValue<number>;
  readonly y: SharedValue<number>;
  /** 1 while a placed sticker is over the tray. */
  readonly overTray: SharedValue<number>;
}

export function useDragState(): DragState {
  return {
    x: useSharedValue(0),
    y: useSharedValue(0),
    overTray: useSharedValue(0),
  };
}

/**
 * Where the pieces of the screen are, in window coordinates.
 *
 * Refreshed by a `measure()` worklet at the start of every drag rather than
 * kept up to date by layout: a rect read once is stale after a scroll, a
 * rotation or a keyboard, and a stale rect means a sticker lands somewhere she
 * did not put it.
 */
export interface CanvasRects {
  /** Attach these to the three views whose frames the drop rules ask about. */
  readonly canvasRef: AnimatedRef<Animated.View>;
  readonly trayRef: AnimatedRef<Animated.View>;
  readonly hostRef: AnimatedRef<Animated.View>;

  readonly canvas: SharedValue<Rect | null>;
  readonly tray: SharedValue<Rect | null>;
  /** The screen's own frame, so the ghost can be positioned relative to it. */
  readonly host: SharedValue<Rect | null>;
  /** The fitted canvas box. Comes from layout, not from `measure`. */
  readonly box: SharedValue<Size>;
  /**
   * How she is looking at the picture. Lives here beside the frames because
   * every drop has to undo it, and the tray needs it as much as the canvas
   * does. Deliberately not persisted — see `Viewport`.
   */
  readonly view: SharedValue<Viewport>;

  /**
   * Re-reads all three frames. A **worklet** — `measure()` only works on the
   * UI thread, so this is called from `onStart`, never from a React handler.
   */
  readonly sync: () => void;
}

export function useCanvasRects(): CanvasRects {
  const canvasRef = useAnimatedRef<Animated.View>();
  const trayRef = useAnimatedRef<Animated.View>();
  const hostRef = useAnimatedRef<Animated.View>();

  const canvas = useSharedValue<Rect | null>(null);
  const tray = useSharedValue<Rect | null>(null);
  const host = useSharedValue<Rect | null>(null);
  const box = useSharedValue<Size>({ width: 0, height: 0 });
  const view = useSharedValue<Viewport>(FIT);

  const sync = useCallback(() => {
    'worklet';
    // `measure` returns null for a view that is not laid out yet, and every
    // consumer of these rects treats null as "never hit" rather than throwing.
    // `pageX/pageY`, never `x/y`: the latter are parent-relative, and a drop
    // point arrives from the gesture in window coordinates.
    const toRect = (m: MeasuredDimensions | null): Rect | null =>
      m === null ? null : { x: m.pageX, y: m.pageY, width: m.width, height: m.height };
    canvas.value = toRect(measure(canvasRef));
    tray.value = toRect(measure(trayRef));
    host.value = toRect(measure(hostRef));
  }, [canvasRef, trayRef, hostRef, canvas, tray, host]);

  return { canvasRef, trayRef, hostRef, canvas, tray, host, box, view, sync };
}
