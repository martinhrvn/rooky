import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Level } from '../game/types';
import { colors } from './theme';

const TICK = 'M20 52 L40 72 L80 26';

/**
 * Space between squares.
 *
 * Zero, and that is the point: a real rank has no gaps in it. Spaced out, the
 * strip was a row of tiles that happened to alternate; butted together it is a
 * slice cut out of the board, and the finished levels form one continuous bar
 * instead of a dotted line. Kept as a named constant because the scroll
 * position is still computed in whole squares.
 */
const GAP = 0;

/** Width of the frame's hairline. Needed as a number to size the frame by it. */
const FRAME_EDGE = 1.5;

/**
 * A tier's levels drawn as a rank of board squares.
 *
 * This is the app's signature: progress reads as a piece having walked most of
 * the way across a rank, rather than as a progress bar. Squares alternate light
 * and dark exactly as they do on the board, butt together with no gap, and sit
 * inside a clipped, hairlined container — so the strip is a piece of board
 * rather than a row of buttons. Completed ones carry a tick, and the next one
 * to play is ringed.
 *
 * The ring is **dark**, which looks like a compromise and is not: it sits on
 * board squares, and cream (1.18 on the light square) and jade (2.33 light,
 * 1.01 dark) both fail to clear 3:1 on them. `inkOnAccent` is the only colour
 * in the palette that reads on both, and it is what the buttons already use
 * for their labels.
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
  // Bigger than it was, because the squares no longer have gaps between them
  // to absorb a mis-tap. Still under the 44pt target — eight of these have to
  // fit a card — but the card's piece tile is the large way in, and this is
  // the index.
  squareSize = 34,
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
    // The frame is what turns a row of squares into a piece of board: it clips
    // the outer corners and puts a hairline round the whole strip, so the rank
    // reads as one object.
    //
    // Both of its dimensions have to be pinned, and for different reasons.
    // **Height is explicit** because a bare wrapper round a ScrollView stretches
    // to fill its parent instead of hugging the strip — which grew the home
    // card past the screen and pushed the piece tile off the top and the
    // buttons off the bottom, leaving the rank floating alone in the middle.
    // **`alignSelf`** stops the width filling too, so the home screen does not
    // frame a strip of empty space to the right of the last level.
    <View style={[styles.frame, { height: squareSize + FRAME_EDGE * 2 }, style]}>
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
      //
      // The caller's `style` now lands on the frame around this, not here.
      style={{ height: squareSize, minWidth: 0 }}
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
                // Square, not rounded. Rounding each one turned the strip back
                // into a row of tiles; the frame around the whole rank is what
                // carries the radius now.
                backgroundColor: index % 2 === 0 ? colors.lightSquare : colors.darkSquare,
              },
              done && styles.done,
              // Scaled, not fixed: a 3px ring eats a quarter of the 24pt
              // squares the home screen draws, which reads as a smaller, darker
              // square rather than as a marked one.
              isNext && {
                borderWidth: Math.max(2, squareSize * 0.09),
                borderColor: colors.inkOnAccent,
              },
              interactive && !unlocked && styles.locked,
              pressed && styles.pressed,
            ]}
          >
            {done ? (
              <Svg width={squareSize * 0.6} height={squareSize * 0.6} viewBox="0 0 100 100">
                <Path
                  d={TICK}
                  // Dark on jade. Cream would be 2.74:1 here — the tick is a
                  // graphical object and has to clear 3:1 to be a tick at all.
                  stroke={colors.inkOnAccent}
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
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'flex-start',
    borderWidth: FRAME_EDGE,
    borderColor: colors.frameEdge,
    borderRadius: 5,
    // Squares run to the edge, so the radius has to cut them.
    overflow: 'hidden',
  },
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
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.92 }],
  },
});
