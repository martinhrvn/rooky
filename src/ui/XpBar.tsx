import { StyleSheet, View } from 'react-native';

import { barProgress } from '../progress/xp';
import { colors } from './theme';

/**
 * How full the bar is: one continuous fill, no numeral anywhere.
 *
 * This was eight board squares at first, to echo `TierRank` and to keep the
 * quantity countable the way the move dots are. On screen it read as a
 * checkerboard rather than as progress — the alternating fill fought the one
 * thing the bar has to say, which is *how close*. A count was the wrong idea
 * here in any case: she is not meant to tally the squares, only to see the
 * end coming.
 *
 * **Jade, never gold.** Gold belongs to the stars, and an XP bar in gold would
 * compete with the thing it is subordinate to.
 */
export function XpBar({ xp, height = 12 }: { xp: number; height?: number }) {
  const progress = barProgress(xp);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <View
        style={[
          styles.fill,
          {
            // Never quite zero once anything has been earned: a fill thinner
            // than its own corner radius renders as a sliver of nothing, and
            // "you have started" is worth more than being exact about 2%.
            width: `${progress > 0 ? Math.max(progress * 100, 6) : 0}%`,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    // Clipped, so the fill's rounded end stops inside the hairline rather than
    // riding over it.
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.green,
  },
});
