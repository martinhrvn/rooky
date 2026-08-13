import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Level } from '../game/types';
import { colors } from './theme';

const TICK = 'M20 52 L40 72 L80 26';

/**
 * A tier's levels drawn as a rank of board squares.
 *
 * This is the app's signature: progress reads as a piece having walked most of
 * the way across a rank, rather than as a progress bar. Squares alternate light
 * and dark exactly as they do on the board, completed ones carry a green tick,
 * and the next one to play is ringed.
 */
export function TierRank({
  levels,
  completedIds,
  isUnlocked = () => true,
  onPickLevel,
  squareSize = 30,
  interactive = true,
}: {
  levels: readonly Level[];
  completedIds: ReadonlySet<string>;
  isUnlocked?: (level: Level) => boolean;
  onPickLevel?: (level: Level) => void;
  squareSize?: number;
  /**
   * False on the home screen, where the strip is a progress readout rather
   * than a way in. Read-only squares are not dimmed — greying them out would
   * read as "locked" when they are simply not the way to start a level.
   */
  interactive?: boolean;
}) {
  // The next level to play is the first unfinished one that is actually
  // reachable. Read-only strips ignore the lock check, so the home screen
  // still rings the level Continue will open.
  const nextIndex = levels.findIndex(
    (level) => !completedIds.has(level.id) && (!interactive || isUnlocked(level)),
  );

  return (
    <View style={styles.rank}>
      {levels.map((level, index) => {
        const done = completedIds.has(level.id);
        const unlocked = isUnlocked(level);
        const isNext = index === nextIndex;

        return (
          <Pressable
            key={level.id}
            accessibilityRole={interactive ? 'button' : 'image'}
            accessibilityLabel={`Level ${index + 1}${done ? ', finished' : ''}`}
            accessibilityState={interactive ? { disabled: !unlocked } : undefined}
            disabled={!interactive || !unlocked}
            onPress={() => onPickLevel?.(level)}
            style={({ pressed }) => [
              styles.square,
              {
                width: squareSize,
                height: squareSize,
                borderRadius: squareSize * 0.2,
                // Alternating like a real rank, so the strip is unmistakably
                // made of chessboard.
                backgroundColor: index % 2 === 0 ? colors.lightSquare : colors.darkSquare,
              },
              done && styles.done,
              isNext && { borderWidth: 2.5, borderColor: colors.green },
              interactive && !unlocked && styles.locked,
              pressed && styles.pressed,
            ]}
          >
            {done ? (
              <Svg width={squareSize * 0.6} height={squareSize * 0.6} viewBox="0 0 100 100">
                <Path
                  d={TICK}
                  stroke={colors.surface}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rank: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    backgroundColor: colors.green,
  },
  locked: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.92 }],
  },
});
