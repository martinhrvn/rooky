import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { StickerArt } from './StickerArt';
import type { CanvasRects, DragState, Held } from './dragState';

/** How much bigger than it will land, so it reads as held rather than stuck. */
const LIFT = 1.12;

/**
 * The sticker that follows her finger.
 *
 * **One ghost for the whole screen**, absolutely positioned over everything,
 * rather than one per draggable item. That is not tidiness: a ghost inside the
 * tray lives inside a `ScrollView`, which clips its children, so the sticker
 * would be sliced off at the tray's edge exactly as it started to travel — and
 * the canvas clips too, for its rounded corners. One ghost also means the tray
 * and the canvas share a single drag code path.
 *
 * It is mounted and unmounted by React rather than faded by a shared value, so
 * it vanishes in the same commit that renders the placement it became. Nothing
 * here animates on release: the ghost is already standing exactly where the
 * sticker is about to be.
 */
export function DragGhost({
  held,
  drag,
  rects,
}: {
  held: Held | null;
  drag: DragState;
  rects: CanvasRects;
}) {
  const style = useAnimatedStyle(() => {
    const origin = rects.host.value;
    const half = (held?.size ?? 0) / 2;
    return {
      // The ghost is a child of the screen, so window coordinates have to come
      // back inside it.
      transform: [
        { translateX: drag.x.value - (origin?.x ?? 0) - half },
        { translateY: drag.y.value - (origin?.y ?? 0) - half },
      ],
    };
  });

  if (held === null) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ghost, { width: held.size, height: held.size }, style]}
    >
      {/* Scaled and turned inside the ghost rather than by it, so the outer
          translate stays a plain window-coordinate offset. */}
      <Animated.View
        style={{ transform: [{ scale: LIFT }, { rotate: `${held.rotation}deg` }] }}
      >
        <StickerArt id={held.stickerId} size={held.size} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
});
