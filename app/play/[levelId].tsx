import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PieceType } from '../../src/chess/types';
import {
  isLastOfTier,
  levelAfter,
  levelById,
  nextTierWithLevels,
  nextWorldWithLevels,
  soloPiece,
  tierLevels,
  worldOf,
} from '../../src/content';
import { useProgress } from '../../src/progress/store';
import { Button } from '../../src/ui/Button';
import { LevelPlayer } from '../../src/ui/LevelPlayer';
import { pieceArt } from '../../src/ui/pieces';
import { strings } from '../../src/ui/strings';
import { useCatalogue } from '../../src/ui/useCatalogue';
import { useRewards } from '../../src/ui/useRewards';
import { colors } from '../../src/ui/theme';

export default function PlayScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = levelId ? levelById(levelId) : undefined;

  // Remounting on id change resets every bit of per-level state at once.
  return level ? <Play key={level.id} levelId={level.id} /> : <View style={styles.blank} />;
}

function Play({ levelId }: { levelId: string }) {
  const level = levelById(levelId)!;
  const router = useRouter();
  const catalogue = useCatalogue();
  const recordResult = useProgress((s) => s.recordResult);
  const rewards = useRewards('campaign');

  const onWin = useCallback(
    (stars: 1 | 2 | 3, moves: number) => {
      // Read before recording: afterwards there is always a result, so
      // "was this the first time" is no longer answerable.
      const isFirstClear = !useProgress.getState().results[
        useProgress.getState().activeProfileId ?? ''
      ]?.[level.id];

      recordResult(level.id, stars, moves);
      rewards.settleWin({ stars, isFirstClear });
    },
    [level.id, recordResult, rewards],
  );

  const world = worldOf(catalogue, level);
  const next = levelAfter(catalogue, level.id);
  // A tier ending is a milestone, so it gets a set of choices rather than
  // silently tipping her into the next difficulty.
  const tierDone = isLastOfTier(catalogue, level);
  const upcomingTier = world ? nextTierWithLevels(world, level.tier) : undefined;

  // Finishing the hardest tier finishes the piece, so the way on is the next
  // piece rather than the next difficulty.
  const upcomingWorld =
    world && !upcomingTier ? nextWorldWithLevels(catalogue, world) : undefined;

  const wonActions =
    tierDone && world ? (
      <View style={styles.choices}>
        {upcomingTier ? (
          <Button
            icon="levelUp"
            label={strings.tierDone.nextTier}
            kind="go"
            onPress={() => router.replace(`/play/${tierLevels(world, upcomingTier)[0].id}`)}
          />
        ) : null}

        {upcomingWorld ? (
          <Button
            icon="levelUp"
            // The world itself, not an arrow: she cannot read the label, but a
            // bishop on the button says where she is going — and a row of
            // pieces says the next thing is not another piece at all.
            iconNode={<NextWorldArt cast={upcomingWorld.cast} />}
            label={
              soloPiece(upcomingWorld) ? strings.tierDone.nextPiece : strings.tierDone.nextWorld
            }
            kind="go"
            onPress={() => router.replace(`/play/${upcomingWorld.levels[0].id}`)}
          />
        ) : null}
        {/* Theme worlds have nothing to generate — see the note on the home
            screen's Endless button. */}
        {soloPiece(world) ? (
          <Button
            icon="endless"
            label={strings.tierDone.endless}
            kind="free"
            onPress={() => router.replace(`/endless/${world.key}?tier=${level.tier}`)}
          />
        ) : null}
        <Button
          icon="restart"
          label={strings.tierDone.reset}
          kind="again"
          onPress={() => router.replace(`/play/${tierLevels(world, level.tier)[0].id}`)}
        />
      </View>
    ) : next ? (
      // A labelled button rather than the bare icon disc it used to be. On the
      // card it sits beside the end-of-tier choices, which are all pills — a
      // lone circle there read as a different kind of object rather than as
      // the same control in its simple case.
      <Button
        icon="next"
        label={strings.play.next}
        kind="go"
        onPress={() => router.replace(`/play/${next.id}`)}
      />
    ) : null;

  return (
    <LevelPlayer
      level={level}
      onExit={() => router.back()}
      onWin={onWin}
      onMove={rewards.onMove}
      onLost={rewards.onLost}
      onStranded={rewards.onStranded}
      onHint={rewards.onHint}
      wonActions={wonActions}
    />
  );
}

/**
 * The world she is heading into, drawn as its pieces.
 *
 * A single piece stays the size it always was. A row shrinks and overlaps to
 * fit the button, the same way the selector's tile does — the row itself is the
 * signal, so it has to survive being small.
 */
function NextWorldArt({ cast }: { cast: readonly PieceType[] }) {
  const many = cast.length > 1;
  const size = many ? 24 : 34;

  return (
    <View style={styles.cast}>
      {cast.map((piece, i) => {
        const Art = pieceArt('w', piece);
        return (
          <View key={`${piece}-${i}`} style={{ marginLeft: i === 0 ? 0 : -size * 0.4 }}>
            <Art width={size} height={size} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.background },
  // Stacked rather than in a row: at the end of a tier there are up to three
  // choices, and three side-by-side buttons are too small to hit reliably.
  // The dialog supplies the width and the gap now, so this only has to not
  // fight it — the old `paddingHorizontal` was compensating for sitting inside
  // the centred controls row, which it no longer does.
  choices: { gap: 10, alignItems: 'stretch', alignSelf: 'stretch' },
  cast: { flexDirection: 'row', alignItems: 'center' },
});
