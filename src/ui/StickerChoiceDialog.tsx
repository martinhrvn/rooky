import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { stickerById } from '../content/stickers';
import { usePendingOffer, useProgress } from '../progress/store';
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

  const scrimStyle = useAnimatedStyle(() => ({ opacity: open.value }));

  if (!hydrated || pending.length === 0) return null;

  return (
    <Animated.View style={[styles.host, scrimStyle]}>
      <View style={styles.card}>
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
              onChoose={() => chooseSticker(id)}
            />
          ))}
        </View>

        <Text variant="label" color={colors.textSoft} align="center">
          {strings.stickers.choose}
        </Text>
      </View>
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
  onChoose,
}: {
  index: number;
  id: string;
  reduced: boolean;
  onChoose: () => void;
}) {
  const arrive = useSharedValue(0);

  useEffect(() => {
    arrive.value = reduced
      ? 1
      : withDelay(OPEN_DELAY_MS + 200 + index * STAGGER_MS, withSpring(1, rewardSpring));
  }, [arrive, index, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: arrive.value,
    transform: [
      { scale: arrive.value },
      { rotate: `${(1 - arrive.value) * -180}deg` },
    ],
  }));

  const sticker = stickerById(id);

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={sticker.name}
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
