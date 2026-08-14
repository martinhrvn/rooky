import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACHIEVEMENTS, achievementById } from '../src/progress/achievements';
import { useAlbum, useProgress, useXp } from '../src/progress/store';
import { IconButton } from '../src/ui/IconButton';
import { StickerArt } from '../src/ui/StickerArt';
import { Text } from '../src/ui/Text';
import { XpBar } from '../src/ui/XpBar';
import { strings } from '../src/ui/strings';
import { colors, elevation, layout } from '../src/ui/theme';

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

        {earned && Object.keys(earned).length > 0 ? (
          <View style={styles.achievements}>
            <Text variant="label" color={colors.textSoft}>
              {strings.stickers.achievements}
            </Text>
            <Text variant="label" color={colors.text}>
              {/* Adult-facing, and deliberately plain: the counted-out list is
                  for whoever is asked "what did you get?" */}
              {Object.keys(earned).filter(achievementById).length} of {ACHIEVEMENTS.length}
            </Text>
          </View>
        ) : null}
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
  choice: { gap: 16 },
  offer: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  offered: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    paddingHorizontal: 14,
    paddingVertical: 18,
    ...elevation('raised'),
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  bigEmoji: { fontSize: 56, lineHeight: 68 },
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
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceEdge,
    paddingTop: 16,
  },
});
