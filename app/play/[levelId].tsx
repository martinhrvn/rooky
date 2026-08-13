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
  tierLevels,
  worldOf,
} from '../../src/content';
import { useProgress } from '../../src/progress/store';
import { Button } from '../../src/ui/Button';
import { IconButton } from '../../src/ui/IconButton';
import { LevelPlayer } from '../../src/ui/LevelPlayer';
import { pieceArt } from '../../src/ui/pieces';
import { strings } from '../../src/ui/strings';
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
  const recordResult = useProgress((s) => s.recordResult);

  const onWin = useCallback(
    (stars: 1 | 2 | 3, moves: number) => recordResult(level.id, stars, moves),
    [level.id, recordResult],
  );

  const world = worldOf(level);
  const next = levelAfter(level.id);
  // A tier ending is a milestone, so it gets a set of choices rather than
  // silently tipping her into the next difficulty.
  const tierDone = isLastOfTier(level);
  const upcomingTier = world ? nextTierWithLevels(world, level.tier) : undefined;

  // Finishing the hardest tier finishes the piece, so the way on is the next
  // piece rather than the next difficulty.
  const upcomingWorld = world && !upcomingTier ? nextWorldWithLevels(world) : undefined;

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
            // The piece itself, not an arrow: she cannot read "Next piece",
            // but a bishop on the button says where she is going.
            iconNode={<NextPieceArt piece={upcomingWorld.icon} />}
            label={strings.tierDone.nextPiece}
            kind="go"
            onPress={() => router.replace(`/play/${upcomingWorld.levels[0].id}`)}
          />
        ) : null}
        <Button
          icon="endless"
          label={strings.tierDone.endless}
          kind="free"
          onPress={() => router.replace(`/endless/${world.key}?tier=${level.tier}`)}
        />
        <Button
          icon="retry"
          label={strings.tierDone.reset}
          kind="again"
          onPress={() => router.replace(`/play/${tierLevels(world, level.tier)[0].id}`)}
        />
      </View>
    ) : next ? (
      <IconButton
        name="next"
        kind="go"
        prominent
        accessibilityLabel={strings.play.next}
        onPress={() => router.replace(`/play/${next.id}`)}
      />
    ) : null;

  return (
    <LevelPlayer
      level={level}
      onExit={() => router.back()}
      onWin={onWin}
      wonActions={wonActions}
    />
  );
}

function NextPieceArt({ piece }: { piece: PieceType }) {
  const Art = pieceArt('w', piece);
  return <Art width={34} height={34} />;
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.background },
  // Stacked rather than in a row: at the end of a tier there are up to three
  // choices, and three side-by-side buttons are too small to hit reliably.
  choices: { gap: 10, alignItems: 'stretch', alignSelf: 'stretch', paddingHorizontal: 24 },
});
