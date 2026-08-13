import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { attackMap } from '../chess/attacks';
import { legalTargets, rate, restart, startLevel, tap } from '../game/engine';
import type { Level } from '../game/types';
import { Board } from './Board';
import { Celebration } from './Celebration';
import { IconButton } from './IconButton';
import { MoveDots } from './MoveDots';
import { strings } from './strings';
import { colors, layout } from './theme';

/** Failed attempts before the hint appears, so the screen starts nearly empty. */
const ATTEMPTS_BEFORE_HINT = 3;

/** Fire and forget — a missing haptics motor must never break a move. */
const buzz = (style: Haptics.ImpactFeedbackStyle) => {
  Haptics.impactAsync(style).catch(() => {});
};

export interface LevelPlayerProps {
  level: Level;
  onExit: () => void;
  /** Fires once, when the level is won. */
  onWin?: (stars: 1 | 2 | 3, moves: number) => void;
  /**
   * Controls shown in the bar once the level is won — "next level" for the
   * numbered campaign, "another one" for Endless, or a set of choices at the
   * end of a tier.
   */
  wonActions?: ReactNode;
}

/**
 * The board screen: everything between picking a level and finishing it.
 *
 * Shared by the numbered campaign and Endless, which differ only in where
 * their levels come from and what happens on a win.
 *
 * Stays icon-only. Words are noise mid-task, and the player cannot read them.
 */
export function LevelPlayer({ level, onExit, onWin, wonActions }: LevelPlayerProps) {
  const { width, height } = useWindowDimensions();

  const [state, setState] = useState(() => startLevel(level));
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const earned = rate(state.moves, level.par);

  useEffect(() => {
    if (state.phase !== 'won') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onWin?.(rate(state.moves, level.par), state.moves);
    // Deliberately keyed on the win, not on `onWin` — an unstable callback
    // must not be able to record the same result twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

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

  const boardSize = Math.min(width - layout.boardPadding * 2, height * 0.68);
  const hintTargets = showHint ? level.hint.map((h) => h.to) : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton name="back" onPress={onExit} accessibilityLabel={strings.play.back} />
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

        {state.phase === 'won' ? wonActions : null}
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
