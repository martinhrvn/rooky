import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { STAR_PATH } from './Star';
import { colors } from './theme';

/**
 * The two moving parts of a win, kept apart from where they are arranged.
 *
 * They were one board-anchored component until the XP bar and the way onward
 * had to be shown alongside the stars — none of which is board-shaped. The
 * arrangement now lives in `WinDialog`; what stays here is the confetti and
 * the star that springs in, which are the same wherever they are put.
 *
 * Both settle instantly when `skipped`. That is what keeps the win skippable
 * mid-flight, which matters more than the animation does: levels get replayed
 * constantly, and an unskippable cutscene is torture by the fifth attempt.
 */
export const CONFETTI_COUNT = 22;

const CONFETTI_COLORS = [colors.lightSquare, colors.darkSquare, colors.star, colors.greenLight];

/** Between each star. Three slams, not one. */
export const STAR_STAGGER_MS = 220;

/**
 * The slam: a star starts well over its size, above the card in depth, and
 * drops onto its slot on an ease-in — accelerating, so it *hits* rather than
 * arrives. On impact it squashes under its own weight and springs back with a
 * bounce. Impact is the moment everything else keys off: the ring, the
 * sparks and the thump in the hand.
 */
export const STAR_IMPACT_MS = 170;
const SLAM_FROM = 2.6;
const SLAM = { duration: STAR_IMPACT_MS, easing: Easing.in(Easing.cubic) };
const SQUASH_TO = 0.78;
const SQUASH_MS = 60;
/** Underdamped on purpose: two visible bounces after the hit, then still. */
const REBOUND_SPRING = { damping: 7, stiffness: 320, mass: 0.6 };

const SHOCK_MS = 420;
const SPARK_COUNT = 10;
const SPARK_MS = 520;

export function RewardStar({
  index,
  filled,
  size,
  skipped,
  startAt = 0,
}: {
  index: number;
  filled: boolean;
  size: number;
  skipped: boolean;
  /** When the first star may start, in ms: once whatever it sits on has arrived. */
  startAt?: number;
}) {
  const settled = skipped || !filled;
  const scale = useSharedValue(settled ? 1 : SLAM_FROM);
  const shown = useSharedValue(settled ? 1 : 0);
  const spin = useSharedValue(settled ? 0 : 1);

  // Staggered so three stars land as three separate beats rather than one.
  const delay = startAt + index * STAR_STAGGER_MS;
  const impact = delay + STAR_IMPACT_MS;

  useEffect(() => {
    if (!filled) return;
    if (skipped) {
      scale.value = 1;
      shown.value = 1;
      spin.value = 0;
      return;
    }
    shown.value = withDelay(delay, withTiming(1, { duration: 70 }));
    spin.value = withDelay(delay, withTiming(0, SLAM));
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, SLAM),
        withTiming(SQUASH_TO, { duration: SQUASH_MS, easing: Easing.out(Easing.quad) }),
        withSpring(1, REBOUND_SPRING),
      ),
    );
    // A thump in the hand as each one hits: one, two, three.
    const thump = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
      impact,
    );
    return () => clearTimeout(thump);
  }, [delay, filled, impact, scale, shown, skipped, spin]);

  // Into its own slot, never in from the side or the top — the slot is
  // already there saying where it goes, so the only travel is towards her
  // and down. Invisible until it starts, so the slot shows through.
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ rotate: `${spin.value * -25}deg` }, { scale: scale.value }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      {/* The slot: every star the level offers, there from the moment the
          card is, dimmed. An earned one fills it; one she did not get stays
          a slot to fill next time — the same opacity language as anything
          else not hers yet, and never a gap in the row. */}
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path
          d={STAR_PATH}
          fill={SLOT_FILL}
          stroke={SLOT_EDGE}
          strokeWidth={9}
          strokeLinejoin="round"
        />
      </Svg>
      {filled && !skipped ? (
        <>
          <Shockwave size={size} delay={impact} />
          <Sparks size={size} delay={impact} />
        </>
      ) : null}
      {filled ? (
        <Animated.View style={[StyleSheet.absoluteFill, style]}>
          {/* Heavier stroke than the board's stars: these are drawn large on
              a card and need an edge that holds at that size. */}
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Path
              d={STAR_PATH}
              fill={colors.star}
              stroke={colors.starEdge}
              strokeWidth={9}
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A star's empty slot: cream at low strength, so it reads as "a star goes here" and not as one earned. */
const SLOT_FILL = 'rgba(242, 237, 228, 0.12)';
const SLOT_EDGE = 'rgba(242, 237, 228, 0.3)';

/**
 * The hit, drawn: a gold ring thrown out from the slot as the star lands,
 * thinning as it goes. Ease-out, because it is the impact's energy leaving.
 */
function Shockwave({ size, delay }: { size: number; delay: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: SHOCK_MS, easing: Easing.out(Easing.cubic) }));
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 0.9 * (1 - t.value),
    transform: [{ scale: 0.5 + t.value * 1.3 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shock,
        { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(2, size * 0.06) },
        style,
      ]}
    />
  );
}

