import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { attackMap } from '../../src/chess/attacks';
import { levelAfter, levelById } from '../../src/content';
import { legalTargets, rate, restart, startLevel, tap } from '../../src/game/engine';
import { useProgress } from '../../src/progress/store';
import { Board } from '../../src/ui/Board';
import { Celebration } from '../../src/ui/Celebration';
import { IconButton } from '../../src/ui/IconButton';
import { MoveDots } from '../../src/ui/MoveDots';
import { strings } from '../../src/ui/strings';
import { colors, layout } from '../../src/ui/theme';

/** Failed attempts before the hint appears, so the screen starts nearly empty. */
const ATTEMPTS_BEFORE_HINT = 3;

/** Fire and forget — a missing haptics motor must never break a move. */
const buzz = (style: Haptics.ImpactFeedbackStyle) => {
  Haptics.impactAsync(style).catch(() => {});
};

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
  const [skipped, setSkipped] = useState(false);

  const earned = rate(state.moves, level.par);

  // Save on win. Keyed on phase so a re-render never double-records.
  useEffect(() => {
    if (state.phase !== 'won') return;
    recordResult(level.id, rate(state.moves, level.par), state.moves);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [state.phase, state.moves, level.id, level.par, recordResult]);

  const retry = useCallback(() => {
    setState((s) => restart(s));
    setShowHint(false);
    setSkipped(false);
  }, []);

  const onTapSquare = useCallback((sq: number) => {
    setState((s) => {
      const next = tap(s, sq);
      if (next.phase === 'lost' && s.phase !== 'lost') setAttempts((a) => a + 1);
      // A star just came off the board — the most-repeated moment in the game.
      if (next.stars.length < s.stars.length) buzz(Haptics.ImpactFeedbackStyle.Light);
      else if (next.moves > s.moves) buzz(Haptics.ImpactFeedbackStyle.Soft);
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
        <IconButton name="back" onPress={() => router.back()} accessibilityLabel={strings.play.back} />
        <MoveDots moves={state.moves} par={level.par} />
        {/* Balances the back button so the counter stays centred. */}
        <View style={{ width: layout.touchTarget }} />
      </View>

      <View style={styles.boardWrap}>
        <View>
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

          {state.phase === 'won' ? (
            <Celebration
              earned={earned}
              size={boardSize}
              skipped={skipped}
              onSkip={() => setSkipped(true)}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.controls}>
        {/* Retry is always present: kids replay constantly, and a button that
            moves or appears conditionally becomes its own obstacle. */}
        <IconButton name="retry" onPress={retry} accessibilityLabel={strings.play.retry} />

        {attempts >= ATTEMPTS_BEFORE_HINT && state.phase !== 'won' && level.hint.length > 0 ? (
          <IconButton
            name="hint"
            onPress={() => setShowHint(true)}
            accessibilityLabel={strings.play.hint}
          />
        ) : null}

        {state.phase === 'won' && next ? (
          <IconButton
            name="next"
            prominent
            accessibilityLabel={strings.play.next}
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
