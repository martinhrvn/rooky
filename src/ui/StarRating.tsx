import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from './theme';

const STAR =
  'M50 6 L61.8 38.2 L96 39.4 L68.6 60.1 L78.5 92.9 L50 73 L21.5 92.9 L31.4 60.1 L4 39.4 L38.2 38.2 Z';

/** Three drawn stars, filled or hollow. No numbers, no percentages. */
export function StarRating({ earned, size = 40 }: { earned: 0 | 1 | 2 | 3; size?: number }) {
  return (
    <View style={styles.row}>
      {[0, 1, 2].map((i) => (
        <Svg key={i} width={size} height={size} viewBox="0 0 100 100">
          <Path
            d={STAR}
            fill={i < earned ? colors.star : 'transparent'}
            stroke={i < earned ? colors.starEdge : colors.textSoft}
            strokeWidth={6}
            strokeLinejoin="round"
          />
        </Svg>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
