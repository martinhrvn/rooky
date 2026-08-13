import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from './theme';

/** Five-pointed star on a 100x100 canvas. Shared by the board and the reward. */
export const STAR_PATH =
  'M50 6 L61.8 38.2 L96 39.4 L68.6 60.1 L78.5 92.9 L50 73 L21.5 92.9 L31.4 60.1 L4 39.4 L38.2 38.2 Z';

/**
 * The reward, lit from the top left.
 *
 * The gradient is not decoration: gold is the one colour reserved for rewards,
 * and on a dark ground a flat fill sits there while a lit one gleams. It is
 * the same gold either way — `starHigh` and `starLow` are the highlight and
 * shadow of `star`, not new colours.
 *
 * `id` must be unique wherever two stars can be on screen at once, because
 * gradient ids resolve per SVG root and react-native-svg has historically
 * leaked them between roots on Android.
 */
export function Star({ size, id = 'star-gleam' }: { size: number; id?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id} x1="18%" y1="6%" x2="78%" y2="94%">
          <Stop offset="0%" stopColor={colors.starHigh} />
          <Stop offset="52%" stopColor={colors.star} />
          <Stop offset="100%" stopColor={colors.starLow} />
        </LinearGradient>
      </Defs>
      <Path
        d={STAR_PATH}
        fill={`url(#${id})`}
        stroke={colors.starEdge}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
