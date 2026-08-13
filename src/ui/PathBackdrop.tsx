import { StyleSheet } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { ribbons } from './theme';

/**
 * How much slower than the path the backdrop travels.
 *
 * Low on purpose. Parallax reads as depth up to a point and as a bug past it —
 * if the eye can measure the lag against the circles it is too much.
 */
const DRIFT = 0.3;

/** Tall enough that scrolling never runs off the bottom of the lights. */
const HEIGHT = 2400;

/**
 * Soft pools of colour behind the path, drifting slower than it.
 *
 * The path is one long dark column, and nothing about scrolling it says how
 * far she has come. These give the screen a back wall to move against — the
 * cheapest possible sense of depth, and the only one available without
 * illustration.
 *
 * Every colour here is a ribbon or accent hue at a tenth of its strength, so
 * the backdrop is the palette out of focus rather than anything new.
 */
export function PathBackdrop({ scrollY }: { scrollY: SharedValue<number> }) {
  const reduced = useReducedMotion();

  const style = useAnimatedStyle(() => ({
    // Reduced motion keeps the lights and drops the drift. They are still
    // worth having as a static wash; it is the movement that is the hazard.
    transform: [{ translateY: reduced ? 0 : -scrollY.value * DRIFT }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.backdrop, style]}>
      <Svg width="100%" height={HEIGHT} viewBox="0 0 100 600" preserveAspectRatio="none">
        <Defs>
          {GLOWS.map(({ id, color }) => (
            <RadialGradient key={id} id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <Stop offset="60%" stopColor={color} stopOpacity={0.08} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {GLOWS.map(({ id, cx, cy, r }) => (
          <Circle key={id} cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/**
 * Placed on the 100x600 canvas the SVG stretches over, alternating sides so
 * the column never looks lit from one edge.
 */
const GLOWS = [
  { id: 'glow-a', color: ribbons[0].band, cx: 18, cy: 60, r: 52 },
  { id: 'glow-b', color: ribbons[1].band, cx: 84, cy: 210, r: 58 },
  { id: 'glow-c', color: ribbons[2].band, cx: 22, cy: 360, r: 54 },
  { id: 'glow-d', color: ribbons[0].band, cx: 78, cy: 510, r: 50 },
] as const;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // Anchored at the top and taller than the screen, so the drift always has
    // somewhere to go.
    bottom: undefined,
    height: HEIGHT,
  },
});
