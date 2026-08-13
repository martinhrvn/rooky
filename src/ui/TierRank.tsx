import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Level } from '../game/types';
import { colors } from './theme';

const TICK = 'M20 52 L40 72 L80 26';

/** Space between squares. Needed as a number to scroll by whole squares. */
const GAP = 5;

/**
 * A tier's levels drawn as a rank of board squares.
 *
 * This is the app's signature: progress reads as a piece having walked most of
 * the way across a rank, rather than as a progress bar. Squares alternate light
 * and dark exactly as they do on the board, completed ones carry a green tick,
 * and the next one to play is ringed.
 *
 * The rank **scrolls sideways and never wraps**. Ten levels of squares are
 * wider than a card on a phone, and a rank that wraps onto a second line stops
 * being a rank — the one thing this component exists to look like. A square cut
 * off at the edge is also its own invitation to push it, which no other
 * affordance here would be to a non-reader.
 */
export function TierRank({
  levels,
  completedIds,
  isUnlocked = () => true,
  onPickLevel,
  squareSize = 30,
  interactive = true,
  style,
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
  /**
   * Applied to the scrolling strip. A caller that puts the rank in a row has to
   * pass `flex: 1`, or the strip takes its content's full width and spills out
   * of the card instead of scrolling inside it.
   */
  style?: StyleProp<ViewStyle>;
}) {
  // The next level to play is the first unfinished one that is actually
  // reachable. Read-only strips ignore the lock check, so the home screen
  // still rings the level Continue will open.
  const nextIndex = levels.findIndex(
    (level) => !completedIds.has(level.id) && (!interactive || isUnlocked(level)),
  );

  const scroller = useRef<ScrollView>(null);
  const touched = useRef(false);

  /**
   * Opens on the square she is meant to play next, one square in from the left
   * so the ones she has already finished are still visible behind it.
   *
   * Without this a rank shows nothing but ticks by the middle of a world, which
   * reads as "there is nothing to do here" — the exact opposite of what the
   * ring is for.
   *
   * Called from both layout and content-size, because either one alone can run
   * while the other measurement is still missing and the scroll then goes
   * nowhere. Stops as soon as she drags it herself: past that point where the
   * strip sits is her business, not ours.
   */
  const settle = () => {
    if (touched.current || nextIndex < 1) return;
    scroller.current?.scrollTo({ x: (nextIndex - 1) * (squareSize + GAP), animated: false });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(settle, [nextIndex, squareSize]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      onContentSizeChange={settle}
      onLayout={settle}
      onScrollBeginDrag={() => {
        touched.current = true;
      }}
      showsHorizontalScrollIndicator={false}
      // Height comes from the squares: a horizontal ScrollView has none of its
      // own.
      //
      // `minWidth: 0` is what makes the strip scroll rather than spill. On the
      // web a flex item will not shrink below its content — ten squares — so
      // without it the caller's `flex: 1` is ignored, the row grows past the
      // card, and there is nothing to scroll because nothing overflows.
      //
      // No flex of any kind is set here: a `flexGrow` on the component and a
      // `flex` from the caller both survive the style flatten, and the
      // shorthand loses, which collapses the strip to nothing instead.
      style={[{ height: squareSize, minWidth: 0 }, style]}
      contentContainerStyle={styles.rank}
    >
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rank: {
    flexDirection: 'row',
    gap: GAP,
    alignItems: 'center',
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
