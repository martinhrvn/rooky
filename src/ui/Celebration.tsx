import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { STAR_PATH } from './Star';
import { colors, rewardSpring } from './theme';

const CONFETTI_COUNT = 22;
const CONFETTI_COLORS = [colors.lightSquare, colors.darkSquare, colors.star, colors.greenLight];

/**
 * The win moment, anchored to the board rather than taking the screen over.
 *
 * The board stays visible behind a light scrim, and **any tap skips straight to
 * the resting state**. That skip matters more than the animation does: levels
 * get replayed constantly, and an unskippable cutscene becomes torture by the
 * fifth attempt.
 *
 * It settles into a resting state rather than disappearing, so the stars she
 * earned stay on screen until she moves on.
 */
export function Celebration({
  earned,
  size,
  skipped,
  onSkip,
}: {
  earned: 1 | 2 | 3;
  /** Board edge length, so the overlay matches it exactly. */
  size: number;
  /** True once she has tapped — everything jumps to its final position. */
  skipped: boolean;
  onSkip: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${earned} of 3 stars. Tap to continue.`}
      onPress={onSkip}
      style={[styles.overlay, { width: size, height: size }]}
    >
      {/* No scrim. Washing the board out fought the whole point of keeping the
          celebration board-anchored — she should be able to see the position
          she just finished. The stars carry themselves instead.

          Under reduced motion there is no confetti at all: twenty-two sprites
          spinning through 540° is the single most vestibular thing in the app,
          and it is also the one part of the celebration that carries no
          information. The stars say what she earned, and they still arrive —
          they simply arrive already there. */}
      {reduced
        ? null
        : Array.from({ length: CONFETTI_COUNT }, (_, i) => (
            <Confetti key={i} index={i} size={size} skipped={skipped} />
          ))}

      <View style={styles.stars}>
        {[0, 1, 2].map((i) => (
          <RewardStar
            key={i}
            index={i}
            filled={i < earned}
            size={size * 0.2}
            skipped={skipped || reduced}
          />
        ))}
      </View>
    </Pressable>
  );
}

function RewardStar({
  index,
  filled,
  size,
  skipped,
}: {
  index: number;
  filled: boolean;
  size: number;
  skipped: boolean;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    if (skipped) {
      scale.value = 1;
      return;
    }
    // Staggered so three stars land as three separate beats rather than one.
    scale.value = withDelay(index * 180, withSpring(1, rewardSpring));
  }, [index, skipped, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      {/* Heavier stroke than the board's stars: without a scrim these sit
          straight on top of the squares and need to hold their own against
          both the light and the dark ones. */}
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path
          d={STAR_PATH}
          fill={filled ? colors.star : 'rgba(255, 253, 248, 0.85)'}
          stroke={filled ? colors.starEdge : colors.walnut}
          strokeWidth={9}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

function Confetti({ index, size, skipped }: { index: number; size: number; skipped: boolean }) {
  // Deterministic spread from the index — no randomness needed, and it keeps
  // the distribution even rather than clumpy.
  const startX = ((index * 37) % 100) / 100;
  const drift = (((index * 53) % 40) - 20) / 100;
  const delay = (index % 6) * 90;
  const duration = 1400 + ((index * 71) % 700);
  const colour = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const width = 7 + (index % 3) * 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (skipped) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.in(Easing.quad) }),
    );
  }, [delay, duration, skipped, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value > 0.85 ? (1 - progress.value) / 0.15 : 1,
    transform: [
      { translateX: startX * size + drift * size * progress.value },
      { translateY: -20 + progress.value * (size + 40) },
      { rotate: `${progress.value * 540 + index * 30}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.confetti,
        { width, height: width * 1.6, backgroundColor: colour, borderRadius: 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    // Explicit insets rather than relying on the static position, now that
    // the board sits inside a padded frame.
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 6,
  },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confetti: { position: 'absolute', top: 0, left: 0 },
});
