import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  type SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { TIERS, type World, nextLevel, soloPiece, tierLevels } from '../../src/content';
import type { Tier } from '../../src/game/types';
import { firstPlayableOfTier, isWorldUnlocked, tierState } from '../../src/progress/selectors';
import { useCompletedIds } from '../../src/progress/store';
import { IconButton } from '../../src/ui/IconButton';
import { PathBackdrop } from '../../src/ui/PathBackdrop';
import { PathNode } from '../../src/ui/PathNode';
import { strings } from '../../src/ui/strings';
import { Text } from '../../src/ui/Text';
import { useCatalogue } from '../../src/ui/useCatalogue';
import { WorldRibbon } from '../../src/ui/WorldRibbon';
import { colors, layout } from '../../src/ui/theme';

/**
 * How far a circle steps off centre. The path winds left, centre, right so it
 * reads as a journey rather than as a column of buttons.
 */
const SWING = 74;
const OFFSETS = [-SWING, 0, SWING];

/**
 * Every level, as a path.
 *
 * A ribbon per world and a numbered circle per difficulty under it. The
 * numbers count the tiers this world **actually has**, not the tier ids — a
 * parent capping difficulty at *Watch out* leaves circles 1 and 2 rather than
 * 1 and 2-of-3, and `catalogueFor` has already dropped any world the ceiling
 * emptied, so no ribbon here can ever be one that cannot open.
 *
 * Tapping a finished circle plays it again. Nothing on this screen clears
 * anything: the store keeps the best stars and the fewest moves, so a replay
 * can only ever improve a result, and there is no confirm dialog she could
 * read if it did otherwise.
 */
