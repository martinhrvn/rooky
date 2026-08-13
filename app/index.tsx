import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { WORLDS, nextLevel, worldOf } from '../src/content';
import { currentWorld } from '../src/progress/selectors';
import { useCompletedIds, useProgress } from '../src/progress/store';
import { Button } from '../src/ui/Button';
import { Glyph } from '../src/ui/IconButton';
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
  const world = resume ? worldOf(resume) : currentWorld(WORLDS, completed);

  if (!resume || !world) return <SafeAreaView style={styles.screen} />;

  const tierLevels = world.levels.filter((l) => l.tier === resume.tier);
  const fresh = completed.size === 0;

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

      <View style={styles.body}>
        {/* One card holds the whole piece: which one, how far in, and every
            way to play it. More modes land here rather than as loose buttons
            scattered around the screen. */}
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${world.title}. ${strings.home.changePiece}`}
            onPress={() => router.push('/pieces')}
            style={({ pressed }) => [styles.cardHead, pressed && styles.pressed]}
          >
            <PieceTile piece={world.icon} size={84} ringed />
            <View style={styles.cardTitle}>
              <Text variant="title">{world.title}</Text>
              <Text variant="body" color={colors.textSoft}>
                {strings.tiers[resume.tier]}
              </Text>
            </View>
            {/* Chevron marks the whole row as the way to another piece. */}
            <Glyph name="forward" size={22} color={colors.textSoft} />
          </Pressable>

          <TierRank
            levels={tierLevels}
            completedIds={completed}
            interactive={false}
            squareSize={24}
          />

          <View style={styles.actions}>
            <Button
              icon="play"
              label={fresh ? strings.home.start : strings.home.play}
              variant="primary"
              onPress={() => router.push(`/play/${resume.id}`)}
              style={styles.grow}
            />
            <Button
              icon="retry"
              label={strings.home.reset}
              // Non-destructive: this opens level 1 again and leaves every
              // tick and star intact. She will press it constantly, often by
              // accident, and there is no confirm dialog she could read.
              onPress={() => router.push(`/play/${world.levels[0].id}`)}
            />
          </View>

          <Button
            icon="endless"
            label={strings.home.endless}
            onPress={() => router.push(`/endless/${world.key}?tier=${resume.tier}`)}
          />
        </View>
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
  body: { flex: 1, justifyContent: 'center', padding: layout.screenPadding },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 20,
    gap: 18,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardTitle: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: 12 },
  grow: { flex: 1 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
