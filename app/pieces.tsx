import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { TIERS, type World, tierLevels } from '../src/content';
import type { Level } from '../src/game/types';
import { isLevelUnlocked, isWorldUnlocked, worldProgress } from '../src/progress/selectors';
import { useCompletedIds } from '../src/progress/store';
import { IconButton } from '../src/ui/IconButton';
import { PieceTile } from '../src/ui/PieceTile';
import { strings } from '../src/ui/strings';
import { Text } from '../src/ui/Text';
import { TierRank } from '../src/ui/TierRank';
import { useCatalogue } from '../src/ui/useCatalogue';
import { colors, elevation, layout } from '../src/ui/theme';

export default function PiecesScreen() {
  const router = useRouter();
  const completed = useCompletedIds();
  const catalogue = useCatalogue();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="back" onPress={() => router.back()} accessibilityLabel={strings.play.back} />
        <View style={styles.headerText}>
          <Text variant="title">{strings.pieces.title}</Text>
          <Text variant="label" color={colors.textSoft}>
            {strings.pieces.subtitle}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {catalogue.worlds.map((world) => (
          <WorldCard
            key={world.key}
            world={world}
            worlds={catalogue.worlds}
            completedIds={completed}
            onPlay={(level) => router.push(`/play/${level.id}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function WorldCard({
  world,
  worlds,
  completedIds,
  onPlay,
}: {
  world: World;
  /** The active catalogue's worlds, so unlocking respects the difficulty ceiling. */
  worlds: readonly World[];
  completedIds: ReadonlySet<string>;
  onPlay: (level: Level) => void;
}) {
  const unlocked = isWorldUnlocked(worlds, world, completedIds);
  const progress = worldProgress(world, completedIds);
  const hasLevels = world.levels.length > 0;

  return (
    <View style={[styles.card, !unlocked && styles.cardLocked]}>
      <View style={styles.cardHead}>
        {/* Tapping the piece starts the world from level 1. This is the
            "play a piece from the beginning" path, so it is the biggest and
            most obvious target on the card. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${world.title}, start from the beginning`}
          accessibilityState={{ disabled: !unlocked }}
          disabled={!unlocked}
          onPress={() => onPlay(world.levels[0])}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <PieceTile pieces={world.cast} size={72} ringed={unlocked} dimmed={!unlocked} />
        </Pressable>

        <View style={styles.cardTitle}>
          <View style={styles.titleRow}>
            {/* Muted rather than dimmed: a world with no levels yet should
                read as "later", not as "disabled". */}
            <Text variant="title" color={unlocked ? colors.text : colors.textSoft}>
              {world.title}
            </Text>
            {progress.complete ? <CompleteBadge /> : null}
            {!unlocked ? <Lock /> : null}
          </View>
          <Text variant="body" color={colors.textSoft}>
            {hasLevels ? world.blurb : `${world.blurb} · coming soon`}
          </Text>
        </View>
      </View>

      {hasLevels ? (
        <View style={styles.tiers}>
          {TIERS.map((tier) => {
            const levels = tierLevels(world, tier);
            if (levels.length === 0) return null;
            const counted = progress.byTier[tier];

            return (
              <View key={tier} style={styles.tierRow}>
                <Text variant="label" color={colors.textSoft} style={styles.tierLabel}>
                  {strings.tiers[tier]}
                </Text>
                <TierRank
                  levels={levels}
                  completedIds={completedIds}
                  isUnlocked={(level) => unlocked && isLevelUnlocked(world, level, completedIds)}
                  onPickLevel={onPlay}
                />
                <Text variant="label" color={colors.textSoft}>
                  {counted.done}/{counted.total}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function CompleteBadge() {
  return (
    <Svg width={22} height={22} viewBox="0 0 100 100">
      <Rect x={4} y={4} width={92} height={92} rx={26} fill={colors.green} />
      <Path
        d="M26 52 L44 70 L76 32"
        stroke={colors.surface}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function Lock() {
  return (
    <Svg width={20} height={20} viewBox="0 0 100 100">
      <Rect x={22} y={44} width={56} height={44} rx={10} fill={colors.textSoft} />
      <Path
        d="M34 44 V32 a16 16 0 0 1 32 0 V44"
        stroke={colors.textSoft}
        strokeWidth={10}
        fill="none"
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
    paddingHorizontal: layout.boardPadding,
    paddingVertical: 8,
  },
  headerText: { gap: 2 },
  list: { padding: layout.screenPadding, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    padding: 18,
    gap: 16,
    ...elevation('raised'),
  },
  /**
   * Worlds with no content yet get no card at all — just an outline on the
   * page. A greyed-out card reads as "something went wrong"; an empty outline
   * reads as "this is coming", which is the truth.
   */
  cardLocked: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderStyle: 'dashed',
    shadowOpacity: 0,
    elevation: 0,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardTitle: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tiers: { gap: 10 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tierLabel: { width: 78 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
});
