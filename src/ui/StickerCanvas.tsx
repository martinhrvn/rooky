import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { stickerById } from '../content/stickers';
import type { Placement } from '../progress/schema';
import { StickerArt } from './StickerArt';
import { CanvasGround } from './canvasBackgrounds';
import {
  type Size,
  clampPlacement,
  clampScale,
  clampViewport,
  hitTest,
  resolvePlacedDrop,
  stickerSizeFor,
  zoomAbout,
} from './canvasGeometry';
import type { CanvasRects, DragState } from './dragState';
import { strings } from './strings';
import { colors, layout } from './theme';

/** How far outside a sticker its ring sits. */
const RING_INSET = 4;

interface CanvasProps {
  /** The fitted box. Nothing draws until this has a width. */
  readonly box: Size;
  readonly backgroundId: string;
  readonly placements: readonly Placement[];
  readonly drag: DragState;
  readonly rects: CanvasRects;
  /** The placement currently in the air, or `''`. */
  readonly heldKey: string;
  /** The one with the ring around it, or `''`. */
  readonly selectedKey: string;
  readonly onSelect: (key: string) => void;
  readonly onLift: (stickerId: string, size: number, rotation: number, key: string) => void;
  readonly onMove: (key: string, x: number, y: number) => void;
  readonly onRemove: (key: string) => void;
  readonly onTransform: (
    key: string,
    scale: number,
    rotation: number,
    x: number,
    y: number,
  ) => void;
  readonly onCancel: () => void;
}

/**
 * The picture.
 *
 * A bright surface on the app's dark chrome, which is the one place besides
 * the board where that is allowed — a canvas is the thing being looked at, so
 * it is lit like the board is, and everything around it stays plum.
 *
 * Placements are drawn in array order, so the last one is on top. Nothing here
 * decides that: `canvas.ts` moves a placement to the end when it is touched,
 * and "the one you touched last is on top" needs no control to say it.
 *
 * **Pinch and rotate live here, not on the stickers.** A gesture attached to a
 * sticker only receives fingers that land inside it, and a sticker is smaller
 * than the gap between two adult fingertips — so a pinch on one could never
 * start. Up here both fingers land wherever is comfortable and the ring says
 * which sticker they are talking to.
 */
