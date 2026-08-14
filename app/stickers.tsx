import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Achievement, achievementById } from '../src/progress/achievements';
import { useAlbum, useProgress, useXp } from '../src/progress/store';
import { AchievementIcon } from '../src/ui/AchievementIcon';
import { Glyph, IconButton } from '../src/ui/IconButton';
import { StickerArt } from '../src/ui/StickerArt';
import { Text } from '../src/ui/Text';
import { XpBar } from '../src/ui/XpBar';
import { strings } from '../src/ui/strings';
import { colors, layout } from '../src/ui/theme';

/**
 * Her stickers: the choice when one is owed, and everything she has won.
 *
 * Reached by pressing the XP bar on home — the bar is the reward, so the thing
 * it leads to is the rewards. Nothing here can destroy anything: there is no
 * control on this screen that removes a sticker.
 */
export default function StickersScreen() {
  const router = useRouter();
  const album = useAlbum();
  const xp = useXp();
  const earned = useProgress((s) =>
    s.activeProfileId ? s.earned[s.activeProfileId] : undefined,
  );
  const ensureOffer = useProgress((s) => s.ensureOffer);

  // The last few she won, newest first — `earned` stores when, so "recent"
  // costs nothing. Three at most: this is a signpost to the collection, not
  // the collection.
  const recent = Object.entries(earned ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => achievementById(id))
    .filter((a): a is Achievement => Boolean(a))
    .slice(0, 3);

  // Nudges the root dialog into opening if one is owed. Harmless if it is
  // already up, because `ensureOffer` does nothing when an offer stands.
  //
  // Called inside the effect rather than passed as it: a store action returns
  // whatever zustand's `set` returns, and React reads an effect's return value
  // as its cleanup function — so `useEffect(ensureOffer, ...)` blows up on
  // unmount with "destroy is not a function".
  useEffect(() => {
    ensureOffer();
  }, [ensureOffer]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="back" onPress={() => router.back()} accessibilityLabel={strings.play.back} />
        <Text variant="title" style={styles.heading}>
          {strings.stickers.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* No choice UI here. `StickerChoiceDialog` sits at the root and opens
            over whatever is on screen, including this — so the choice has one
            implementation and cannot be half-made on one surface and finished
            on the other. */}
        <XpBar xp={xp} height={18} />

        {album.length > 0 ? (
          <View style={styles.album}>
            {album.map((id, i) => (
              <View key={`${id}-${i}`} style={styles.slot}>
                <StickerArt id={id} size={38} />
              </View>
            ))}
          </View>
        ) : (
          <Text variant="label" color={colors.textSoft} align="center">
            {strings.stickers.empty}
          </Text>
        )}

        {/* The way to the collection. It used to be "12 of 58" here, which is
            the one form she cannot read — so the row leads with the last few
            she actually won, drawn, and lets the achievements screen do the
            rest. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.achievements.title}
          onPress={() => router.push('/achievements')}
          style={({ pressed }) => [styles.achievements, pressed && styles.pressed]}
        >
          <Text variant="label" style={styles.achievementsLabel}>
            {strings.achievements.title}
          </Text>
          {recent.map((achievement) => (
            <AchievementIcon
              key={achievement.id}
              piece={achievement.piece}
              mark={achievement.mark}
              size={24}
              id={`recent-${achievement.id}`}
            />
          ))}
          <Glyph name="forward" size={18} color={colors.textSoft} />
        </Pressable>
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
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
  },
  heading: { flex: 1 },
  body: {
    gap: 24,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentWidth,
    alignSelf: 'center',
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  album: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  slot: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
  },
  achievements: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceEdge,
    paddingTop: 16,
  },
  achievementsLabel: { flex: 1 },
});
