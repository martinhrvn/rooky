import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { nextLevel, soloPiece, worldOf } from '../src/content';
import { currentWorld, piecesPlayed } from '../src/progress/selectors';
import { useActiveProfile, useCompletedIds, useProgress } from '../src/progress/store';
import { Avatar } from '../src/ui/Avatar';
import { Button } from '../src/ui/Button';
import { ProfileForm } from '../src/ui/ProfileForm';
import { Glyph } from '../src/ui/IconButton';
import { MixCard } from '../src/ui/MixCard';
import { PieceTile } from '../src/ui/PieceTile';
import { strings } from '../src/ui/strings';
import { Text } from '../src/ui/Text';
import { TierRank } from '../src/ui/TierRank';
import { useCatalogue } from '../src/ui/useCatalogue';
import { colors, elevation, layout } from '../src/ui/theme';

/**
 * Levels finished before the Mix card appears.
 *
 * A "mix" of one or two levels is not a mix, and an extra card on a nearly
 * empty home screen is exactly the confusion this feature had to avoid.
 */
const MIN_FOR_MIX = 3;

export default function HomeScreen() {
  const router = useRouter();
  const completed = useCompletedIds();
  const catalogue = useCatalogue();
  const profile = useActiveProfile();
  const profiles = useProgress((s) => s.profiles);
  const createProfile = useProgress((s) => s.createProfile);
  const hydrated = useProgress((s) => s.hydrated);

  // Nothing at all until the saved state is back, or the first frame would
  // flash the first-run form at someone who already has a profile.
  if (!hydrated) return <SafeAreaView style={styles.screen} />;

  // First run. Rendered inline rather than as its own route so there is no
  // navigation flicker on the very first frame of the app.
  if (profiles.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <View style={styles.card}>
            <Text variant="display" align="center">
              {strings.profiles.title}
            </Text>
            <ProfileForm onCreate={createProfile} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const resume = nextLevel(catalogue, completed);
  const world = resume ? worldOf(catalogue, resume) : currentWorld(catalogue.worlds, completed);

  if (!resume || !world) return <SafeAreaView style={styles.screen} />;

  const tierLevels = world.levels.filter((l) => l.tier === resume.tier);
  const fresh = completed.size === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {/* Who is playing, always visible. The switching matters less than the
            fact that a sibling can no longer quietly play on the wrong
            profile for a week without anyone noticing. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${profile?.name ?? ''}. ${strings.profiles.switcher}`}
          onPress={() => router.push('/profiles')}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Avatar id={profile?.avatarId ?? ''} size={44} />
        </Pressable>

        <Text variant="title" color={colors.green} style={styles.wordmark}>
          {strings.appName}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home.settings}
          onPress={() => router.push('/settings')}
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
            <PieceTile pieces={world.cast} size={84} ringed />
            <View style={styles.cardTitle}>
              <Text variant="title">{world.title}</Text>
              {/* Label rather than body, so the difficulty sits under the
                  world name instead of competing with it. */}
              <Text variant="label" color={colors.textSoft}>
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
              kind="go"
              onPress={() => router.push(`/play/${resume.id}`)}
              style={styles.grow}
            />
            <Button
              icon="retry"
              label={strings.home.reset}
              kind="again"
              // Non-destructive: this opens level 1 again and leaves every
              // tick and star intact. She will press it constantly, often by
              // accident, and there is no confirm dialog she could read.
              onPress={() => router.push(`/play/${world.levels[0].id}`)}
            />
          </View>

          {/* Only where there is one piece to generate for. Endless walks a
              single piece around an empty board, which has nothing to say about
              a world built on what a move leaves behind. */}
          {soloPiece(world) ? (
            <Button
              icon="endless"
              label={strings.home.endless}
              kind="free"
              onPress={() => router.push(`/endless/${world.key}?tier=${resume.tier}`)}
            />
          ) : null}
        </View>

        {/* Only once there is genuinely something to mix. A new player never
            meets an empty second card and never has to wonder what it's for. */}
        {completed.size >= MIN_FOR_MIX ? (
          <MixCard
            pieces={piecesPlayed(catalogue.worlds, completed)}
            onPlay={() => router.push('/mix')}
          />
        ) : null}
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
    gap: 12,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
  },
  chip: { borderRadius: 24 },
  wordmark: { flex: 1 },
  gear: { padding: 8 },
  body: { flex: 1, justifyContent: 'center', padding: layout.screenPadding },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    padding: 22,
    gap: 18,
    ...elevation('raised'),
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardTitle: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: 12 },
  grow: { flex: 1 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
