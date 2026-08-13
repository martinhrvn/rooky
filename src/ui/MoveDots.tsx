import { StyleSheet, View } from 'react-native';

import { colors } from './theme';

/**
 * The move counter, as a row of dots that fill up rather than a numeral.
 *
 * A four-year-old reads "●●○" instantly and "2/3" not at all. Going past par
 * adds hollow extra dots instead of failing anything — over-par costs shine,
 * never the level.
 */
export function MoveDots({ moves, par }: { moves: number; par: number }) {
  const total = Math.max(par, moves);

  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const used = i < moves;
        const overPar = i >= par;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              used && styles.used,
              overPar && (used ? styles.overUsed : styles.over),
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 20,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textSoft,
    backgroundColor: 'transparent',
  },
  used: {
    backgroundColor: colors.star,
    borderColor: colors.starEdge,
  },
  over: {
    borderColor: 'rgba(138, 123, 107, 0.4)',
  },
  overUsed: {
    backgroundColor: colors.textSoft,
    borderColor: colors.textSoft,
  },
});
