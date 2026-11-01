import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { CONFETTI_COUNT, Confetti, RewardStar, STAR_IMPACT_MS, STAR_STAGGER_MS } from './Celebration';
import { XpBar } from './XpBar';
import { colors, elevation, layout } from './theme';

/**
 * The card arriving: it rises into place rather than fading up, overshoots by
 * a few pixels and settles back. Ease-out-back — fast off the mark so the win
 * is answered at once, with the overshoot as the only flourish. It used to
 * fade in on a slow spring with the stars and confetti already going, and
 * the half-there card read as the game hanging.
 */
const CARD_IN = { duration: 300, easing: Easing.bezier(0.34, 1.35, 0.64, 1) };
/** How far below its place the card starts. */
const CARD_RISE = 56;
/** The dimming behind it. Quick, and a fade, because it is the room going dark, not a thing arriving. */
const SCRIM_MS = 150;

/**
 * Nothing on the card moves until the card is there. Starts a touch before
 * the overshoot finishes settling, so there is no dead beat between them.
 */
const STARS_AT_MS = CARD_IN.duration - 40;

/** How long the bar takes to travel to its new value. */
const FILL_MS = 700;

/**
 * Once the third star has hit, so the bar is the next beat after the slams
 * rather than something moving underneath them. Still finishes before the
 * campaign's auto-advance at 1.8s.
 */
const FILL_DELAY_MS = STARS_AT_MS + STAR_STAGGER_MS * 2 + STAR_IMPACT_MS + 100;

/** The buttons: in once the first star has hit, ease-out because they are arriving. */
const ACTIONS_DELAY_MS = STARS_AT_MS + STAR_IMPACT_MS + 120;
const ACTIONS_IN = { duration: 240, easing: Easing.bezier(0.165, 0.84, 0.44, 1) };

/**
 * The end of a level: what she earned, on a card over a dimmed board.
 *
 * This used to be drawn straight onto the board with no scrim, so the position
 * she had just finished stayed readable. That was right when the only thing to
 * show was three stars; it stopped being right once the XP bar and the way
 * onward had to live here too, because those are not board-shaped and were
 * landing on top of the pieces. The scrim is deliberately thin — the board is
 * still visible through it, which was the point of the original decision.
 *
 * **Still skippable with a single tap.** Levels get replayed constantly, and an
 * unskippable cutscene is torture by the fifth attempt. Tapping settles every
 * animation instantly rather than dismissing the card, so a tap always means
 * "get on with it" and never strands her on a finished board.
 */
export function WinDialog({
  earned,
  xpBefore,
  xpAfter,
  size,
  onSkipped,
  children,
}: {
  earned: 1 | 2 | 3;
  /** XP before this level paid out, so the bar can travel from it. */
  xpBefore: number;
  xpAfter: number;
  /** Board edge, so the confetti falls across the same width it used to. */
  size: number;
  /** Fires on the tap that settles the animation, for auto-advance timing. */
  onSkipped?: () => void;
  /** What happens next — the campaign's choices, or "another one". */
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const [skipped, setSkipped] = useState(false);

  // The bar renders whatever value it is given, so animating *the number* is
  // what makes it travel. Starting from `xpBefore` is why the fill reads as
  // this level's doing rather than as a bar that was always that full.
  const [shown, setShown] = useState(xpBefore);

  useEffect(() => {
    if (skipped || reduced) {
      setShown(xpAfter);
      return;
    }

    let frame = 0;
    const started = Date.now() + FILL_DELAY_MS;
    const step = () => {
      const elapsed = Date.now() - started;
      const t = Math.min(1, Math.max(0, elapsed / FILL_MS));
      setShown(xpBefore + (xpAfter - xpBefore) * t);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [skipped, reduced, xpBefore, xpAfter]);

  const card = useSharedValue(reduced ? 1 : 0);
  const scrim = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (skipped || reduced) {
      card.value = 1;
      scrim.value = 1;
      return;
    }
    card.value = withTiming(1, CARD_IN);
    scrim.value = withTiming(1, { duration: SCRIM_MS });
  }, [card, reduced, scrim, skipped]);

  const cardStyle = useAnimatedStyle(() => ({
    // Solid within the first quarter of the rise, so what she sees is the
    // card moving, never the card fading. Clamped: the overshoot takes the
    // value past 1.
    opacity: Math.min(1, card.value * 4),
    transform: [
      { translateY: (1 - card.value) * CARD_RISE },
      { scale: 0.92 + Math.min(card.value, 1) * 0.08 },
    ],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  // The way onward rises in just after the first star lands, so the stars
  // are the first thing she sees and the buttons arrive as "and now…".
  // Not pressable until they are there: a tap meant to skip must never land
  // on a button she could not yet see. Skipping brings them in at once.
  const actions = useSharedValue(0);
  const [actionsLive, setActionsLive] = useState(false);
  useEffect(() => {
    if (skipped || reduced) {
      actions.value = 1;
      setActionsLive(true);
      return;
    }
    actions.value = withDelay(ACTIONS_DELAY_MS, withTiming(1, ACTIONS_IN));
    const live = setTimeout(() => setActionsLive(true), ACTIONS_DELAY_MS + ACTIONS_IN.duration / 2);
    return () => clearTimeout(live);
  }, [actions, reduced, skipped]);

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actions.value,
    transform: [{ translateY: (1 - actions.value) * 14 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${earned} of 3 stars. Tap to continue.`}
      onPress={() => {
        setSkipped(true);
        onSkipped?.();
      }}
      style={StyleSheet.absoluteFill}
    >
      {/* Thin: the board underneath stays legible, which is the half of the
          old board-anchored design worth keeping. */}
      <Animated.View style={[styles.scrim, scrimStyle]} />

      {/* Confetti falls over the whole screen rather than the card, or it
          would be a card with glitter in it rather than a celebration. It
          waits for the card, like the stars, so the win lands as one beat. */}
      {reduced
        ? null
        : Array.from({ length: CONFETTI_COUNT }, (_, i) => (
            <Confetti key={i} index={i} size={size} skipped={skipped} startAt={STARS_AT_MS} />
          ))}

      <View style={styles.centre} pointerEvents="box-none">
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.stars}>
            {[0, 1, 2].map((i) => (
              <RewardStar
                key={i}
                index={i}
                filled={i < earned}
                size={56}
                skipped={skipped || reduced}
                startAt={STARS_AT_MS}
              />
            ))}
          </View>

          <XpBar xp={shown} height={16} />

          {children ? (
            <Animated.View
              style={[styles.actions, actionsStyle]}
              pointerEvents={actionsLive ? 'auto' : 'none'}
            >
              {children}
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 8, 16, 0.55)' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 340,
    gap: 20,
    padding: 22,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surface,
    ...elevation('raised'),
  },
  stars: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  /**
   * Centred, **not stretched**.
   *
   * `IconButton`'s shelf is drawn by its outer pressable and has no width of
   * its own, so stretching it spread a dark pill across the whole card with
   * the round face stranded at one end. A caller that genuinely wants full
   * width says so with `alignSelf: 'stretch'`, which overrides this — the
   * campaign's column of end-of-tier choices does exactly that.
   */
  actions: { gap: 10, alignItems: 'center', alignSelf: 'stretch' },
});
