import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Family, earnedFamilies, nextUp, tallyOf } from '../src/progress/achievements';
import { useProgress } from '../src/progress/store';
import { AchievementIcon } from '../src/ui/AchievementIcon';
import { IconButton } from '../src/ui/IconButton';
import { Text } from '../src/ui/Text';
import { strings } from '../src/ui/strings';
import { colors, layout } from '../src/ui/theme';

/** How many unearned ones are dangled. Three fits a row on the narrowest phone. */
const COMING_UP = 3;

const EMPTY: Readonly<Record<string, number>> = {};

/**
 * Everything she has done, and three things she has not.
 *
 * The achievements existed before this screen did, and were drawn exactly once
 * each — inside a toast that is up for under three seconds. A collection she
 * cannot go back and look at is not a collection, so this is where they live
 * afterwards.
 *
 * Grouped by tally rather than listed flat, because the names are per tally:
 * every tier of `moved:n` is "Hop, hop, hop", and three rows of that would read
 * as three separate things. One row, one name, a pip per tier — and pips are
 * how this app says "how many" anyway.
 *
 * Nothing here can destroy anything. There is no control on this screen that
 * takes an achievement back off her.
 */
export default function AchievementsScreen() {
  const router = useRouter();
  const earned = useProgress((s) => (s.activeProfileId ? s.earned[s.activeProfileId] : undefined));
  const counters = useProgress((s) =>
    s.activeProfileId ? s.counters[s.activeProfileId] : undefined,
  );
  const streaks = useProgress((s) => (s.activeProfileId ? s.streaks[s.activeProfileId] : undefined));

  // Stored objects, so the reference is stable between renders and there is
  // nothing to memoise. `EMPTY` is shared for the same reason — an absent
  // record must not hand back a fresh object every render.
  const mine = earned ?? EMPTY;
  const tallies = { counters: counters ?? EMPTY, streaks: streaks ?? EMPTY };
  const done = earnedFamilies(mine);
  const coming = nextUp(tallies, mine, COMING_UP);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton
          name="back"
          onPress={() => router.back()}
          accessibilityLabel={strings.play.back}
        />
        <Text variant="title" style={styles.heading}>
          {strings.achievements.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {done.length > 0 ? (
          <View style={styles.list}>
            {done.map(({ family, count }) => (
              <Row
                key={family.counter}
                family={family}
                count={count}
                tally={tallyOf(family, tallies)}
              />
            ))}
          </View>
        ) : (
          <Text variant="label" color={colors.textSoft} align="center">
            {strings.achievements.empty}
          </Text>
        )}

        {coming.length > 0 ? (
          <View style={styles.coming}>
            <Text variant="label" color={colors.textSoft}>
              {strings.achievements.upNext}
            </Text>
            <View style={styles.list}>
              {coming.map((family) => (
                <Row
                  key={family.counter}
                  family={family}
                  count={0}
                  tally={tallyOf(family, tallies)}
                  locked
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * One tally: its picture, what it counts, how far along it is, a pip per tier.
 *
 * Earned and locked are the same row deliberately. A locked one keeps its
 * *name* back — that is the part worth finding out, and a silhouette with no
 * name is a thing to go and discover — but it says plainly what it counts and
 * how close she is, because otherwise nobody in the house can tell her what to
 * do to get it.
 */
function Row({
  family,
  count,
  tally,
  locked,
}: {
  family: Family;
  count: number;
  tally: number;
  locked?: boolean;
}) {
  const name = strings.achievementNames[family.counter] ?? family.counter;
  const counts = strings.achievementTallies[family.counter] ?? name;

  // What she is heading for, or nothing once every tier is behind her — at
  // which point "103 of 100" would be a strange thing to say about a finished
  // set, and the full row of pips has already said it is finished.
  const target = family.tiers[count]?.threshold;
  const progress = target ? `${tally} ${strings.achievements.of} ${target}` : `${tally}`;

  return (
    <View style={styles.row}>
      <View style={styles.slot}>
        <AchievementIcon
          piece={family.piece}
          mark={family.mark}
          size={34}
          id={`${locked ? 'locked' : 'earned'}-${family.counter}`}
          dimmed={locked}
        />
      </View>

      <View style={styles.text}>
        {/* The name is the whole of what a locked one holds back — including
            from a screen reader, which would otherwise read out the one thing
            the silhouette is there to keep. */}
        <Text numberOfLines={1} color={locked ? colors.textSoft : colors.text}>
          {locked ? strings.achievements.locked : name}
        </Text>
        <Text variant="label" color={colors.textSoft} numberOfLines={2}>
          {counts} · {progress}
        </Text>
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={counts}
        accessibilityValue={{ min: 0, max: family.tiers.length, now: count }}
        style={styles.pips}
      >
        {family.tiers.map((tier, i) => (
          <View key={tier.id} style={[styles.pip, i < count && styles.filled]} />
        ))}
      </View>
    </View>
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
  list: { gap: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1, gap: 2 },
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
  pips: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pip: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textSoft,
  },
  // Gold, because a pip is a reward and gold is what rewards are in this app.
  filled: { backgroundColor: colors.star, borderColor: colors.starEdge },
  coming: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceEdge,
    paddingTop: 16,
  },
});
