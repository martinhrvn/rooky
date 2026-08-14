import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { STAR_PATH } from './Star';
import { colors, rewardSpring } from './theme';

/**
 * The two moving parts of a win, kept apart from where they are arranged.
 *
 * They were one board-anchored component until the XP bar and the way onward
 * had to be shown alongside the stars — none of which is board-shaped. The
 * arrangement now lives in `WinDialog`; what stays here is the confetti and
 * the star that springs in, which are the same wherever they are put.
 *
 * Both settle instantly when `skipped`. That is what keeps the win skippable
 * mid-flight, which matters more than the animation does: levels get replayed
 * constantly, and an unskippable cutscene is torture by the fifth attempt.
 */
export const CONFETTI_COUNT = 22;

const CONFETTI_COLORS = [colors.lightSquare, colors.darkSquare, colors.star, colors.greenLight];

export function RewardStar({
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
      {/* Heavier stroke than the board's stars: these are drawn large on a
          card and need an edge that holds at that size. */}
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

export function Confetti({ index, size, skipped }: { index: number; size: number; skipped: boolean }) {
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
  confetti: { position: 'absolute', top: 0, left: 0 },
});
