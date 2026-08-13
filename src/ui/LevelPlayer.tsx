import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { attackMap } from '../chess/attacks';
import { type Board as BoardModel, movePiece } from '../chess/board';
import { legalTargets, rate, restart, rewind, startLevel, tap } from '../game/engine';
import type { Level } from '../game/types';
import { Board } from './Board';
import { Celebration } from './Celebration';
import { IconButton } from './IconButton';
import { MoveDots } from './MoveDots';
import { strings } from './strings';
import { colors, layout } from './theme';

/** Failed attempts before the hint appears, so the screen starts nearly empty. */
const ATTEMPTS_BEFORE_HINT = 3;

/** Long enough to enjoy the win, short enough not to become a wait. */
const AUTO_ADVANCE_MS = 1800;

/**
 * Beat between her piece landing on the fatal square and the enemy setting off
 * to take it. Without this the two happen at once and read as one confusing
 * blur rather than as cause and effect.
 */
const PUNISH_DELAY_MS = 380;

/** How long the taken position stays up before the board steps back. */
const REWIND_DELAY_MS = 950;

/** Once she has tapped through the celebration, she is telling us to get on with it. */
const AUTO_ADVANCE_AFTER_SKIP_MS = 450;

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
  /**
   * When set, the level moves on by itself once the win has been shown.
   *
   * Endless uses this: nothing there is scored, so making her tap to continue
   * is friction for no reason. The campaign deliberately does not — those
   * results are recorded, and she may well want to retry for a third star.
   *
   * Must be referentially stable, or the timer restarts every render.
   */
  onAutoAdvance?: () => void;
}

/**
 * The board screen: everything between picking a level and finishing it.
 *
 * Shared by the numbered campaign and Endless, which differ only in where
 * their levels come from and what happens on a win.
 *
 * Stays icon-only. Words are noise mid-task, and the player cannot read them.
 */
export function LevelPlayer({
  level,
  onExit,
  onWin,
  wonActions,
  onAutoAdvance,
}: LevelPlayerProps) {
  const { width, height } = useWindowDimensions();

  const [state, setState] = useState(() => startLevel(level));
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [skipped, setSkipped] = useState(false);
  /** Board shown mid-punishment, with the enemy already on her square. */
  const [punished, setPunished] = useState<BoardModel | null>(null);
  /** When the current win happened, so auto-advance can time from it. */
  const wonAt = useRef<number | null>(null);

  const earned = rate(state.moves, level.par);

  useEffect(() => {
    if (state.phase !== 'won') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onWin?.(rate(state.moves, level.par), state.moves);
    // Deliberately keyed on the win, not on `onWin` — an unstable callback
    // must not be able to record the same result twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Tapping through the celebration shortens the wait rather than cancelling
  // it, so a tap always means "get on with it" and never strands her on a
  // finished board.
  //
  // The delay is measured from the win, not from the tap — otherwise tapping
  // late would restart the clock and make an impatient tap *slower* than
  // sitting still.
  useEffect(() => {
    if (state.phase !== 'won') {
      wonAt.current = null;
      return;
    }
    wonAt.current ??= Date.now();
    if (!onAutoAdvance) return;

    const target = skipped ? AUTO_ADVANCE_AFTER_SKIP_MS : AUTO_ADVANCE_MS;
    const remaining = Math.max(0, target - (Date.now() - wonAt.current));
    const timer = setTimeout(onAutoAdvance, remaining);
    return () => clearTimeout(timer);
  }, [state.phase, skipped, onAutoAdvance]);

  /**
   * Getting taken, played out rather than announced.
   *
   * Never flash "wrong": she watches the enemy travel in and take her piece,
   * because seeing the consequence is the entire lesson of tier 2. Then the
   * board steps back a single move, so she keeps everything she already got
   * right and only retries the mistake.
   */
  useEffect(() => {
    if (state.phase !== 'lost' || !state.punisher) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

    const { from, to } = state.punisher;
    const strike = setTimeout(() => setPunished(movePiece(state.board, from, to)), PUNISH_DELAY_MS);
    const back = setTimeout(() => {
      setPunished(null);
      setState(rewind);
    }, REWIND_DELAY_MS);

    return () => {
      clearTimeout(strike);
      clearTimeout(back);
    };
  }, [state.phase, state.punisher, state.board]);

  const retry = useCallback(() => {
    setPunished(null);
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
  const board = punished ?? state.board;

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
            board={board}
            stars={state.stars}
            selected={state.selected}
            targets={state.phase === 'playing' ? targets : hintTargets}
            danger={danger}
            doomed={state.phase === 'lost' ? (state.punisher?.to ?? null) : null}
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
