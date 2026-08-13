import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { attackMap } from '../../src/chess/attacks';
import { levelAfter, levelById } from '../../src/content';
import { legalTargets, rate, restart, startLevel, tap } from '../../src/game/engine';
import { useProgress } from '../../src/progress/store';
import { Board } from '../../src/ui/Board';
import { IconButton } from '../../src/ui/IconButton';
import { MoveDots } from '../../src/ui/MoveDots';
import { StarRating } from '../../src/ui/StarRating';
import { colors, layout } from '../../src/ui/theme';

/** Failed attempts before the hint appears, so the screen starts nearly empty. */
const ATTEMPTS_BEFORE_HINT = 3;

export default function PlayScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = levelId ? levelById(levelId) : undefined;

  // Remounting on id change resets every bit of per-level state at once.
  return level ? <Level key={level.id} levelId={level.id} /> : <View style={styles.screen} />;
}

function Level({ levelId }: { levelId: string }) {
  const level = levelById(levelId)!;
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const recordResult = useProgress((s) => s.recordResult);

  const [state, setState] = useState(() => startLevel(level));
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Save on win. Keyed on phase so a re-render never double-records.
  useEffect(() => {
    if (state.phase === 'won') {
      recordResult(level.id, rate(state.moves, level.par), state.moves);
    }
  }, [state.phase, state.moves, level.id, level.par, recordResult]);

  const retry = useCallback(() => {
    setState((s) => restart(s));
    setShowHint(false);
  }, []);

  const onTapSquare = useCallback((sq: number) => {
    setState((s) => {
      const next = tap(s, sq);
      if (next.phase === 'lost' && s.phase !== 'lost') setAttempts((a) => a + 1);
      return next;
    });
  }, []);

  // Tier 2 is the only tier that shows the overlay: tier 1 has no enemies, and
  // tier 3 is deliberately the same position with the help switched off.
  const danger = useMemo(
    () => (level.tier === 2 ? attackMap(state.board, 'b') : null),
    [level.tier, state.board],
  );

  const targets = useMemo(() => legalTargets(state), [state]);
  const next = levelAfter(level.id);

  const boardSize = Math.min(width - layout.boardPadding * 2, height * 0.68);
  const hintTargets = showHint ? level.hint.map((h) => h.to) : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton
          name="back"
          onPress={() => router.back()}
          accessibilityLabel="Back to the level list"
        />
        {state.phase === 'won' ? (
          <StarRating earned={rate(state.moves, level.par)} />
        ) : (
          <MoveDots moves={state.moves} par={level.par} />
        )}
        {/* Balances the back button so the counter stays centred. */}
        <View style={{ width: layout.touchTarget }} />
      </View>

      <View style={styles.boardWrap}>
        <Board
          board={state.board}
          stars={state.stars}
          selected={state.selected}
          targets={state.phase === 'playing' ? targets : hintTargets}
          danger={danger}
          lastMove={state.lastMove}
          size={boardSize}
          onTapSquare={onTapSquare}
        />
      </View>

      <View style={styles.controls}>
        {/* Retry is always present: kids replay constantly, and a button that
            moves or appears conditionally becomes its own obstacle. */}
        <IconButton name="retry" onPress={retry} accessibilityLabel="Try this level again" />

        {attempts >= ATTEMPTS_BEFORE_HINT && state.phase !== 'won' && level.hint.length > 0 ? (
          <IconButton
            name="hint"
            onPress={() => setShowHint(true)}
            accessibilityLabel="Show a hint"
          />
        ) : null}

        {state.phase === 'won' && next ? (
          <IconButton
            name="next"
            prominent
            accessibilityLabel="Next level"
            onPress={() => router.replace(`/play/${next.id}`)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.boardPadding,
    paddingVertical: 8,
  },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 16,
    minHeight: layout.touchTarget * 1.4 + 16,
  },
});
