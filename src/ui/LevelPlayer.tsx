import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { attackedPieces, capturersOf, dangerFrom, dangerMap } from '../chess/attacks';
import { type Board as BoardModel, findPieces, movePiece, pieceAt } from '../chess/board';
import { isInCheck, isMate } from '../chess/check';
import type { Square } from '../chess/types';
import { legalTargets, promote, rate, restart, rewind, startLevel, tap } from '../game/engine';
import { isDeadEnd } from '../game/solver';
import type { GameState, Level } from '../game/types';
import type { MoveEvent } from '../progress/achievements';
import { useXp } from '../progress/store';
import { Board } from './Board';
import { BoardFrame, frameWidthFor } from './BoardFrame';
import { WinDialog } from './WinDialog';
import { GoalBadge } from './GoalBadge';
import { IconButton } from './IconButton';
import { MoveDots } from './MoveDots';
import { PromotionChoice } from './PromotionChoice';
import { strings } from './strings';
import { colors, layout } from './theme';
import { ThreatArrows } from './ThreatArrows';

/**
 * How long a hint stays up.
 *
 * The hint shows danger rather than the answer, so it is a peek and not a
 * setting: leaving the reveal on would turn every tier 3 level back into a
 * tier 2 one, and tier 3 is tier 2 with exactly that help removed.
 */
const HINT_PEEK_MS = 2600;

/**
 * Arrows drawn at once. In practice one or two of her pieces are ever in
 * trouble; the cap is there so a position that goes wrong in five places at
 * once shows the worst of it rather than a red cobweb.
 */
const MAX_THREAT_ARROWS = 3;

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

/**
 * Shorter than the capture rewind: there is no enemy to watch, so the only
 * thing to see is the move itself before it comes back.
 */
const STRANDED_REWIND_MS = 550;

/** Once she has tapped through the celebration, she is telling us to get on with it. */
const AUTO_ADVANCE_AFTER_SKIP_MS = 450;

/** Fire and forget — a missing haptics motor must never break a move. */
const buzz = (style: Haptics.ImpactFeedbackStyle) => {
  Haptics.impactAsync(style).catch(() => {});
};

/**
 * What a completed move counted as, read off the boards either side of it.
 *
 * The board *before* is the only place the answers live: which piece moved,
 * and what was standing on the square it landed on. Afterwards both are gone.
 */
function describeMove(before: BoardModel, after: GameState): MoveEvent {
  const { from, to } = after.lastMove!;
  const landed = pieceAt(after.board, to);

  return {
    piece: pieceAt(before, from)?.type ?? 'p',
    from,
    to,
    captured: pieceAt(before, to)?.type,
    // A pawn that is no longer a pawn was promoted; `promote` mints the new
    // piece on the landing square, so comparing the two boards is enough.
    promotedTo:
      pieceAt(before, from)?.type === 'p' && landed && landed.type !== 'p'
        ? landed.type
        : undefined,
    gaveCheck: isInCheck(after.board, 'b'),
    gaveMate: isMate(after.board, 'b'),
  };
}