/**
 * A burst of gold specks thrown off a star as it lands. Gold because this
 * *is* the reward — the one place in the app the colour is spent freely.
 *
 * Uneven on purpose: alternate specks fly further and are bigger, in two
 * golds, so it reads as a burst rather than as a ring of dots.
 */
export function Sparks({ size, delay }: { size: number; delay: number }) {
  return (
    <>
      {Array.from({ length: SPARK_COUNT }, (_, i) => (
        <Spark
          key={i}
          angle={(i / SPARK_COUNT) * Math.PI * 2 - Math.PI / 2 + (i % 2) * 0.2}
          far={i % 2 === 0}
          size={size}
          delay={delay}
        />
      ))}
    </>
  );
}

function Spark({
  angle,
  far,
  size,
  delay,
}: {
  angle: number;
  far: boolean;
  size: number;
  delay: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    // Fast out of the impact and slowing as it goes, like something thrown.
    t.value = withDelay(delay, withTiming(1, { duration: SPARK_MS, easing: Easing.out(Easing.poly(4)) }));
  }, [delay, t]);

  const dot = Math.max(5, Math.round(size * (far ? 0.15 : 0.1)));
  const reach = size * (far ? 1.15 : 0.8);

  const style = useAnimatedStyle(() => ({
    // Full strength for the first part of the flight, then gone.
    opacity: t.value === 0 ? 0 : Math.min(1, (1 - t.value) * 2.5),
    transform: [
      { translateX: Math.cos(angle) * reach * t.value },
      { translateY: Math.sin(angle) * reach * t.value },
      { scale: 1.2 - t.value * 0.8 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.spark,
        {
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          left: (size - dot) / 2,
          top: (size - dot) / 2,
          backgroundColor: far ? colors.starHigh : colors.star,
        },
        style,
      ]}
    />
  );
}


export function Confetti({
  index,
  size,
  skipped,
  startAt = 0,
}: {
  index: number;
  size: number;
  skipped: boolean;
  /** When the first piece may start falling, in ms. */
  startAt?: number;
}) {
  // Deterministic spread from the index — no randomness needed, and it keeps
  // the distribution even rather than clumpy.
  const startX = ((index * 37) % 100) / 100;
  const drift = (((index * 53) % 40) - 20) / 100;
  const delay = startAt + (index % 6) * 90;
  const duration = 1400 + ((index * 71) % 700);
  const colour = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const width = 7 + (index % 3) * 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (skipped) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.in(Easing.quad) }),
    );
  }, [delay, duration, skipped, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value > 0.85 ? (1 - progress.value) / 0.15 : 1,
    transform: [
      { translateX: startX * size + drift * size * progress.value },
      { translateY: -20 + progress.value * (size + 40) },
      { rotate: `${progress.value * 540 + index * 30}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.confetti,
        { width, height: width * 1.6, backgroundColor: colour, borderRadius: 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  confetti: { position: 'absolute', top: 0, left: 0 },
  spark: { position: 'absolute' },
  shock: { position: 'absolute', left: 0, top: 0, borderColor: colors.star },
});
