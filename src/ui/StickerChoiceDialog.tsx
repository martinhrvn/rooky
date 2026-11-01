import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { stickerById } from '../content/stickers';
import { usePendingOffer, useProgress } from '../progress/store';
import { Sparks } from './Celebration';
import { StickerArt } from './StickerArt';
import { Text } from './Text';
import { strings } from './strings';
import { colors, elevation, layout, rewardSpring } from './theme';

/**
 * Beat before it opens.
 *
 * Long enough for the win card's bar to finish travelling, so the sticker
 * reads as the *result* of the bar filling rather than as a second thing that
 * happened at the same time.
 */
const OPEN_DELAY_MS = 1300;

/** Between each sticker arriving. Three beats, not one. */
const STAGGER_MS = 150;

/**
 * The idle rock, once they have landed: a few degrees each way over a couple
 * of seconds. Slow and small, because it runs for as long as she is deciding
 * and must invite a tap without nagging for one. In-out, because it is
 * something already on screen moving.
 */
const SWAY_DEG = 4;
const SWAY = { duration: 1100, easing: Easing.inOut(Easing.quad) };
const SWAY_HALF = { duration: 550, easing: Easing.inOut(Easing.quad) };

/** From her tap to the store being told: the pick, a breath, and the close. */
const CHOSEN_MS = 750;
const CLOSE_MS = 180;
/** The two she did not pick, leaving. */
const PASS_MS = 200;
/** The sticker tile's rough size, for the sparks to burst across. */
const STICKER_BOX = 80;

/**
 * The reward: three stickers, and she picks one.
 *
 * Mounted once at the root and driven entirely by `pending` in the store,
 * which is what makes it survive the app being killed. The offer is written
 * down *before* it is ever shown, so a choice interrupted by a flat battery or
 * a four-year-old wandering off is still waiting at the next launch — on
 * whatever screen she happens to open. Nothing she earned can evaporate.
 *
 * There is no way to dismiss it, and that is deliberate: the only exit is
 * picking one, none of the three is a wrong answer, and a "later" button would
 * be a way to lose a reward by pressing something.
 */