export interface LevelPlayerProps {
  level: Level;
  onExit: () => void;
  /** Fires once, when the level is won. */
  onWin?: (stars: 1 | 2 | 3, moves: number) => void;
  /**
   * Fires once per completed move, with everything the achievements need to
   * work out what it counted as.
   *
   * The screen decides what to do with it. `LevelPlayer` deliberately knows
   * nothing about the store — the same reason `onWin` is a callback — so that
   * Endless can count moves without ever recording a level result.
   */
  onMove?: (event: MoveEvent) => void;
  /** Her piece was taken. Fires when the capture starts, not after the rewind. */
  onLost?: () => void;
  /** The position became unwinnable and was taken back. */
  onStranded?: () => void;
  /** She asked to see the danger. */
  onHint?: () => void;
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
  onMove,
  onLost,
  onStranded,
  onHint,
  wonActions,
  onAutoAdvance,
}: LevelPlayerProps) {
  const { width, height } = useWindowDimensions();

  const [state, setState] = useState(() => startLevel(level));
  const [showHint, setShowHint] = useState(false);
  const [skipped, setSkipped] = useState(false);
  /** Board shown mid-punishment, with the enemy already on her square. */
  const [punished, setPunished] = useState<BoardModel | null>(null);
  /**
   * The last tap that changed nothing. `tick` rises on every one of them, so
   * pressing the same empty square four times in a row plays the answer four
   * times rather than once.
   */
  const [nudge, setNudge] = useState<{ square: Square; tick: number } | null>(null);
  /** When the current win happened, so auto-advance can time from it. */
  const wonAt = useRef<number | null>(null);

  const earned = rate(state.moves, level.par);

  /**
   * XP as it stood before this level paid out, so the dialog's bar can travel
   * rather than appear already full.
   *
   * Held in a ref updated *during* render and frozen the moment the level is
   * won: the win effect runs after that render, so by the time `settle` adds
   * anything, this already holds the old value. Reading XP is the one thing
   * this component knows about the store, and it is display state only — every
   * decision about what a level is worth still belongs to the screen.
   */
  const xp = useXp();
  const xpBefore = useRef(xp);
  if (state.phase !== 'won') xpBefore.current = xp;

  /**
   * One emit per completed move, wherever it came from.
   *
   * Keyed on the move count rising rather than hooked into `tap` and
   * `promote` separately, so a promotion is counted exactly once and neither
   * path can be forgotten when one of them changes.
   *
   * A move undone by a rewind still counted: she jumped the knight, and the
   * board taking it back does not unjump it.
   */
  const previous = useRef(state);
  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    if (!onMove || !state.lastMove || state.moves <= before.moves) return;
    onMove(describeMove(before.board, state));
  }, [state, onMove]);

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
    // Counted here, but nothing may be *shown* for it until the level ends:
    // a reward landing mid-rewind would arrive on top of the moment her piece
    // was taken, which is the one moment it must not.
    onLost?.();

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

  /**
   * Takes back a move that stranded her.
   *
   * Nothing attacked her, so there is no capture to play out and no "lost"
   * state — the level has simply become unwinnable. Most obviously: pushing a
   * pawn past a star it needed to land on, or promoting to a queen where only
   * a knight reaches the last enemy. Without this the board would just stop
   * responding, which is the worst possible feedback for a four-year-old.
   *
   * Normally only checked while a pawn is on the board, because every other
   * piece can always move again and captures in the wrong order already lose.
   * Under `allPieces` danger that stops holding: a move can leave every
   * remaining continuation exposing something, with no pawn in sight, so those
   * levels are checked whatever is on the board.
   */
  useEffect(() => {
    if (state.phase !== 'playing' || !state.undo) return;
    const mayStrand =
      level.danger === 'allPieces' ||
      findPieces(state.board, 'w').some((sq) => state.board[sq]?.type === 'p');
    if (!mayStrand) return;
    if (!isDeadEnd(state)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
    onStranded?.();
    const timer = setTimeout(() => setState(rewind), STRANDED_REWIND_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, level.danger]);

  const retry = useCallback(() => {
    setPunished(null);
    setState((s) => restart(s));
    setShowHint(false);
    setSkipped(false);
    setNudge(null);
  }, []);

  const onTapSquare = useCallback(
    (sq: number) => {
      setState((s) => {
        const next = tap(s, sq);
        // A star just came off the board — the most-repeated moment in the game.
        if (next.stars.length < s.stars.length) buzz(Haptics.ImpactFeedbackStyle.Light);
        else if (next.moves > s.moves) buzz(Haptics.ImpactFeedbackStyle.Soft);
        return next;
      });

      // A tap the rules ignore entirely — an empty square with nothing picked
      // up — still gets an answer, or the screen reads as broken to someone who
      // cannot check whether she did something wrong. `tap` is pure, so asking
      // it twice is free; it is asked out here rather than inside the updater
      // above because an updater must not have side effects of its own.
      if (state.phase === 'playing' && tap(state, sq) === state) {
        setNudge((prev) => ({ square: sq, tick: (prev?.tick ?? 0) + 1 }));
      }
    },
    [state],
  );

  /** The hint takes itself back down, so it can never become the new normal. */
  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => setShowHint(false), HINT_PEEK_MS);
    return () => clearTimeout(timer);
  }, [showHint]);

  const hasEnemies = useMemo(() => findPieces(state.board, 'b').length > 0, [state.board]);

  /**
   * What the hint does: turn tier 2's help on for a couple of seconds.
   *
   * Rather than pointing at the answer, which these levels do not have — most
   * have several right move orders — it lends her the thing tier 3 took away.
   * On a tier 2 level the overlay is already on, so what the hint adds there is
   * the arrows.
   */
  const revealing = showHint && hasEnemies;

  // Tier 2 is the only tier that shows the overlay by itself: tier 1 has no
  // enemies, and tier 3 is deliberately the same position with the help off.
  //
  // Once a piece is picked up the overlay is computed for *that* piece, which
  // is the only exact answer to "if I go there, do I get taken": moving changes
  // where one piece stands, so lifting that one off accounts for the line it
  // was blocking while her other pieces keep screening theirs. With a single
  // piece on the board — every level in the six piece worlds — this is the same
  // set as before and nothing on screen moves.
  const danger = useMemo(() => {
    if (level.tier !== 2 && !revealing) return null;
    return state.selected === null
      ? dangerMap(state.board)
      : dangerFrom(state.board, state.selected);
  }, [level.tier, revealing, state.board, state.selected]);

  /**
   * The ring on her own pieces, and the arrows that say what is aiming at them.
   *
   * Both are held back unless the level checks every piece. Under the default
   * rule only the piece that just moved can be taken, so ringing a bystander
   * would promise a consequence that will never arrive — and a warning that
   * turns out not to matter is worse than none, because it teaches her that red
   * is decoration.
   */
  const marksPieces = level.danger === 'allPieces' && (level.tier === 2 || revealing);

  const threatened = useMemo(
    () => (marksPieces ? attackedPieces(state.board, 'w') : null),
    [marksPieces, state.board],
  );

  const threats = useMemo(() => {
    if (!revealing || !marksPieces) return [];
    return [...attackedPieces(state.board, 'w')]
      .map((victim) => ({ from: capturersOf(state.board, victim, 'b')[0], to: victim }))
      .slice(0, MAX_THREAT_ARROWS);
  }, [revealing, marksPieces, state.board]);

  const targets = useMemo(() => legalTargets(state), [state]);
  const board = punished ?? state.board;

  // The frame adds to the board's footprint, so take it off the space
  // available before sizing the squares — otherwise the whole assembly
  // overflows on a small phone.
  //
  // The board is then rounded down to a whole number of pixels per square.
  // A fractional cell leaves squares and the pieces standing on them rounding
  // independently, which shows up as pieces sitting very slightly off centre.
  const available = Math.min(width - layout.boardPadding * 2, height * 0.68);
  const cell = Math.floor((available - frameWidthFor(available) * 2) / 8);
  const boardSize = cell * 8;
  const hintTargets = showHint ? level.hint.map((h) => h.to) : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton name="back" onPress={onExit} accessibilityLabel={strings.play.back} />
        <MoveDots moves={state.moves} par={level.par} />
        {/* Takes over the spacer that used to balance the back button, so the
            counter stays centred and the goal sits opposite the way out — the
            two fixed things on the screen, one on each side. */}
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={strings.play.goals[level.goal]}
          style={styles.goal}
        >
          <GoalBadge goal={level.goal} />
        </View>
      </View>

      <View style={styles.boardWrap}>
        {/* The board is the only warm thing on a dark screen, so it gets to
            look lit rather than pasted on. Sits behind the frame and spills
            well past it — a glow with a visible edge is just a shape. */}
        <BoardGlow size={boardSize * 1.6} />

        <BoardFrame size={boardSize}>
          {/* Board and celebration share this wrapper so the overlay lines up
              with the squares. Absolute children resolve against the padding
              box, so parenting them to the frame itself would offset the
              overlay by the frame's width. */}
          <View style={{ width: boardSize, height: boardSize }}>
            <Board
              board={board}
              stars={state.stars}
              selected={state.selected}
              targets={state.phase === 'playing' ? targets : hintTargets}
              danger={danger}
              threatened={threatened}
              doomed={state.phase === 'lost' ? (state.punisher?.to ?? null) : null}
              lastMove={state.lastMove}
              size={boardSize}
              nudge={nudge}
              onTapSquare={onTapSquare}
            />

            {/* Sibling of the board, not a child of the frame — see the note in
                ThreatArrows. */}
            <ThreatArrows threats={threats} size={boardSize} />

            {state.phase === 'promoting' ? (
              <PromotionChoice
                size={boardSize}
                onChoose={(type) => setState((s) => promote(s, type))}
              />
            ) : null}

          </View>
        </BoardFrame>
      </View>

      <View style={styles.controls}>
        {/* Retry is always present: kids replay constantly, and a button that
            moves or appears conditionally becomes its own obstacle. Cream,
            like every other "do it again" control in the app. */}
        <IconButton
          name="retry"
          kind="again"
          onPress={retry}
          accessibilityLabel={strings.play.retry}
        />

        {/* Available from the first move rather than earned after three
            captures. It shows what the enemy covers, which is the thing she is
            here to learn to see — holding it back until she has been taken
            three times hands it over only once it is too late to use. */}
        {state.phase !== 'won' && (hasEnemies || level.hint.length > 0) ? (
          <IconButton
            name="hint"
            onPress={() => {
              setShowHint(true);
              // Counted as a thing she did, not as a thing she needed. The
              // hint shows the danger, which is what these levels are for.
              onHint?.();
            }}
            accessibilityLabel={strings.play.hint}
          />
        ) : null}
      </View>

      {/* Over everything, including the controls — what happens next lives on
          the card now. Nesting a column of choices inside the centred controls
          row was what left them hanging off to one side. */}
      {state.phase === 'won' ? (
        <WinDialog
          earned={earned}
          xpBefore={xpBefore.current}
          xpAfter={xp}
          size={boardSize}
          onSkipped={() => setSkipped(true)}
        >
          {wonActions}
        </WinDialog>
      ) : null}
    </SafeAreaView>
  );
}

/**
 * The warm pool of light the board sits in.
 *
 * Absolutely positioned and centred behind the frame, so it does not affect
 * the board's own measurement — that arithmetic has to stay exact, because a
 * fractional cell leaves squares and pieces rounding independently.
 */
function BoardGlow({ size }: { size: number }) {
  return (
    <View pointerEvents="none" style={styles.glow}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="board-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.lightSquare} stopOpacity={0.16} />
            <Stop offset="45%" stopColor={colors.lightSquare} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={colors.lightSquare} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={50} fill="url(#board-glow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  glow: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.boardPadding,
    paddingVertical: 8,
  },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  goal: { width: layout.touchTarget, alignItems: 'center', justifyContent: 'center' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 16,
    minHeight: layout.touchTarget * 1.4 + 16,
  },
});
