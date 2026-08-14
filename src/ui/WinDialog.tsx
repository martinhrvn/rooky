import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CONFETTI_COUNT, Confetti, RewardStar } from './Celebration';
import { XpBar } from './XpBar';
import { colors, elevation, layout, rewardSpring } from './theme';

/** How long the bar takes to travel to its new value. */
const FILL_MS = 700;

/** Beat before it starts, so the stars land first and the two do not collide. */
const FILL_DELAY_MS = 500;

/**
 * The end of a level: what she earned, on a card over a dimmed board.
 *
 * This used to be drawn straight onto the board with no scrim, so the position
 * she had just finished stayed readable. That was right when the only thing to
 * show was three stars; it stopped being right once the XP bar and the way
 * onward had to live here too, because those are not board-shaped and were
 * landing on top of the pieces. The scrim is deliberately thin — the board is
 * still visible through it, which was the point of the original decision.
 *
 * **Still skippable with a single tap.** Levels get replayed constantly, and an
 * unskippable cutscene is torture by the fifth attempt. Tapping settles every
 * animation instantly rather than dismissing the card, so a tap always means
 * "get on with it" and never strands her on a finished board.
 */
export function WinDialog({
  earned,
  xpBefore,
  xpAfter,
  size,
  onSkipped,
  children,
}: {
  earned: 1 | 2 | 3;
  /** XP before this level paid out, so the bar can travel from it. */
  xpBefore: number;
  xpAfter: number;
  /** Board edge, so the confetti falls across the same width it used to. */
  size: number;
  /** Fires on the tap that settles the animation, for auto-advance timing. */
  onSkipped?: () => void;
  /** What happens next — the campaign's choices, or "another one". */
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const [skipped, setSkipped] = useState(false);

  // The bar renders whatever value it is given, so animating *the number* is
  // what makes it travel. Starting from `xpBefore` is why the fill reads as
  // this level's doing rather than as a bar that was always that full.
  const [shown, setShown] = useState(xpBefore);

  useEffect(() => {
    if (skipped || reduced) {
      setShown(xpAfter);
      return;
    }

    let frame = 0;
    const started = Date.now() + FILL_DELAY_MS;
    const step = () => {
      const elapsed = Date.now() - started;
      const t = Math.min(1, Math.max(0, elapsed / FILL_MS));
      setShown(xpBefore + (xpAfter - xpBefore) * t);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [skipped, reduced, xpBefore, xpAfter]);

  const card = useSharedValue(0);
  useEffect(() => {
    card.value = reduced ? 1 : withSpring(1, rewardSpring);
  }, [card, reduced]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: withTiming(card.value, { duration: 160 }),
    transform: [{ scale: 0.94 + card.value * 0.06 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${earned} of 3 stars. Tap to continue.`}
      onPress={() => {
        setSkipped(true);
        onSkipped?.();
      }}
      style={StyleSheet.absoluteFill}
    >
      {/* Thin: the board underneath stays legible, which is the half of the
          old board-anchored design worth keeping. */}
      <View style={styles.scrim} />

      {/* Confetti falls over the whole screen rather than the card, or it
          would be a card with glitter in it rather than a celebration. */}
      {reduced
        ? null
        : Array.from({ length: CONFETTI_COUNT }, (_, i) => (
            <Confetti key={i} index={i} size={size} skipped={skipped} />
          ))}

      <View style={styles.centre} pointerEvents="box-none">
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.stars}>
            {[0, 1, 2].map((i) => (
              <RewardStar
                key={i}
                index={i}
                filled={i < earned}
                size={56}
                skipped={skipped || reduced}
              />
            ))}
          </View>

          <XpBar xp={shown} height={16} />

          {children ? <View style={styles.actions}>{children}</View> : null}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 8, 16, 0.55)' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 340,
    gap: 20,
    padding: 22,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surface,
    ...elevation('raised'),
  },
  stars: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  /**
   * Centred, **not stretched**.
   *
   * `IconButton`'s shelf is drawn by its outer pressable and has no width of
   * its own, so stretching it spread a dark pill across the whole card with
   * the round face stranded at one end. A caller that genuinely wants full
   * width says so with `alignSelf: 'stretch'`, which overrides this — the
   * campaign's column of end-of-tier choices does exactly that.
   */
  actions: { gap: 10, alignItems: 'center', alignSelf: 'stretch' },
});
