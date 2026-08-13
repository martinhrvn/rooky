import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';

import type { TierState } from '../progress/selectors';
import { Text } from './Text';
import { colors, layout } from './theme';

/** Diameter of a circle on the path. Comfortably past the 44pt tap target. */
const SIZE = 76;

/**
 * One numbered stop on the path.
 *
 * The number is an *ordinal*, not a count — "the second thing you play in the
 * Queen", not "two of something". That distinction is why it is allowed to be
 * a numeral at all on a screen built for someone who cannot read: 1, 2 and 3
 * are shapes a four-year-old knows long before words, they say only which
 * order the circles go in, and the selector is the screen where an adult is
 * expected to help. Counts elsewhere in the app stay pips.
 *
 * State is carried by fill, exactly like the buttons: jade means finished,
 * cream means this is where she is, and a sunk plum circle means shut. The
 * tick and the padlock are details inside those shapes rather than the thing
 * being read.
 */
export function PathNode({
  number,
  state,
  current,
  label,
  shineId,
  onPress,
}: {
  /** Position among the tiers this world actually has, counted from one. */
  number: number;
  state: TierState;
  /** True for the one circle the Play button would open. */
  current: boolean;
  /** Screen readers and adults only; the circle never renders it. */
  label: string;
  /**
   * Unique per circle on screen. Clip-path ids resolve per SVG root, and
   * react-native-svg has historically leaked them between roots on Android.
   */
  shineId: string;
  onPress: () => void;
}) {
  const locked = state === 'locked';
  const face = current
    ? { fill: colors.lightSquare, ink: colors.inkOnAccent, shelf: colors.darkSquare }
    : state === 'done'
      ? { fill: colors.green, ink: colors.inkOnAccent, shelf: colors.greenShelf }
      : { fill: colors.surfaceRaised, ink: colors.text, shelf: colors.surface };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: locked, selected: current }}
      disabled={locked}
      onPress={onPress}
      style={[
        styles.shelf,
        { backgroundColor: locked ? colors.surface : face.shelf },
        locked && styles.locked,
      ]}
    >
      {({ pressed }) => (
        // The same shelf mechanic as every button: padding rather than an
        // offset, so the circle keeps its intrinsic size and the total height
        // never changes as it is pressed.
        <View
          pointerEvents="none"
          style={{
            paddingTop: pressed ? layout.shelf : 0,
            paddingBottom: pressed ? 0 : layout.shelf,
          }}
        >
          <View style={[styles.face, { backgroundColor: face.fill }]}>
            {/* A struck highlight across the top-left, which is what makes a
                flat disc read as a minted counter rather than as a dot. Under
                the number so it never fights it. */}
            <Shine size={SIZE} id={shineId} />
            <Text variant="display" color={face.ink}>
              {number}
            </Text>
            {state === 'done' ? <Tick /> : null}
            {locked ? <Padlock /> : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

/**
 * The lit face of the circle.
 *
 * A wedge across the upper-left at low opacity: enough to suggest the thing is
 * struck metal, not enough to become a second shape inside the circle.
 */
function Shine({ size, id }: { size: number; id: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Defs>
        {/* Clipped in SVG rather than by `overflow: hidden` on the circle —
            that would also cut the tick and the padlock, which deliberately
            hang off the rim. */}
        <ClipPath id={id}>
          <Circle cx={50} cy={50} r={50} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <Path d="M0 0 L58 0 L0 74 Z" fill={colors.text} opacity={0.16} />
        <Path d="M72 0 L92 0 L0 96 L0 88 Z" fill={colors.text} opacity={0.08} />
      </G>
    </Svg>
  );
}

/** Sits on the rim rather than over the number, which has to stay readable. */
function Tick() {
  return (
    <View style={styles.badge}>
      <Svg width={20} height={20} viewBox="0 0 100 100">
        <Path
          d="M22 52 L42 72 L78 28"
          stroke={colors.inkOnAccent}
          strokeWidth={16}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function Padlock() {
  return (
    <View style={styles.badge}>
      <Svg width={18} height={18} viewBox="0 0 100 100">
        <Path
          d="M28 46 h44 a6 6 0 0 1 6 6 v32 a6 6 0 0 1 -6 6 h-44 a6 6 0 0 1 -6 -6 v-32 a6 6 0 0 1 6 -6 z"
          fill={colors.textSoft}
        />
        <Path
          d="M36 46 V32 a14 14 0 0 1 28 0 V46"
          stroke={colors.textSoft}
          strokeWidth={10}
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: {
    width: SIZE,
    borderRadius: (SIZE + layout.shelf) / 2,
  },
  face: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Shut circles lose their shelf as well as their colour — nothing to press. */
  locked: { opacity: 0.55 },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    padding: 3,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
});
