import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FULL_CATALOGUE, type World } from '../src/content';
import type { Level } from '../src/game/types';
import { ACHIEVEMENTS } from '../src/progress/achievements';
import { useCompletedIds, useProgress } from '../src/progress/store';
import { XP_PER_STICKER } from '../src/progress/xp';
import { Button } from '../src/ui/Button';
import { IconButton } from '../src/ui/IconButton';
import { PieceTile } from '../src/ui/PieceTile';
import { strings } from '../src/ui/strings';
import { Text } from '../src/ui/Text';
import { colors, elevation, layout, type as typeScale } from '../src/ui/theme';

/**
 * The developer panel.
 *
 * Reached only by tapping the version line on the settings screen seven times,
 * and never linked from anywhere. That matters: everything here writes
 * straight to saved progress with no undo, so it has to sit somewhere a child
 * mashing at the screen cannot arrive by accident.
 *
 * It works against the FULL catalogue rather than the active one, because the
 * point is to reach states regardless of the difficulty ceiling.
 */
export default function DevScreen() {
  const router = useRouter();
  const completed = useCompletedIds();
  const resetProgress = useProgress((s) => s.resetProgress);
  const completeLevels = useProgress((s) => s.completeLevels);
  const bump = useProgress((s) => s.bump);
  const extendStreak = useProgress((s) => s.extendStreak);
  const settle = useProgress((s) => s.settle);
  const grantAlbum = useProgress((s) => s.grantAlbum);
  const results = useProgress((s) =>
    s.activeProfileId ? (s.results[s.activeProfileId] ?? {}) : {},
  );

  /** Three stars at par: a lie about how she played, but the state you want. */
  const finish = (levels: readonly Level[]) =>
    completeLevels(levels.map((l) => ({ levelId: l.id, stars: 3, bestMoves: l.par })));

  const confirm = (message: string, action: () => void) =>
    Alert.alert(strings.dev.title, message, [
      { text: strings.settings.cancel, style: 'cancel' },
      { text: strings.settings.confirm, style: 'destructive', onPress: action },
    ]);

  const through = (world: World) => {
    const index = FULL_CATALOGUE.worlds.findIndex((w) => w.key === world.key);
    finish(FULL_CATALOGUE.worlds.slice(0, index + 1).flatMap((w) => w.levels));
  };

  const stars = Object.values(results).reduce((sum, r) => sum + r.stars, 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton
          name="back"
          onPress={() => router.back()}
          accessibilityLabel={strings.play.back}
        />
        <Text variant="title">{strings.dev.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="body" color={colors.textSoft}>
          {strings.dev.warning}
        </Text>

        <View style={styles.section}>
          <Button
            icon="retry"
            label={strings.dev.resetProfile}
            kind="again"
            onPress={() => confirm(strings.settings.startOverConfirm, resetProgress)}
          />
          <Button
            icon="levelUp"
            label={strings.dev.completeAll}
            kind="free"
            onPress={() =>
              confirm(strings.dev.completeAll, () => finish(FULL_CATALOGUE.levels))
            }
          />
        </View>

        <View style={styles.section}>
          <Text variant="title">{strings.dev.completeThrough}</Text>
          <View style={styles.pieces}>
            {FULL_CATALOGUE.worlds.map((world) => (
              <View key={world.key} style={styles.piece}>
                <PieceTile pieces={world.cast} size={44} />
                <Button
                  icon="levelUp"
                  label={world.title}
                  kind="plain"
                  onPress={() => confirm(world.title, () => through(world))}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Reaching a reward state by hand. Without these, testing the choice
            screen means playing five levels and testing "taken 25 times"
            means losing a rook twenty-five times. */}
        <View style={styles.section}>
          <Text variant="title">{strings.dev.rewards}</Text>
          <Button
            icon="levelUp"
            label={strings.dev.grantSticker}
            kind="free"
            onPress={() => settle(XP_PER_STICKER)}
          />
          <Button
            icon="levelUp"
            label={strings.dev.grantAchievements}
            kind="free"
            onPress={() =>
              confirm(strings.dev.grantAchievements, () => {
                // Every tally straight to its highest threshold, so one settle
                // pays out the whole catalogue at once.
                bump(ACHIEVEMENTS.flatMap((a) => Array<string>(a.threshold).fill(a.counter)));
                for (const a of ACHIEVEMENTS) {
                  if (a.kind === 'streak') {
                    for (let i = 0; i < a.threshold; i += 1) extendStreak(a.counter);
                  }
                }
                settle(0);
              })
            }
          />
          <Button
            icon="shuffle"
            label={strings.dev.grantAlbum}
            kind="plain"
            onPress={() => confirm(strings.dev.grantAlbum, grantAlbum)}
          />
        </View>

        {/* The old world-card selector, kept alive while the numbered path
            proves itself. It is no longer linked from home, and a route with
            no link into it is a route nobody opens by mistake — but it is also
            one nobody can compare against, hence this. Delete both together
            once the path has settled. */}
        <View style={styles.section}>
          <Text variant="title">{strings.dev.oldSelector}</Text>
          <Button
            icon="path"
            label={strings.dev.openOldSelector}
            kind="plain"
            onPress={() => router.push('/pieces')}
          />
        </View>

        <View style={styles.section}>
          <Text variant="title">{strings.dev.state}</Text>
          <Text variant="body" color={colors.textSoft}>
            {completed.size} / {FULL_CATALOGUE.levels.length} levels · {stars} stars
          </Text>
          <Text style={styles.json} color={colors.textSoft}>
            {JSON.stringify(results, null, 1)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.boardPadding,
    paddingVertical: 8,
  },
  list: {
    padding: layout.screenPadding,
    gap: 16,
    paddingBottom: 40,
    width: '100%',
    maxWidth: layout.contentWidth,
    alignSelf: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    padding: 18,
    gap: 12,
    ...elevation('raised'),
  },
  pieces: { gap: 10 },
  piece: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  json: { ...typeScale.label, fontFamily: 'monospace' },
});
