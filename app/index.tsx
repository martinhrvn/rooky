import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { ALL_LEVELS, WORLDS, nextLevel, worldOf } from '../src/content';
import { currentWorld } from '../src/progress/selectors';
import { useCompletedIds, useProgress } from '../src/progress/store';
import { PieceTile } from '../src/ui/PieceTile';
import { strings } from '../src/ui/strings';
import { Text } from '../src/ui/Text';
import { TierRank } from '../src/ui/TierRank';
import { colors, layout } from '../src/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const completed = useCompletedIds();
  const profiles = useProgress((s) => s.profiles);
  const createProfile = useProgress((s) => s.createProfile);
  const hydrated = useProgress((s) => s.hydrated);

  // Until the avatar picker exists (Phase E), make sure there is somewhere for
  // results to be recorded. Waiting for hydration avoids stacking a second
  // profile on top of a saved one.
  useEffect(() => {
    if (hydrated && profiles.length === 0) createProfile('Player 1', 'wr');
  }, [hydrated, profiles.length, createProfile]);

  const resume = nextLevel(completed);
  const resumeWorld = worldOf(resume) ?? currentWorld(WORLDS, completed);
  const allDone = completed.size >= ALL_LEVELS.length;

  const label = allDone
    ? strings.home.replay
    : completed.size === 0
      ? strings.home.start
      : strings.home.continue;

  const tierLabel = strings.tiers[resume.tier];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="title" color={colors.green}>
          {strings.appName}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home.settings}
          onPress={() => {}}
          // Parent-facing, so deliberately small and out of the way.
          hitSlop={12}
          style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
        >
          <Gear />
        </Pressable>
      </View>

      <View style={styles.hero}>
        {/* The one control she has to find. It shows the piece she is about to
            play, so the screen says what happens next without being read. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${resumeWorld?.title ?? ''}`}
          onPress={() => router.push(`/play/${resume.id}`)}
          style={({ pressed }) => [styles.continueTile, pressed && styles.pressed]}
        >
          <PieceTile piece={resumeWorld?.icon ?? 'r'} size={168} ringed />
        </Pressable>

        <View style={styles.heroLabel}>
          <Text variant="display">{label}</Text>
          {resumeWorld ? (
            <Text variant="body" color={colors.textSoft}>
              {resumeWorld.title} · {tierLabel}
            </Text>
          ) : null}
        </View>

        {resumeWorld ? (
          <TierRank
            levels={resumeWorld.levels.filter((l) => l.tier === resume.tier)}
            completedIds={completed}
            // A progress readout, not a way in — the route to a specific level
            // is the selector. Continue is the only thing to tap here.
            interactive={false}
            squareSize={22}
          />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home.chooseAPiece}
          onPress={() => router.push('/pieces')}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text variant="button" color={colors.green}>
            {strings.home.chooseAPiece}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Gear() {
  return (
    <Svg width={24} height={24} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={14} stroke={colors.textSoft} strokeWidth={9} fill="none" />
      <Path
        d="M50 12 L50 24 M50 76 L50 88 M12 50 L24 50 M76 50 L88 50 M23 23 L32 32 M68 68 L77 77 M77 23 L68 32 M32 68 L23 77"
        stroke={colors.textSoft}
        strokeWidth={9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
  },
  gear: { padding: 8 },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  continueTile: { borderRadius: 40 },
  heroLabel: { alignItems: 'center', gap: 4 },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 20,
    alignItems: 'center',
  },
  secondary: {
    minHeight: layout.touchTarget,
    paddingHorizontal: 28,
    justifyContent: 'center',
    borderRadius: layout.touchTarget / 2,
    borderWidth: 2,
    borderColor: colors.green,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
