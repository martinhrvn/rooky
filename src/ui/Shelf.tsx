import type { ReactNode } from 'react';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { planks } from './shelf';
import { strings } from './strings';
import { Text } from './Text';
import { colors, pieceSpring } from './theme';

/** Width of one toy's slot. A third of a phone, and a comfortable target. */
export const TOY_WIDTH = 96;
/** Height of the space a toy stands in above the plank. */
export const TOY_HEIGHT = 112;

/**
 * How long the hop takes before the toy's screen opens. Long enough to see
 * the toy answer, short enough that she never wonders whether it heard her.
 */
const HOP_MS = 260;

export interface Toy {
  key: string;
  /** Read out, and printed small under the plank for whoever is helping. */
  label: string;
  /** The object itself. It is the whole affordance, so it must be a picture. */
  art: ReactNode;
  /** Not open yet: drawn dim and not pressable. */
  locked?: boolean;
  onPress: () => void;
}

/**
 * The home shelf: everything she can do on her own besides Play.
 *
 * Each activity is an **object** — a jar of pieces, a little board — rather
 * than another pill. Two pills of the same colour are the same button to a
 * non-reader whatever glyph they carry, and every activity here is "play
 * freely", so pills would have had to be told apart by an icon. An object's
 * outline is its identity, the way a sticker ground's swatch is a miniature of
 * the scene it gives.
 *
 * The plank is the app's button shelf made literal: every control stands on a
 * darker block and sinks onto it, and here the block is a real plank and the
 * control a real thing standing on it. It is cut from the board's walnut so it
 * reads as part of the table the board sits on, and nothing on it is gold.
 *
 * Only things that open a board belong here — the one kind of place that can
 * never be a tab. Rewards stay on their tabs.
 */
export function Shelf({ toys }: { toys: readonly Toy[] }) {
  const rows = planks(toys);
  if (rows.length === 0) return null;

  return (
    <View style={styles.wall}>
      {rows.map((row) => (
        <View key={row.map((t) => t.key).join()} style={styles.row}>
          <View style={styles.toys}>
            {row.map((toy) => (
              <View key={toy.key} style={styles.slot}>
                <ToyOnShelf toy={toy} />
              </View>
            ))}
          </View>
          <Plank />
          <View style={styles.labels}>
            {row.map((toy) => (
              <View key={toy.key} style={styles.slot}>
                <Text
                  variant="label"
                  color={colors.textSoft}
                  align="center"
                  style={toy.locked && styles.lockedLabel}
                >
                  {toy.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * One toy. It squashes onto the plank under her finger and hops on release,
 * and only then opens — so the object answers before the screen changes.
 */
function ToyOnShelf({ toy }: { toy: Toy }) {
  const reduced = useReducedMotion();
  const lift = useSharedValue(0);
  const squash = useSharedValue(1);
  const busy = useRef(false);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scaleY: squash.value }, { scaleX: 2 - squash.value }],
  }));

  const press = () => {
    // A second tap mid-hop would open the screen twice.
    if (busy.current) return;
    if (reduced) {
      toy.onPress();
      return;
    }
    busy.current = true;
    squash.value = withSequence(withTiming(1.05, { duration: 110 }), withSpring(1, pieceSpring));
    lift.value = withSequence(withTiming(-14, { duration: 120 }), withSpring(0, pieceSpring));
    setTimeout(() => {
      busy.current = false;
      toy.onPress();
    }, HOP_MS);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={toy.locked ? `${toy.label}, ${strings.path.locked}` : toy.label}
      accessibilityState={{ disabled: !!toy.locked }}
      disabled={toy.locked}
      onPressIn={() => {
        if (!reduced) squash.value = withTiming(0.92, { duration: 80 });
      }}
      onPressOut={() => {
        if (!reduced && !busy.current) squash.value = withSpring(1, pieceSpring);
      }}
      onPress={press}
      hitSlop={6}
      style={[styles.toy, toy.locked && styles.locked]}
    >
      {/* Squashing about the bottom edge keeps the toy standing on the plank
          rather than shrinking into the air above it. */}
      <Animated.View style={[styles.art, style]}>{toy.art}</Animated.View>
      <View style={styles.footprint} />
    </Pressable>
  );
}

/** The plank: a lit top face, a darker front edge, and two brackets. */
function Plank() {
  return (
    <View style={styles.plank}>
      <View style={styles.plankTop} />
      <View style={styles.plankFront} />
      <Bracket style={styles.bracketLeft} />
      <Bracket style={[styles.bracketRight]} />
    </View>
  );
}

function Bracket({ style }: { style: object }) {
  return (
    <Svg width={10} height={14} viewBox="0 0 10 14" style={[styles.bracket, style]}>
      <Path d="M0 0 H10 V14 Z" fill={colors.walnut} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wall: { gap: 18, paddingBottom: 12 },
  row: { paddingHorizontal: 14 },
  toys: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
  labels: { flexDirection: 'row', justifyContent: 'center', paddingTop: 12 },
  slot: { width: TOY_WIDTH, marginHorizontal: 6, alignItems: 'center' },
  toy: { width: TOY_WIDTH, height: TOY_HEIGHT, alignItems: 'center', justifyContent: 'flex-end' },
  art: { transformOrigin: 'bottom' },
  // The soft shadow a thing casts on the plank it stands on.
  footprint: {
    position: 'absolute',
    bottom: -3,
    width: TOY_WIDTH * 0.72,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.shadow,
    opacity: 0.45,
  },
  // "Not yours yet" is opacity everywhere in the app.
  locked: { opacity: 0.3 },
  lockedLabel: { opacity: 0.4 },
  plank: { marginHorizontal: 4 },
  plankTop: {
    height: 8,
    backgroundColor: colors.frame,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  plankFront: {
    height: 12,
    backgroundColor: colors.frameEdge,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  bracket: { position: 'absolute', top: 20 },
  bracketLeft: { left: 24 },
  bracketRight: { right: 24, transform: [{ scaleX: -1 }] },
});