export function StickerCanvas({
  box,
  backgroundId,
  placements,
  drag,
  rects,
  heldKey,
  selectedKey,
  onSelect,
  onTransform,
  ...forPlaced
}: CanvasProps) {
  const selected = placements.find((p) => p.key === selectedKey) ?? null;
  const base = stickerSizeFor(box);

  // One live transform for the whole canvas rather than a pair per sticker:
  // only ever one thing is being pinched, and the gesture doing the pinching
  // lives up here.
  const liveKey = useSharedValue('');
  const liveScale = useSharedValue(1);
  const liveRotation = useSharedValue(0);
  const from = useSharedValue({ scale: 1, rotation: 0 });
  const viewFrom = useSharedValue({ zoom: 1, panX: 0, panY: 0 });

  const gesture = useMemo(() => {
    /** Grabs whatever the two fingers are about to change. */
    const begin = () => {
      'worklet';
      viewFrom.value = rects.view.value;
      if (selected === null) return;
      liveKey.value = selected.key;
      liveScale.value = selected.scale;
      liveRotation.value = selected.rotation;
      from.value = { scale: selected.scale, rotation: selected.rotation };
    };

    /**
     * Writes the size and angle she settled on.
     *
     * `liveKey` is deliberately **not** cleared here. Once the store has the
     * same numbers the live values hold, the two agree and there is nothing to
     * clear — whereas clearing it from the UI thread would snap the sticker
     * back to its old size for the frame before React catches up, which is the
     * same flicker the drag had.
     */
    const commit = () => {
      'worklet';
      if (selected === null) return;
      const there = clampPlacement(
        { x: selected.x, y: selected.y },
        box,
        base * liveScale.value,
      );
      scheduleOnRN(
        onTransform,
        selected.key,
        liveScale.value,
        liveRotation.value,
        there.x,
        there.y,
      );
    };

    const pinch = Gesture.Pinch()
      .onStart(begin)
      .onUpdate((e) => {
        if (selected !== null) {
          liveScale.value = clampScale(from.value.scale * e.scale);
          return;
        }
        // Nothing selected, so the fingers are talking to the whole picture.
        rects.view.value = zoomAbout(
          viewFrom.value,
          { x: e.focalX, y: e.focalY },
          viewFrom.value.zoom * e.scale,
          box,
        );
      })
      .onEnd(commit);

    // Turning the whole picture is a step too far — it would leave her looking
    // at a crooked frame with no way to say "put it back". So this one only
    // ever acts on a selected sticker.
    const turn = Gesture.Rotation()
      .onStart(begin)
      .onUpdate((e) => {
        if (selected === null) return;
        liveRotation.value = from.value.rotation + (e.rotation * 180) / Math.PI;
      })
      .onEnd(commit);

    return Gesture.Simultaneous(pinch, turn);
  }, [selected, box, base, rects, liveKey, liveScale, liveRotation, from, viewFrom, onTransform]);

  // The whole picture moves under the viewport: the ground, every sticker and
  // every ring together, so nothing drifts out of register when she zooms.
  const viewStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: rects.view.value.panX },
      { translateY: rects.view.value.panY },
      { scale: rects.view.value.zoom },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={rects.canvasRef}
        accessibilityLabel={strings.stickers.canvas.area}
        style={[styles.canvas, { width: box.width, height: box.height }]}
      >
        {box.width > 0 ? (
          <Animated.View style={[styles.content, viewStyle]}>
            <CanvasGround id={backgroundId} width={box.width} height={box.height} />

            {/* Under every sticker, so a tap only reaches it when it landed on
                nothing — which is what makes "tap away to deselect" work with
                no gesture relations to declare. It carries the one-finger pan
                for the same reason. */}
            <CanvasBackdrop rects={rects} box={box} onSelect={onSelect} />

            {placements.map((placement) => (
              <PlacedSticker
                key={placement.key}
                placement={placement}
                box={box}
                base={base}
                drag={drag}
                rects={rects}
                held={heldKey === placement.key}
                selected={selectedKey === placement.key}
                live={{ key: liveKey, scale: liveScale, rotation: liveRotation }}
                onSelect={onSelect}
                {...forPlaced}
              />
            ))}
          </Animated.View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * The picture itself, as a thing that can be touched.
 *
 * A tap here means "none of them", and a drag means "move the picture" — which
 * does nothing at all until she has zoomed in, because `clampViewport` pins
 * the pan to zero at fit. That is deliberate: there is no mode to be in and
 * nothing to learn, the picture simply stops sliding when there is nothing
 * off screen to slide to.
 */
function CanvasBackdrop({
  rects,
  box,
  onSelect,
}: {
  rects: CanvasRects;
  box: Size;
  onSelect: (key: string) => void;
}) {
  const from = useSharedValue({ zoom: 1, panX: 0, panY: 0 });

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(6)
      .maxPointers(1)
      .onStart(() => {
        from.value = rects.view.value;
      })
      .onUpdate((e) => {
        // A plain screen-space offset, not one divided by the zoom: the
        // translate is applied *outside* the scale in the transform below, so
        // a finger travelling ten points moves the picture ten points however
        // far in she is.
        rects.view.value = clampViewport(
          {
            zoom: from.value.zoom,
            panX: from.value.panX + e.translationX,
            panY: from.value.panY + e.translationY,
          },
          box,
        );
      });

    const tap = Gesture.Tap()
      .maxDistance(8)
      .onEnd((_e, ok) => {
        if (ok) scheduleOnRN(onSelect, '');
      });

    return Gesture.Exclusive(pan, tap);
  }, [box, rects, from, onSelect]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={StyleSheet.absoluteFill} />
    </GestureDetector>
  );
}