export default function LevelsScreen() {
  const router = useRouter();
  const completed = useCompletedIds();
  const catalogue = useCatalogue();

  const scroller = useAnimatedRef<Animated.ScrollView>();
  /** Top of the world she is up to, so the screen can open on it. */
  const currentY = useRef<number | null>(null);
  const touched = useRef(false);

  /** Drives the backdrop's drift. Lives on the UI thread, off the JS one. */
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const resume = nextLevel(catalogue, completed);

  /**
   * Opens on the world she is up to rather than at the top of the rook. The FAB
   * is the real answer to a long path, but landing twelve worlds above her
   * would still be a poor way to arrive.
   *
   * Measured on the **section**, not on the circle: a section is a direct child
   * of the content container, so its `y` is already the offset to scroll to. A
   * circle's `y` is relative to a row inside a section, and the two layouts
   * arrive in no guaranteed order — summing them meant reading whichever half
   * had not been measured yet as zero.
   *
   * Called from both layout and content-size because either alone can run while
   * the other measurement is still missing. Stops as soon as she drags it
   * herself: past that point, where the path sits is her business.
   *
   * With every level finished there is no `resume`, so nothing reports a
   * position and the path simply opens at the top. That is right rather than a
   * regression — there is no "where she is up to" left to open on, and the FAB
   * below is the way on either way.
   */
  const settle = () => {
    if (touched.current || currentY.current === null) return;
    scroller.current?.scrollTo({ y: Math.max(0, currentY.current - 24), animated: false });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <PathBackdrop scrollY={scrollY} />

      {/* No back arrow: this is a tab now, and there is nothing under it to go
          back to. The bar is how you leave. */}
      <View style={styles.header}>
        <Text variant="title">{strings.path.title}</Text>
      </View>

      <Animated.ScrollView
        ref={scroller}
        contentContainerStyle={styles.path}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={settle}
        onScrollBeginDrag={() => {
          touched.current = true;
        }}
      >
        {catalogue.worlds.map((world, index) => (
          <WorldSection
            key={world.key}
            world={world}
            index={index}
            worlds={catalogue.worlds}
            completedIds={completed}
            resumeId={resume?.id}
            scrollY={scrollY}
            onPlay={(levelId) => router.push(`/play/${levelId}`)}
            onEndless={(tier) => router.push(`/endless/${world.key}?tier=${tier}`)}
            onMeasureCurrent={(y) => {
              currentY.current = y;
              settle();
            }}
          />
        ))}
      </Animated.ScrollView>

      {/* Fixed, so the way on is always one tap away however far she has
          wandered up the path.

          With every level finished it becomes Mix rather than disappearing.
          That keeps the invariant this button is worth having at all — it
          opens whatever Play opens, so the two can never disagree — and it
          changes colour with its meaning: jade while there is something new,
          periwinkle once the only thing left is to play freely. */}
      {resume ? (
        <View style={styles.fab}>
          <IconButton
            name="play"
            kind="go"
            prominent
            accessibilityLabel={strings.path.playNext}
            onPress={() => router.push(`/play/${resume.id}`)}
          />
        </View>
      ) : catalogue.levels.length > 0 ? (
        <View style={styles.fab}>
          <IconButton
            name="shuffle"
            kind="free"
            prominent
            accessibilityLabel={strings.mix.play}
            onPress={() => router.push('/mix')}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function WorldSection({
  world,
  index: worldIndex,
  worlds,
  completedIds,
  resumeId,
  scrollY,
  onPlay,
  onEndless,
  onMeasureCurrent,
}: {
  world: World;
  /** Position in the catalogue, which is what picks the ribbon's hue. */
  index: number;
  worlds: readonly World[];
  completedIds: ReadonlySet<string>;
  resumeId: string | undefined;
  /** Drives the ribbon's sway. */
  scrollY: SharedValue<number>;
  onPlay: (levelId: string) => void;
  onEndless: (tier: Tier) => void;
  onMeasureCurrent: (y: number) => void;
}) {
  // Only the tiers this world has. Theme worlds have no tier 1 at all, and the
  // difficulty ceiling can remove the top one.
  const tiers = TIERS.filter((tier) => tierLevels(world, tier).length > 0);
  const locked = !isWorldUnlocked(worlds, world, completedIds);

  // True when the level Play would open lives in this world, which is what the
  // path scrolls to on the way in.
  const holdsCurrent = tiers.some(
    (tier) => firstPlayableOfTier(world, tier, completedIds)?.id === resumeId,
  );

  return (
    <View
      onLayout={(e) => {
        if (holdsCurrent) onMeasureCurrent(e.nativeEvent.layout.y);
      }}
    >
      {/* Endless hangs off the front of the ribbon rather than off a button of
          its own, which competed with the circles. Absent on a theme world —
          the generator walks a single piece and could not build one — and on a
          world that has not opened yet. */}
      <WorldRibbon
        world={world}
        index={worldIndex}
        locked={locked}
        scrollY={scrollY}
        onEndless={
          soloPiece(world) && !locked ? () => onEndless(tiers[0] ?? 1) : undefined
        }
      />

      <View style={styles.nodes}>
        {tiers.map((tier, index) => {
          const state = tierState(worlds, world, tier, completedIds);
          const target = firstPlayableOfTier(world, tier, completedIds);
          const current = target?.id === resumeId;

          return (
            <View
              key={tier}
              style={[styles.node, { marginLeft: OFFSETS[index % OFFSETS.length] }]}
            >
              <PathNode
                number={index + 1}
                state={state}
                current={current}
                shineId={`shine-${world.key}-${tier}`}
                label={`${strings.path.node(index + 1, world.title)}${
                  state === 'done'
                    ? `, ${strings.path.done}`
                    : state === 'locked'
                      ? `, ${strings.path.locked}`
                      : ''
                }`}
                onPress={() => target && onPlay(target.id)}
              />
            </View>
          );
        })}
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
    paddingHorizontal: layout.boardPadding,
    paddingVertical: 8,
  },
  path: {
    padding: layout.screenPadding,
    gap: 20,
    // Clears the FAB, so the last circle on the path is never sitting under it.
    paddingBottom: 140,
    width: '100%',
    maxWidth: layout.contentWidth,
    alignSelf: 'center',
  },
  nodes: { alignItems: 'center', gap: 18, paddingTop: 18 },
  node: { alignItems: 'center' },
  // Kept rather than dropped in favour of the Home tab: from halfway up a long
  // path that would be two taps, and this is one.
  //
  // No offset for the nav bar. The tab navigator is a flex column — the screen
  // area, then the bar — so this screen already *ends* at the top of the bar
  // and `bottom` is measured from there. Adding the bar's height would float it
  // a whole bar clear of nothing.
  fab: { position: 'absolute', right: layout.screenPadding, bottom: layout.screenPadding },
});
