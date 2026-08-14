import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Achievement } from '../progress/achievements';
import { useProgress } from '../progress/store';
import { AchievementIcon } from './AchievementIcon';
import { Text } from './Text';
import { XpBar } from './XpBar';
import { strings } from './strings';
import { colors, elevation, layout, rewardSpring } from './theme';

/** How long one stays up before the next takes its place. */
const SHOW_MS = 2800;

/** Long enough for the stars on the win card to land first. */
const FIRST_DELAY_MS = 900;

const FILL_MS = 600;

/**
 * Announces achievements as they are earned, over whatever is on screen.
 *
 * Mounted once at the root rather than per play screen, so the campaign,
 * Endless and Mix all get it for free and none of them has to thread
 * achievements down into the board.
 *
 * It only ever fires from `settle`, which runs when a level ends — so nothing
 * lands mid-level. That matters most for the three that reward failing: a
 * reward arriving during the rewind would land on top of the moment her piece
 * was taken, which is the one moment it must not.
 */
export function AchievementToasts() {
  const settlement = useProgress((s) => s.lastSettlement);
  const clearSettlement = useProgress((s) => s.clearSettlement);
  const [queue, setQueue] = useState<{ achievement: Achievement; from: number; to: number }[]>([]);

  useEffect(() => {
    if (!settlement) return;
    clearSettlement();
    if (settlement.achievements.length === 0) return;

    // Each toast's bar covers its own slice of the settlement, so three
    // achievements read as three separate contributions rather than three
    // copies of the same jump. The level's own XP is paid first.
    let running = settlement.xpBefore + (settlement.xp - sumXp(settlement.achievements));
    setQueue(
      settlement.achievements.map((achievement) => {
        const from = running;
        running += achievement.xp;
        return { achievement, from, to: running };
      }),
    );
  }, [settlement, clearSettlement]);

  useEffect(() => {
    if (queue.length === 0) return;
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => clearTimeout(timer);
  }, [queue]);

  const current = queue[0];
  if (!current) return null;

  return (
    <SafeAreaView style={styles.host} edges={['top']} pointerEvents="box-none">
      <Toast
        key={current.achievement.id}
        achievement={current.achievement}
        from={current.from}
        to={current.to}
        onDismiss={() => setQueue((q) => q.slice(1))}
      />
    </SafeAreaView>
  );
}

const sumXp = (achievements: readonly Achievement[]) =>
  achievements.reduce((total, a) => total + a.xp, 0);

function Toast({
  achievement,
  from,
  to,
  onDismiss,
}: {
  achievement: Achievement;
  from: number;
  to: number;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(from);

  const drop = useSharedValue(0);
  useEffect(() => {
    drop.value = reduced ? 1 : withSpring(1, rewardSpring);
  }, [drop, reduced]);

  useEffect(() => {
    if (reduced) {
      setShown(to);
      return;
    }
    let frame = 0;
    const started = Date.now() + FIRST_DELAY_MS / 2;
    const step = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - started) / FILL_MS));
      setShown(from + (to - from) * t);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: withTiming(drop.value, { duration: 160 }),
    transform: [{ translateY: -30 + drop.value * 30 }],
  }));

  const name = strings.achievementNames[achievement.counter] ?? achievement.counter;

  return (
    <Animated.View style={[styles.wrap, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        // Straight to the achievements. It used to go to the stickers, because
        // the achievements had nowhere of their own — now that they do, the
        // badge she just tapped is on the screen she lands on.
        onPress={() => {
          onDismiss();
          router.push('/achievements');
        }}
        style={({ pressed }) => [styles.toast, pressed && styles.pressed]}
      >
        <View style={styles.icon}>
          <AchievementIcon
            piece={achievement.piece}
            mark={achievement.mark}
            size={34}
            id={`toast-${achievement.id}`}
          />
        </View>

        <View style={styles.body}>
          <Text variant="label" numberOfLines={1}>
            {name}
          </Text>
          <XpBar xp={shown} height={10} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, alignItems: 'center' },
  wrap: { width: '100%', maxWidth: 360, paddingHorizontal: layout.screenPadding, paddingTop: 8 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surfaceRaised,
    ...elevation('raised'),
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  icon: { width: 38, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 6 },
});
