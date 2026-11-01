import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import type { Square } from '../chess/types';
import { colors } from './theme';

/** How long one square's bloom takes to spread and fade. */
export const BLOOM_MS = 420;

const DECORATIVE = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * A square saying "yes": a jade disc that spreads past the square and fades.
 * Jade because that is what *done* is in the app — the wash behind a finished
 * stage or circle — and it is the opposite shape to the walnut ring a tap
 * that did nothing gets, which closes in rather than opening out.
 *
 * Never gold. It answers ordinary right moves, and gold is for rewards.
 *
 * Goes beside `Board` in the wrapper, like every board overlay.
 */
export function Bloom({
  square,
  cell,
  delay = 0,
  strength = 0.55,
}: {
  square: Square;
  cell: number;
  delay?: number;
  /** Opacity at the start. Lower when many bloom at once and overlap. */
  strength?: number;
}) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withTiming(1, { duration: BLOOM_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    // Nothing until it starts, then strongest at once and fading out.
    opacity: t.value === 0 ? 0 : strength * (1 - t.value),
    // Reduced motion keeps the flash and drops the spread.
    transform: [{ scale: reduced ? 1 : 0.6 + t.value * 0.8 }],
  }));

  const file = square % 8;
  const rank = Math.floor(square / 8);

  return (
    <Animated.View
      pointerEvents="none"
      {...DECORATIVE}
      style={[
        {
          position: 'absolute',
          left: file * cell,
          top: (7 - rank) * cell,
          width: cell,
          height: cell,
          borderRadius: cell / 2,
          backgroundColor: colors.greenLight,
        },
        style,
      ]}
    />
  );
}

/**
 * Many squares blooming in turn: the board as a whole saying "yes". For the
 * end of something, never for a single move — once a stage or once a game, so
 * it can afford to be the biggest thing the screen does.
 *
 * The squares and their delays are frozen at mount, so a board that changes
 * underneath does not restart it.
 */
export function BloomWave({
  squares,
  cell,
  delayOf,
  strength,
}: {
  squares: readonly Square[];
  cell: number;
  /** When each square starts, in ms. */
  delayOf: (sq: Square) => number;
  strength?: number;
}) {
  const [plan] = useState(() => squares.map((sq) => ({ sq, delay: delayOf(sq) })));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} {...DECORATIVE}>
      {plan.map(({ sq, delay }) => (
        <Bloom key={sq} square={sq} cell={cell} delay={delay} strength={strength} />
      ))}
    </View>
  );
}
