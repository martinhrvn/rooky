import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { World } from '../content';
import { Glyph } from './IconButton';
import { pieceArt } from './pieces';
import { strings } from './strings';
import { Text } from './Text';
import { colors, elevation, ribbons } from './theme';

/** How big the pieces on a ribbon are drawn. */
const ART = 32;
/** Height of the band the name sits on. */
const BAND = 54;
/** Width of each folded tail. */
const TAIL = 22;
/** How deep the V is cut into the outer edge of a tail. */
const NOTCH = 10;

/**
 * How far the front of the ribbon laps over each tail.
 *
 * Butted edge to edge, the band and the tails read as three separate pieces
 * laid in a row. A real ribbon's front panel sits *on top* of the ends it is
 * folded from, and a few pixels of overlap is the whole difference between the
 * two readings.
 */
const OVERLAP = 7;

/**
 * How far each tail hangs below the band, and by how much they disagree.
 *
 * Deliberately not equal. Two tails at the same height read as a machined bar
 * with notches cut in it; a few pixels of disagreement reads as cloth someone
 * tied. It is the smallest possible amount of hand.
 */
const DROOP = { left: 13, right: 8 };

/** How far a tail sways as the path scrolls. Barely perceptible, on purpose. */
const SWAY = 4;

/**
 * The banner that starts a world on the path.
 *
 * Built as three pieces rather than one stretched SVG: a fixed-width tail at
 * each end and a flexible band between them. A single `preserveAspectRatio`
 * banner would smear its notches as the title got longer, and world names run
 * from "Check" to "Get Out of Check".
 *
 * It carries the world's cast rather than one icon, because the number of
 * pieces is what tells a non-reader that Taking Pieces is not another piece to
 * learn — the same job the row does on a piece tile.
 *
 * **The band is how Endless is reached.** It had a button of its own here and
 * it competed with the circles, which are the only thing the path is for — so
 * the front of the ribbon became the control instead. The lemniscate at its
 * end is what keeps that honest: a control a non-reader cannot see is a
 * control she does not have.
 */
export function WorldRibbon({
  world,
  index,
  locked,
  scrollY,
  onEndless,
}: {
  world: World;
  index: number;
  locked: boolean;
  scrollY: SharedValue<number>;
  /** Absent on theme worlds, which the generator cannot build for. */
  onEndless?: () => void;
}) {
  const hue = ribbons[index % ribbons.length];

  const front = (
    <>
      <View style={styles.cast}>
        {world.cast.map((piece, i) => {
          const Art = pieceArt('w', piece);
          return (
            <View key={`${piece}-${i}`} style={{ marginLeft: i === 0 ? 0 : -ART * 0.42 }}>
              <Art width={ART} height={ART} />
            </View>
          );
        })}
      </View>

      {/* Dark on the band, like every other label on a colour in the app —
          cream fails AA on all three ribbon hues. */}
      <Text variant="title" color={colors.inkOnAccent} style={styles.title} numberOfLines={1}>
        {world.title}
      </Text>

      {onEndless ? (
        <View style={styles.mark}>
          <Glyph name="endless" size={22} color={colors.inkOnAccent} />
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.ribbon, locked && styles.locked]}>
      <Tail side="left" color={hue.tail} scrollY={scrollY} />

      {onEndless ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${world.title}. ${strings.path.endless}`}
          onPress={onEndless}
          style={({ pressed }) => [
            styles.band,
            { backgroundColor: hue.band },
            pressed && styles.pressed,
          ]}
        >
          {front}
        </Pressable>
      ) : (
        <View style={[styles.band, { backgroundColor: hue.band }]}>{front}</View>
      )}

      <Tail side="right" color={hue.tail} scrollY={scrollY} />
    </View>
  );
}

/**
 * One end of the ribbon: a notched flag in the hue's shadow, hanging below the
 * band with a small darker wedge where it folds back behind it.
 *
 * The sway is a function of scroll position rather than of time, so the cloth
 * only ever moves because she moved it — an idle screen stays completely still.
 * The two ends rock against each other, which is what makes it read as one
 * piece of cloth rather than two flags.
 */
function Tail({
  side,
  color,
  scrollY,
}: {
  side: 'left' | 'right';
  color: string;
  scrollY: SharedValue<number>;
}) {
  const reduced = useReducedMotion();
  const droop = side === 'left' ? DROOP.left : DROOP.right;
  const direction = side === 'left' ? 1 : -1;

  const style = useAnimatedStyle(() => ({
    marginTop: droop,
    transform: [{ translateY: reduced ? 0 : Math.sin(scrollY.value / 90) * SWAY * direction }],
  }));

  const notched =
    side === 'left'
      ? `M${TAIL} 0 L0 0 L${NOTCH} ${BAND / 2} L0 ${BAND} L${TAIL} ${BAND} Z`
      : `M0 0 L${TAIL} 0 L${TAIL - NOTCH} ${BAND / 2} L${TAIL} ${BAND} L0 ${BAND} Z`;

  // The fold shadow sits immediately *outside* where the band's edge now lands,
  // not at the tail's inner edge — the overlap would otherwise cover it and the
  // ribbon would lose the one mark that says it is folded rather than butted.
  const edge = side === 'left' ? TAIL - OVERLAP : OVERLAP;
  const fold =
    side === 'left'
      ? `M${edge} 0 L${edge} 9 L${edge - 9} 0 Z`
      : `M${edge} 0 L${edge} 9 L${edge + 9} 0 Z`;

  return (
    <Animated.View pointerEvents="none" style={style}>
      <Svg width={TAIL} height={BAND} viewBox={`0 0 ${TAIL} ${BAND}`}>
        <Path d={notched} fill={color} />
        <Path d={fold} fill={colors.shadow} opacity={0.35} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /**
   * Aligned to the top, not centred: the tails set their own drop, and
   * centring would quietly cancel it.
   *
   * No shadow either. Android draws `elevation` from the view's outline, and
   * this container is transparent with SVG tails inside it — so the shadow
   * would be a plain rectangle behind the notches, squaring off the one shape
   * that has to read as cloth.
   */
  ribbon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    // Room for the lower tail to hang into without clipping the row.
    paddingBottom: DROOP.left + SWAY,
  },
  band: {
    flex: 1,
    height: BAND,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    // Just enough to take the machined edge off the front panel without it
    // starting to look like one of the pill buttons.
    borderRadius: 5,
    // Laps over both tails. `zIndex` is what puts it above the *right* tail —
    // paint order alone would only lift it above the left one, which comes
    // earlier in the row.
    marginHorizontal: -OVERLAP,
    zIndex: 1,
    ...elevation('raised'),
  },
  cast: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  /** Quiet: it marks the band as pressable without competing with the name. */
  mark: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
  /**
   * Muted rather than hidden. Seeing what is coming is motivating, and it is
   * also the only thing that gives the path a sense of length.
   */
  locked: { opacity: 0.45 },
});
