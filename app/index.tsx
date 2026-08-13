import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';

import { ALL_LEVELS, WORLDS, nextLevel } from '../src/content';
import { useCompletedIds, useProgress } from '../src/progress/store';
import { pieceArt } from '../src/ui/pieces';
import { StarRating } from '../src/ui/StarRating';
import { colors, layout } from '../src/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const completed = useCompletedIds();
  const profiles = useProgress((s) => s.profiles);
  const createProfile = useProgress((s) => s.createProfile);
  const hydrated = useProgress((s) => s.hydrated);

  // Until the avatar picker exists (Phase E), make sure there is somewhere for
  // results to be recorded. Waiting for hydration avoids creating a duplicate
  // profile on top of a saved one.
  useEffect(() => {
    if (hydrated && profiles.length === 0) createProfile('Player 1', 'wr');
  }, [hydrated, profiles.length, createProfile]);

  const resume = nextLevel(completed);
  const allDone = completed.size >= ALL_LEVELS.length;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        {/* The one control she needs to find: biggest thing on the screen,
            and it always does the sensible thing. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={allDone ? 'Play again' : 'Continue playing'}
          onPress={() => router.push(`/play/${resume.id}`)}
          style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
        >
          <Svg width={72} height={72} viewBox="0 0 100 100">
            <Polygon points="32,20 32,80 80,50" fill={colors.text} />
          </Svg>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.worlds}>
        {WORLDS.map((world) => {
          const Art = pieceArt('w', world.icon);
          return (
            <View key={world.key} style={styles.world}>
              <View style={styles.worldHeader}>
                <Art width={44} height={44} />
              </View>

              <View style={styles.grid}>
                {world.levels.map((level, index) => {
                  const done = completed.has(level.id);
                  // Unlocked when it is the first level or the one before it
                  // is finished. Nothing is ever gated behind a star rating.
                  const unlocked = index === 0 || completed.has(world.levels[index - 1].id);
                  return (
                    <Pressable
                      key={level.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Level ${index + 1}`}
                      disabled={!unlocked}
                      onPress={() => router.push(`/play/${level.id}`)}
                      style={({ pressed }) => [
                        styles.tile,
                        done && styles.tileDone,
                        !unlocked && styles.tileLocked,
                        pressed && styles.pressed,
                      ]}
                    >
                      {done ? <StarRating earned={3} size={14} /> : null}
                      <View style={styles.pips}>
                        {Array.from({ length: index + 1 }, (_, i) => (
                          <View key={i} style={styles.pip} />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { alignItems: 'center', paddingVertical: 20 },
  continueButton: {
    width: layout.touchTarget * 2,
    height: layout.touchTarget * 2,
    borderRadius: layout.touchTarget,
    backgroundColor: colors.star,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  worlds: { padding: layout.boardPadding, gap: 20 },
  world: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius,
    padding: 14,
    gap: 12,
  },
  worldHeader: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: 14,
    backgroundColor: colors.lightSquare,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tileDone: { backgroundColor: colors.lastMove },
  tileLocked: { opacity: 0.35 },
  // Level number as a row of pips — no numerals anywhere she has to read.
  pips: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center', maxWidth: 44 },
  pip: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.darkSquare },
});
