import Svg, { Path } from 'react-native-svg';

import { colors } from './theme';

/** Five-pointed star on a 100x100 canvas. Shared by the board and the reward. */
export const STAR_PATH =
  'M50 6 L61.8 38.2 L96 39.4 L68.6 60.1 L78.5 92.9 L50 73 L21.5 92.9 L31.4 60.1 L4 39.4 L38.2 38.2 Z';

export function Star({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d={STAR_PATH}
        fill={colors.star}
        stroke={colors.starEdge}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
