import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import type { PieceType } from '../../src/chess/types';
import { nextLevel, worldOf } from '../../src/content';
import { currentWorld, piecesPlayed } from '../../src/progress/selectors';
import { useActiveProfile, useCompletedIds, useProgress, useXp } from '../../src/progress/store';
import { Avatar } from '../../src/ui/Avatar';
import { Button } from '../../src/ui/Button';
import { ProfileForm } from '../../src/ui/ProfileForm';
import { pieceArt } from '../../src/ui/pieces';
import { strings } from '../../src/ui/strings';
import { Text } from '../../src/ui/Text';
import { useCatalogue } from '../../src/ui/useCatalogue';
import { XpBar } from '../../src/ui/XpBar';
import { colors, elevation, layout } from '../../src/ui/theme';

/**
 * Levels finished before Mix appears.
 *
 * A "mix" of one or two levels is not a mix, and an extra button on a home
 * screen this bare is exactly the confusion the mode had to avoid.
 */
const MIN_FOR_MIX = 3;

/** Most pieces on the Mix button before the row starts to crowd it. */
const MAX_MIX_PIECES = 5;

/**
 * Home: where she is, and the way on.
 *
 * Deliberately almost empty. Everything that used to live here — the rank of
 * squares, the world card, the per-world Endless button — either moved onto
 * the path or went away, because the one job this screen has is to be a Play
 * button she cannot miss.
 *
 * The bottom bar took the last of the doorways with it: "Choose a level" is
 * the Levels tab now. What is left is Play, and Mix — which stays only because
 * it is the one mode with no tab, and cannot have one, since a tab that opened
 * a board would put chrome under it.
 *
 * The hero is the piece rather than a heading: it says which world Play will
 * open to someone who cannot read the words underneath it.
 */
export default function HomeScreen() {
  const router = useRouter();
  const completed = useCompletedIds();
  const catalogue = useCatalogue();
  const profile = useActiveProfile();
  const profiles = useProgress((s) => s.profiles);
  const createProfile = useProgress((s) => s.createProfile);
  const hydrated = useProgress((s) => s.hydrated);
  const xp = useXp();

  // Nothing at all until the saved state is back, or the first frame would
  // flash the first-run form at someone who already has a profile.
  if (!hydrated) return <SafeAreaView style={styles.screen} />;

  // First run. Rendered inline rather than as its own route so there is no
  // navigation flicker on the very first frame of the app.
  if (profiles.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.body}
        >
          <View style={styles.card}>
            <Text variant="display" align="center">
              {strings.profiles.title}
            </Text>
            <ProfileForm onCreate={createProfile} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const resume = nextLevel(catalogue, completed);
  const world = resume ? worldOf(catalogue, resume) : currentWorld(catalogue.worlds, completed);

  if (!resume || !world) return <SafeAreaView style={styles.screen} />;

  const played = piecesPlayed(catalogue.worlds, completed);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
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

        {/* The bar is the reward, so the bar is the way to the rewards. It
            takes the wordmark's place rather than sitting beside it: what she
            has earned is more use to her than the app's name, which she
            cannot read anyway.

            No "you have one waiting" state here — `StickerChoiceDialog` opens
            over this screen by itself and cannot be dismissed without
            choosing, so a prompt would only ever be visible in a state that
            cannot happen. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.stickers.title}
          onPress={() => router.push('/stickers')}
          style={({ pressed }) => [styles.wordmark, pressed && styles.pressed]}
        >
          <XpBar xp={xp} />
        </Pressable>

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
        <View style={styles.hero}>
          <Cast pieces={world.cast} size={96} />
          <Text variant="display" align="center">
            {world.title}
          </Text>
          <Text variant="label" color={colors.textSoft} align="center">
            {strings.tiers[resume.tier]}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            icon="play"
            label={strings.home.play}
            kind="go"
            onPress={() => router.push(`/play/${resume.id}`)}
          />

          {/* Only once there is genuinely something to mix. The row of pieces
              is what keeps this distinct from Endless without a word being
              read — one piece means a single world, several mean all of them —
              so it survives the Mix card no longer being on this screen. */}
          {completed.size >= MIN_FOR_MIX ? (
            <Button
              icon="shuffle"
              iconNode={<Cast pieces={played.slice(0, MAX_MIX_PIECES)} size={30} />}
              label={strings.mix.play}
              kind="free"
              onPress={() => router.push('/mix')}
            />
          ) : null}

          {/* "Choose a level" used to sit here and is now the Levels tab, an
              inch below itself. Mix stays because nothing on the bar is Mix —
              it is the one mode without a place of its own, and it should not
              get one: a tab for it would open a board, which is the line this
              navigation draws. */}
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * A world's pieces, overlapped like a hand of cards.
 *
 * One piece means a world about that piece; several mean a world about an
 * idea, or — on the Mix button — every piece she has played. The count is the
 * whole signal, which is why both callers share this rather than drawing it
 * twice and drifting apart.
 */
function Cast({ pieces, size }: { pieces: readonly PieceType[]; size: number }) {
  return (
    <View style={styles.cast}>
      {pieces.map((piece, i) => {
        const Art = pieceArt('w', piece);
        return (
          <View key={`${piece}-${i}`} style={{ marginLeft: i === 0 ? 0 : -size * 0.38 }}>
            <Art width={size} height={size} />
          </View>
        );
      })}
    </View>
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
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 40,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentWidth,
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', gap: 6 },
  cast: { flexDirection: 'row', alignItems: 'center' },
  actions: { gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    padding: 22,
    gap: 18,
    ...elevation('raised'),
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
