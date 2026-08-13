import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeRng } from '../src/game/random';
import { reshuffle } from '../src/game/shuffle';
import type { Level } from '../src/game/types';
import { mixPool } from '../src/progress/selectors';
import { useCompletedIds, useProgress } from '../src/progress/store';
import { Button } from '../src/ui/Button';
import { LevelPlayer } from '../src/ui/LevelPlayer';
import { strings } from '../src/ui/strings';
import { useCatalogue } from '../src/ui/useCatalogue';
import { colors } from '../src/ui/theme';

/**
 * Mix: a shuffled run through every level she has already beaten.
 *
 * The counterpart to Endless rather than a variant of it. Endless invents
 * puzzles for one piece and records nothing; this replays real, hand-authored
 * ones from every piece and does record — so a better run improves her best,
 * and the store keeps only the best, so playing here can never cost her
 * anything.
 *
 * It advances manually for the same reason: auto-advancing would sweep her
 * past a two-star result before she could retry it.
 */
export default function MixScreen() {
  const router = useRouter();
  const completed = useCompletedIds();
  const catalogue = useCatalogue();
  const recordResult = useProgress((s) => s.recordResult);

  // Fixed at mount. The pool grows as she plays, but reshuffling underneath
  // her mid-session would be more surprising than useful.
  const [pool] = useState(() => mixPool(catalogue, completed));
  const [queue, setQueue] = useState<Level[]>(() => reshuffle(pool, makeRng(pool.length + 1)));
  /** Counts levels played, and keys the board so every one is a fresh mount. */
  const [round, setRound] = useState(0);

  const level = queue[0];

  const another = useCallback(() => {
    setRound((r) => r + 1);
    setQueue((current) => {
      const rest = current.slice(1);
      if (rest.length > 0) return rest;
      // The cycle ran dry. Refill, keeping the level she just played off the
      // front — the seam is the only place a repeat is actually noticeable.
      return reshuffle(pool, makeRng(Date.now()), current[0]);
    });
  }, [pool]);

  const onWin = useCallback(
    (stars: 1 | 2 | 3, moves: number) => {
      if (level) recordResult(level.id, stars, moves);
    },
    [level, recordResult],
  );

  // Reachable only if the pool were empty, which the home card prevents — but
  // a dead screen would be worse than a way out.
  if (!level) {
    return (
      <View style={styles.empty}>
        <Button icon="back" label={strings.play.back} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <LevelPlayer
      key={round}
      level={level}
      onExit={() => router.back()}
      onWin={onWin}
      wonActions={<Button icon="shuffle" label={strings.mix.another} kind="go" onPress={another} />}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