function PlacedSticker({
  placement,
  box,
  base,
  drag,
  rects,
  held,
  selected,
  live,
  onSelect,
  onLift,
  onMove,
  onRemove,
  onCancel,
}: {
  placement: Placement;
  box: Size;
  base: number;
  drag: DragState;
  rects: CanvasRects;
  held: boolean;
  selected: boolean;
  live: {
    key: SharedValue<string>;
    scale: SharedValue<number>;
    rotation: SharedValue<number>;
  };
  onSelect: (key: string) => void;
  onLift: (stickerId: string, size: number, rotation: number, key: string) => void;
  onMove: (key: string, x: number, y: number) => void;
  onRemove: (key: string) => void;
  onCancel: () => void;
}) {
  // The drawn box ignores her scale — all of it lives in the transform below,
  // which keeps the touch target the same size however small she pinches a
  // sticker, and keeps a scaled sticker centred on the point it is stored at.
  const size = base * placement.scale;

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      // No hold — nothing scrolls under the picture, so a sticker lifts as
      // soon as she moves it. A small distance rather than none, so that a
      // finger landing on a sticker on its way to a two-fingered pinch does
      // not pick the sticker up and put it down again.
      .minDistance(6)
      // One finger only: a second finger belongs to the canvas's pinch.
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .hitSlop({ top: 10, bottom: 10, left: 10, right: 10 })
      .onStart((e) => {
        rects.sync();
        drag.x.value = e.absoluteX;
        drag.y.value = e.absoluteY;
        scheduleOnRN(onSelect, placement.key);
        // The ghost is drawn at the size it looks on screen, which is the size
        // it is *plus* however far she has zoomed in.
        scheduleOnRN(
          onLift,
          placement.stickerId,
          size * rects.view.value.zoom,
          placement.rotation,
          placement.key,
        );
        scheduleOnRN(tick);
      })
      .onUpdate((e) => {
        drag.x.value = e.absoluteX;
        drag.y.value = e.absoluteY;
        const over = hitTest(rects.tray.value, e.absoluteX, e.absoluteY) ? 1 : 0;
        if (over !== drag.overTray.value) {
          drag.overTray.value = over;
          // A tick on the way in, so the bin announces itself before she lets
          // go rather than after.
          if (over === 1) scheduleOnRN(tick);
        }
      })
      .onEnd((e) => {
        const drop = resolvePlacedDrop({
          x: e.absoluteX,
          y: e.absoluteY,
          canvas: rects.canvas.value,
          tray: rects.tray.value,
          stickerSize: size,
          fallback: { x: placement.x, y: placement.y },
          view: rects.view.value,
        });
        // The only write of the whole gesture, and it clears the held sticker
        // in the same JS tick — that is what stops the placement flashing back
        // to where it started before it appears where she put it.
        if (drop.kind === 'remove') scheduleOnRN(onRemove, placement.key);
        else scheduleOnRN(onMove, placement.key, drop.x, drop.y);
      })
      // A gesture that is cancelled never ends, and one that skipped this
      // would leave the ghost stranded on screen.
      .onFinalize(() => {
        drag.overTray.value = 0;
        scheduleOnRN(onCancel);
      });

    // Picking one out to work on it, without moving it a hair.
    const tap = Gesture.Tap()
      .maxDistance(8)
      .onEnd((_e, ok) => {
        if (ok) scheduleOnRN(onSelect, placement.key);
      });

    return Gesture.Exclusive(pan, tap);
  }, [placement, size, drag, rects, onSelect, onLift, onMove, onRemove, onCancel]);

  const transform = useAnimatedStyle(() => {
    const mine = live.key.value === placement.key;
    return {
      transform: [
        { scale: (mine ? live.scale.value : placement.scale) / placement.scale },
        { rotate: `${mine ? live.rotation.value : placement.rotation}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityRole="image"
        accessibilityState={{ selected }}
        accessibilityLabel={strings.stickers.canvas.placed(stickerById(placement.stickerId).name)}
        style={[
          styles.placed,
          {
            left: placement.x * box.width - size / 2,
            top: placement.y * box.height - size / 2,
            width: size,
            height: size,
            // Hidden outright while it is in the air, because the ghost above
            // *is* this sticker and two of them read as two stickers. A plain
            // prop rather than an animated style, so it comes back in the same
            // render that moves it.
            opacity: held ? 0 : 1,
          },
          transform,
        ]}
      >
        {/* Cream, the same ring the background picker uses for the one that is
            chosen — one visual language for "this is the one", and never an
            action colour, because the ring is a state and not a control. */}
        {selected ? <Animated.View style={styles.ring} /> : null}
        <StickerArt id={placement.stickerId} size={size} />
      </Animated.View>
    </GestureDetector>
  );
}

/** Fire and forget — a missing haptics motor must never break a drag. */
const tick = () => {
  Haptics.selectionAsync().catch(() => {});
};

const styles = StyleSheet.create({
  canvas: {
    borderRadius: layout.radius,
    // Clipped, so a sticker can never spill onto the chrome — and no
    // `elevation()`, because a shadow on a clipped view renders badly on
    // Android and the hairline is what separates surfaces here anyway.
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surface,
  },
  content: { flex: 1 },
  placed: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    top: -RING_INSET,
    left: -RING_INSET,
    right: -RING_INSET,
    bottom: -RING_INSET,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text,
    // A dark wash inside the ring as well. Cream on its own vanishes against
    // the cream ground and the sand, and the wash is what makes the ring read
    // on all seven — it sits *behind* the sticker, so it frames it rather than
    // tinting it.
    backgroundColor: 'rgba(13,8,16,0.22)',
  },
});