export function StickerChoiceDialog() {
  const hydrated = useProgress((s) => s.hydrated);
  const pending = usePendingOffer();
  const ensureOffer = useProgress((s) => s.ensureOffer);
  const chooseSticker = useProgress((s) => s.chooseSticker);
  const reduced = useReducedMotion();

  // Waits for hydration, or a launch would decide nothing was owed before the
  // saved XP had been read back off disk.
  useEffect(() => {
    if (hydrated) ensureOffer();
  }, [hydrated, ensureOffer]);

  /**
   * The one she tapped, while it celebrates. The store is only told once the
   * celebration is over, because telling it clears the offer and the dialog
   * with it — she would never see what she picked. If the app dies in that
   * moment the offer is still written down, so nothing is lost.
   */
  const [choice, setChoice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const offerKey = pending.join();
  useEffect(() => {
    setChoice(null);
  }, [offerKey]);

  const open = useSharedValue(0);
  useEffect(() => {
    if (pending.length === 0) {
      open.value = 0;
      return;
    }
    open.value = reduced
      ? 1
      : withDelay(OPEN_DELAY_MS, withTiming(1, { duration: 220 }));
  }, [pending.length, open, reduced]);

  const choose = (id: string) => {
    if (choice) return;
    if (reduced) {
      chooseSticker(id);
      return;
    }
    setChoice(id);
    open.value = withDelay(CHOSEN_MS - CLOSE_MS, withTiming(0, { duration: CLOSE_MS }));
    timer.current = setTimeout(() => chooseSticker(id), CHOSEN_MS);
  };

  const scrimStyle = useAnimatedStyle(() => ({ opacity: open.value }));
  // The card rises as the scrim comes up, so it arrives rather than appears.
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : (1 - open.value) * 24 }],
  }));

  if (!hydrated || pending.length === 0) return null;

  return (
    <Animated.View style={[styles.host, scrimStyle]}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Text variant="display" align="center">
          {strings.stickers.tada}
        </Text>

        <View style={styles.offer}>
          {pending.map((id, i) => (
            <Offered
              key={id}
              index={i}
              id={id}
              reduced={reduced}
              state={choice === null ? 'offered' : choice === id ? 'chosen' : 'passed'}
              onChoose={() => choose(id)}
            />
          ))}
        </View>

        <Text variant="label" color={colors.textSoft} align="center">
          {strings.stickers.choose}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * One sticker, arriving.
 *
 * Springs up from nothing with a half-turn, staggered behind the one before
 * it — the same trick the three stars use, and for the same reason: three
 * things landing together is one event, three things landing in sequence is
 * three.
 */
function Offered({
  index,
  id,
  reduced,
  state,
  onChoose,
}: {
  index: number;
  id: string;
  reduced: boolean;
  /** Still on offer, the one she picked, or one of the two she did not. */
  state: 'offered' | 'chosen' | 'passed';
  onChoose: () => void;
}) {
  const arrive = useSharedValue(0);
  /** A slow rock once it has landed: "pick me", for someone who cannot read "Choose one". */
  const sway = useSharedValue(0);
  /** 0 on offer; towards 1 as it is chosen or passed over. */
  const pick = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      arrive.value = 1;
      return;
    }
    const landed = OPEN_DELAY_MS + 200 + index * STAGGER_MS;
    arrive.value = withDelay(landed, withSpring(1, rewardSpring));
    // Out of step with its neighbours, so the three never rock as one block.
    sway.value = withDelay(
      landed + 400 + index * 260,
      withRepeat(
        withSequence(
          withTiming(1, SWAY_HALF),
          withTiming(-1, SWAY),
          withTiming(0, SWAY_HALF),
        ),
        -1,
      ),
    );
  }, [arrive, index, reduced, sway]);

  useEffect(() => {
    if (state === 'offered') return;
    sway.value = withTiming(0, { duration: 120 });
    if (state === 'chosen') {
      // Jumps up, wiggles "this one!", and settles a little larger than the
      // rest were — the only one left standing.
      pick.value = withSpring(1, rewardSpring);
      wiggle.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(-1, { duration: 110 }),
        withTiming(0.6, { duration: 100 }),
        withTiming(0, { duration: 90 }),
      );
    } else {
      // Exits, so ease-in: the two she did not pick step back and go.
      pick.value = withTiming(1, { duration: PASS_MS, easing: Easing.in(Easing.quad) });
    }
  }, [pick, state, sway, wiggle]);

  const style = useAnimatedStyle(() => {
    const chosen = state === 'chosen';
    const passed = state === 'passed';
    return {
      opacity: arrive.value * (passed ? 1 - pick.value : 1),
      transform: [
        { translateY: chosen ? pick.value * -10 : 0 },
        {
          scale:
            arrive.value * (chosen ? 1 + pick.value * 0.2 : passed ? 1 - pick.value * 0.4 : 1),
        },
        {
          rotate: `${(1 - arrive.value) * -180 + sway.value * SWAY_DEG + wiggle.value * 12}deg`,
        },
      ],
    };
  });

  const sticker = stickerById(id);

  return (
    <Animated.View style={style}>
      {state === 'chosen' ? <Sparks size={STICKER_BOX} delay={120} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={sticker.name}
        accessibilityState={{ selected: state === 'chosen' }}
        disabled={state !== 'offered'}
        onPress={onChoose}
        style={({ pressed }) => [styles.offered, pressed && styles.pressed]}
      >
        <StickerArt id={id} size={56} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    // Heavier than the win card's scrim: there is nothing behind this worth
    // reading, and the stickers are the only thing that should be lit.
    backgroundColor: 'rgba(13, 8, 16, 0.82)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    gap: 18,
    padding: 22,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surface,
    ...elevation('raised'),
  },
  offer: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  offered: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    paddingHorizontal: 12,
    paddingVertical: 16,
    ...elevation('raised'),
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});
