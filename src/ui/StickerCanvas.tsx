import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { stickerById } from '../content/stickers';
import type { Placement } from '../progress/schema';
import { StickerArt } from './StickerArt';
import { CanvasGround } from './canvasBackgrounds';
import {
  type Size,
  clampPlacement,
  clampScale,
  hitTest,
  resolvePlacedDrop,
  stickerSizeFor,
} from './canvasGeometry';
import type { CanvasRects, DragState } from './dragState';
import { strings } from './strings';
import { colors, layout } from './theme';

interface CanvasProps {
  /** The fitted box. Nothing draws until this has a width. */
  readonly box: Size;
  readonly backgroundId: string;
  readonly placements: readonly Placement[];
  readonly drag: DragState;
  readonly rects: CanvasRects;
  /** The placement currently in the air, or `''`. */
  readonly heldKey: string;
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
 */
export function StickerCanvas({
  box,
  backgroundId,
  placements,
  ...rest
}: CanvasProps) {
  return (
    <Animated.View
      ref={rest.rects.canvasRef}
      accessibilityLabel={strings.stickers.canvas.area}
      style={[styles.canvas, { width: box.width, height: box.height }]}
    >
      {box.width > 0 ? (
        <>
          <CanvasGround id={backgroundId} width={box.width} height={box.height} />
          {placements.map((placement) => (
            <PlacedSticker key={placement.key} placement={placement} box={box} {...rest} />
          ))}
        </>
      ) : null}
    </Animated.View>
  );
}

function PlacedSticker({
  placement,
  box,
  drag,
  rects,
  heldKey,
  onLift,
  onMove,
  onRemove,
  onTransform,
  onCancel,
}: Omit<CanvasProps, 'backgroundId' | 'placements'> & { placement: Placement }) {
  // The drawn box ignores her scale — all of it lives in the transform below,
  // which keeps the touch target the same size however small she pinches a
  // sticker, and keeps a scaled sticker centred on the point it is stored at.
  const base = stickerSizeFor(box);
  const size = base * placement.scale;

  const scale = useSharedValue(placement.scale);
  const rotation = useSharedValue(placement.rotation);
  const scaleFrom = useSharedValue(1);
  const rotationFrom = useSharedValue(0);

  // Follows a committed transform back down, and — more importantly — a
  // placement that arrived from somewhere else entirely, such as a reset.
  useEffect(() => {
    scale.value = placement.scale;
    rotation.value = placement.rotation;
  }, [placement.scale, placement.rotation, scale, rotation]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      // No hold — nothing scrolls under the picture, so a sticker lifts as
      // soon as she moves it. A small distance rather than none, for the sake
      // of the two-fingered gestures below: with a hair trigger the first
      // finger down lifts the sticker and the second drops it again, so every
      // pinch would start with a flinch.
      .minDistance(6)
      // One finger only, so a second finger landing hands the sticker to the
      // pinch and rotate below instead of dragging it across the picture.
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .hitSlop({ top: 10, bottom: 10, left: 10, right: 10 })
      .onStart((e) => {
        rects.sync();
        drag.x.value = e.absoluteX;
        drag.y.value = e.absoluteY;
        scheduleOnRN(onLift, placement.stickerId, size, placement.rotation, placement.key);
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

    const commit = () => {
      'worklet';
      // Re-clamped against the size she just pinched it to, so growing a
      // sticker near the edge pulls it back on rather than off.
      const there = clampPlacement(
        { x: placement.x, y: placement.y },
        box,
        base * scale.value,
      );
      scheduleOnRN(onTransform, placement.key, scale.value, rotation.value, there.x, there.y);
    };

    const pinch = Gesture.Pinch()
      .onStart(() => {
        scaleFrom.value = scale.value;
      })
      .onUpdate((e) => {
        scale.value = clampScale(scaleFrom.value * e.scale);
      })
      .onEnd(commit);

    const turn = Gesture.Rotation()
      .onStart(() => {
        rotationFrom.value = rotation.value;
      })
      .onUpdate((e) => {
        rotation.value = rotationFrom.value + (e.rotation * 180) / Math.PI;
      })
      .onEnd(commit);

    // Simultaneous rather than a race: sizing and turning are one two-fingered
    // act, and making her choose between them means neither works. The pan is
    // in the same set only because `maxPointers(1)` already keeps it out of
    // the way — with two fingers down it cannot be the gesture that is running.
    return Gesture.Simultaneous(pan, pinch, turn);
  }, [
    placement,
    box,
    base,
    size,
    drag,
    rects,
    scale,
    rotation,
    scaleFrom,
    rotationFrom,
    onLift,
    onMove,
    onRemove,
    onTransform,
    onCancel,
  ]);

  const live = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityRole="image"
        accessibilityLabel={strings.stickers.canvas.placed(stickerById(placement.stickerId).name)}
        style={[
          styles.placed,
          {
            left: placement.x * box.width - base / 2,
            top: placement.y * box.height - base / 2,
            width: base,
            height: base,
            // Hidden outright while it is in the air, because the ghost above
            // *is* this sticker and two of them read as two stickers. A plain
            // prop rather than an animated style, so it comes back in the same
            // render that moves it.
            opacity: heldKey === placement.key ? 0 : 1,
          },
          live,
        ]}
      >
        <StickerArt id={placement.stickerId} size={base} />
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
  placed: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
