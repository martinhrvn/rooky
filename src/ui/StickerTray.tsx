import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { stickerById } from '../content/stickers';
import { StickerArt } from './StickerArt';
import { Text } from './Text';
import { TAP_SLOP, resolveTrayDrop, stickerSizeFor } from './canvasGeometry';
import type { CanvasRects, DragState } from './dragState';
import { strings } from './strings';
import { colors, layout, pieceSpring } from './theme';

/**
 * How long she has to hold a sticker before it lifts.
 *
 * The whole reason the tray can both scroll and be dragged from: a pan that
 * can only activate after a hold means a flick is unambiguously a scroll, and
 * the `ScrollView`'s own gesture wins that race with no relation declared
 * between them. **This is the one number to change from watching her use it** —
 * shorter and scrolling turns sticky, longer and she lets go first.
 */
const LIFT_MS = 200;

/** One column, a comfortable target wide, with the art inset inside it. */
export const TRAY_WIDTH = layout.touchTarget + 16;
const SLOT = layout.touchTarget;
const TRAY_ART = 44;

interface TrayProps {
  readonly album: readonly string[];
  readonly drag: DragState;
  readonly rects: CanvasRects;
  /** The sticker in the air, or `''` — so the lifted one can dim. */
  readonly heldId: string;
  /** True only while a sticker from the *picture* is in the air. */
  readonly armed: boolean;
  readonly onLift: (stickerId: string, size: number) => void;
  readonly onPlace: (stickerId: string, x: number, y: number) => void;
  readonly onDropInMiddle: (stickerId: string) => void;
  readonly onCancel: () => void;
}

/**
 * Her stickers, down the side of the picture.
 *
 * It is also the bin: a placed sticker dragged back onto the tray comes off
 * the picture. That is the only way to remove one, and it is deliberate —
 * there is no button that could clear anything by accident, and dragging it
 * back out puts it straight back.
 */
export function StickerTray({ album, drag, rects, heldId, armed, ...rest }: TrayProps) {
  const reduced = useReducedMotion();

  // Reacts only while a sticker from the *picture* is in the air. A tray that
  // lit up as she pulled a sticker out of it would be saying "drop it here to
  // delete it" about the thing she had just picked up.
  const binStyle = useAnimatedStyle(() => {
    const over = armed && drag.overTray.value === 1;
    return {
      backgroundColor: withTiming(over ? colors.surfaceRaised : colors.surface, { duration: 120 }),
      borderColor: withTiming(over ? colors.actionEdge : colors.surfaceEdge, { duration: 120 }),
      transform: [{ scale: reduced ? 1 : withSpring(over ? 1.04 : 1, pieceSpring) }],
    };
  });

  return (
    <Animated.View
      // Measured for hit-testing, so it is a plain view rather than the
      // `ScrollView` — a scroll host's measured frame is the flakier of the two.
      ref={rects.trayRef}
      accessibilityLabel={strings.stickers.canvas.tray}
      style={[styles.tray, binStyle]}
    >
      {album.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.column}
          showsVerticalScrollIndicator={false}
        >
          {album.map((id, i) => (
            <TrayItem
              key={`${id}-${i}`}
              stickerId={id}
              drag={drag}
              rects={rects}
              // Dimmed only when it is *this* sticker that came out of the
              // tray: the same sticker may also be sitting on the picture.
              lifted={!armed && heldId === id}
              {...rest}
            />
          ))}
        </ScrollView>
      ) : (
        <Text variant="label" color={colors.textSoft} align="center" style={styles.empty}>
          {strings.stickers.empty}
        </Text>
      )}
    </Animated.View>
  );
}

function TrayItem({
  stickerId,
  drag,
  rects,
  lifted,
  onLift,
  onPlace,
  onDropInMiddle,
  onCancel,
}: Omit<TrayProps, 'album' | 'heldId' | 'armed'> & {
  readonly stickerId: string;
  readonly lifted: boolean;
}) {
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(LIFT_MS)
      // No `minDistance` here, and that is load-bearing: any minimum distance
      // makes the pan activate on movement, and a pan that can activate on
      // movement is a pan that steals every scroll. The hold is the *only*
      // way in — moving before the timer fires fails the pan outright, which
      // is exactly what hands the flick back to the ScrollView.
      //
      // The finger regularly leaves the tray afterwards, which is the point.
      .shouldCancelWhenOutside(false)
      .onStart((e) => {
        rects.sync();
        drag.x.value = e.absoluteX;
        drag.y.value = e.absoluteY;
        // A new sticker starts at plain size and square on: nothing here has
        // been pinched or turned yet.
        scheduleOnRN(onLift, stickerId, stickerSizeFor(rects.box.value));
        scheduleOnRN(tick);
      })
      .onUpdate((e) => {
        drag.x.value = e.absoluteX;
        drag.y.value = e.absoluteY;
      })
      .onEnd((e) => {
        const drop = resolveTrayDrop({
          x: e.absoluteX,
          y: e.absoluteY,
          travelled: Math.sqrt(e.translationX ** 2 + e.translationY ** 2),
          canvas: rects.canvas.value,
          stickerSize: stickerSizeFor(rects.box.value),
        });
        if (drop.kind === 'canvas') scheduleOnRN(onPlace, stickerId, drop.x, drop.y);
        else if (drop.kind === 'middle') scheduleOnRN(onDropInMiddle, stickerId);
      })
      // `onFinalize`, not `onEnd`: a pan the `ScrollView` cancels never ends,
      // and a cancel that skipped this would strand the ghost on screen.
      .onFinalize(() => {
        drag.overTray.value = 0;
        scheduleOnRN(onCancel);
      });

    // Exclusive, not Race: a tap activates on touch-down and would win every
    // race before the pan's hold timer had a chance to fire. Exclusive gives
    // the pan priority and lets the tap through only when it never activated.
    //
    // `maxDistance` is not optional — a `Tap` has no distance limit by default,
    // so a flick that scrolled the tray would still end as a tap and drop a
    // sticker she never asked for.
    const tap = Gesture.Tap()
      .maxDistance(TAP_SLOP)
      .onEnd((_e, success) => {
        if (success) scheduleOnRN(onDropInMiddle, stickerId);
      });

    return Gesture.Exclusive(pan, tap);
  }, [stickerId, drag, rects, onLift, onPlace, onDropInMiddle, onCancel]);

  return (
    <GestureDetector gesture={gesture}>
      {/* `GestureDetector` needs one child that forwards a ref to a native
          view, and `StickerArt` renders an `<Svg>` or a bare glyph. */}
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={stickerById(stickerId).name}
        // A plain prop rather than an animated style, so it comes back in the
        // same render that puts the sticker on the picture.
        style={[styles.slot, { opacity: lifted ? 0.3 : 1 }]}
      >
        <StickerArt id={stickerId} size={TRAY_ART} />
      </Animated.View>
    </GestureDetector>
  );
}

/** Fire and forget — a missing haptics motor must never break a drag. */
const tick = () => {
  Haptics.selectionAsync().catch(() => {});
};

const styles = StyleSheet.create({
  tray: {
    width: TRAY_WIDTH,
    borderRadius: layout.radius,
    borderWidth: 1,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  column: { alignItems: 'center', gap: 6, paddingVertical: 2 },
  slot: {
    width: SLOT,
    height: SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { paddingHorizontal: 6 },
});
