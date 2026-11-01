import * as Haptics from 'expo-haptics';
import { type ReactNode, type Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type AnimatedRef,
  Easing,
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { findPieces } from '../chess/board';
import type { Color, Piece, PieceType, Square } from '../chess/types';
import {
  STAGES,
  type StageKey,
  demoOf,
  hintOf,
  isComplete,
  isStageOpen,
  place,
  squareAtPoint,
  squareCentre,
  startStage,
} from '../game/setup';
import { useXp } from '../progress/store';
import { Board } from './Board';
import { BLOOM_MS, Bloom, BloomWave } from './BoardBloom';
import { BoardFrame, frameWidthFor } from './BoardFrame';
import { Halo } from './GoalBadge';
import { IconButton } from './IconButton';
import { pieceArt } from './pieces';
import { strings } from './strings';
import { colors, layout, pieceSpring } from './theme';
import { WinDialog } from './WinDialog';

/** How long each piece of the opening demonstration takes to arrive and go. */
const FADE_MS = 260;
/** How long the demonstration holds once every piece is up. */
const HOLD_MS = 1300;
/**
 * The piece's trip to a square, right or wrong. Ease-out, because it is her
 * action being answered: it leaves at once and lands soft. It shrinks to the
 * board's size on the way, so what arrives is the piece the square would hold.
 */
const FLY_MS = 170;
const FLY = { duration: FLY_MS, easing: Easing.out(Easing.cubic) };

/**
 * The wrong square's answer: the piece rocks on its foot, a toy saying
 * "no-no", then goes home. A rock rather than a buzz because a buzz reads as
 * something broken, and this is a square politely declining.
 */
const ROCK_DEG = 12;
const ROCK_STEP_MS = 70;
const ROCK_MS = ROCK_STEP_MS * 5;
const SETTLE_MS = 120;

/** The next piece sliding in from the queue beside the slot. */
const ARRIVE = { duration: 200, easing: Easing.bezier(0.165, 0.84, 0.44, 1) };

/** The finished board lighting up a rank at a time, from her side to theirs. */
const WAVE_STEP_MS = 55;

/** Beat between the last piece going down and the end-of-stage card: the wave, and a breath after. */
const DONE_DELAY_MS = WAVE_STEP_MS * 7 + BLOOM_MS + 100;

const PIECE_NAMES: Record<PieceType, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

const buzz = (style: Haptics.ImpactFeedbackStyle) => {
  Haptics.impactAsync(style).catch(() => {});
};

interface Mark {
  readonly square: Square;
  readonly color: Color;
  readonly type: PieceType;
}

/** What is being shown on the board: the stage's opening, or a hint for one piece. */
interface Peek {
  readonly kind: 'demo' | 'hint';
  readonly marks: readonly Mark[];
  /** Goes up on every peek, so asking twice plays it twice. */
  readonly tick: number;
}

export interface SetupPlayerProps {
  stage: number;
  /** How many stages she has finished, for the row of stages along the top. */
  finished: number;
  onExit: () => void;
  onPickStage: (stage: number) => void;
  /** Fires once, when the last piece of the stage is down. */
  onComplete: () => void;
  /** What the end-of-stage card offers. */
  wonActions?: ReactNode;
}

/**
 * The board-setup screen: an empty-ish board, and the pieces coming in one at
 * a time underneath it.
 *
 * She puts each one down by **dragging it** onto its square or by **tapping
 * the square** — the tap is not a lesser path, it is the one a screen reader
 * can operate and the one a four-year-old with a shaky drag will reach for.
 *
 * A wrong square is answered the same way either way: the piece goes to it,
 * gives a small shake, and comes home to the tray. It is never "wrong" in red
 * and never counted. The trip there is what makes the shake read as *that
 * square said no* rather than as the tray being broken.
 *
 * Word-free like every board screen. The row of stages at the top is pieces,
 * the buttons are glyphs, and the only words are on the end-of-stage card,
 * where an adult is most likely to be looking.
 */
export function SetupPlayer({
  stage,
  finished,
  onExit,
  onPickStage,
  onComplete,
  wonActions,
}: SetupPlayerProps) {
  const { width, height } = useWindowDimensions();
  const spec = STAGES[stage];
  const xp = useXp();
  const xpBefore = useRef(xp);

  const [state, setState] = useState(() => startStage(stage));
  // Mirrored so a drop from the gesture thread always reads the board as it
  // is now, not as it was when the gesture was built — and so two drops in
  // one tick cannot both place the same piece.
  const live = useRef(state);
  live.current = state;

  const [peek, setPeek] = useState<Peek | null>(() =>
    spec.demo ? { kind: 'demo', marks: demoOf(state), tick: 0 } : null,
  );
  const [won, setWon] = useState(false);
  const [nudge, setNudge] = useState<{ square: Square; tick: number } | null>(null);
  const [bloom, setBloom] = useState<{ square: Square; tick: number } | null>(null);
  const [wave, setWave] = useState(false);

  const boardRef = useAnimatedRef<View>();
  const incoming = useRef<IncomingHandle>(null);
  /** A piece is on its way to the square that will take it; nothing else may start. */
  const landing = useRef(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** Puts the piece in her hand down on `sq`, once it has arrived there. */
  const commit = useCallback(
    (sq: Square) => {
      landing.current = false;
      const before = live.current;
      const after = place(before, sq);
      if (after === before) return;

      live.current = after;
      setState(after);
      setBloom((b) => ({ square: sq, tick: (b?.tick ?? 0) + 1 }));
      buzz(Haptics.ImpactFeedbackStyle.Light);

      if (isComplete(after)) {
        setWave(true);
        // A beat to look at the finished board before the card covers it.
        timers.current.push(
          setTimeout(() => {
            buzz(Haptics.ImpactFeedbackStyle.Medium);
            setWon(true);
            onComplete();
          }, DONE_DELAY_MS),
        );
      }
    },
    [onComplete],
  );

  /**
   * A drop or a tap on `sq`, answered. Both paths come through here, so a
   * wrong square says exactly the same thing however she chose it.
   */
  const answer = useCallback((sq: Square) => {
    const s = live.current;
    if (landing.current || isComplete(s)) return;
    if (place(s, sq) !== s) {
      if (!incoming.current) return commit(sq);
      landing.current = true;
      incoming.current.accept(sq);
      return;
    }
    setNudge((n) => ({ square: sq, tick: (n?.tick ?? 0) + 1 }));
    incoming.current?.reject(sq);
  }, [commit]);

  const demo = peek?.kind === 'demo';

  const onTapSquare = useCallback(
    (sq: Square) => {
      if (won) return;
      // A tap during the opening is "I've got it" — the same rule as the win
      // card: a tap always means get on with it.
      if (demo) {
        setPeek(null);
        return;
      }
      answer(sq);
    },
    [answer, demo, won],
  );

  const showHint = useCallback(() => {
    setPeek((p) => ({ kind: 'hint', marks: hintOf(live.current), tick: (p?.tick ?? 0) + 1 }));
  }, []);

  // Same arithmetic as `LevelPlayer`, with a smaller share of the height: the
  // tray under the board needs room for a piece big enough to grab.
  const available = Math.min(width - layout.boardPadding * 2, height * 0.56);
  const cell = Math.floor((available - frameWidthFor(available) * 2) / 8);
  const boardSize = cell * 8;
  const pieceSize = Math.max(56, Math.round(cell * 1.35));

  const current = state.queue[0];
  const waiting = state.queue.slice(1, 4);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton name="back" onPress={onExit} accessibilityLabel={strings.play.back} />
        <View style={styles.spacer} />
        {current && !won ? (
          <IconButton name="hint" onPress={showHint} accessibilityLabel={strings.setup.hint} />
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <StageRow stage={stage} finished={finished} onPick={onPickStage} />

      <View style={styles.boardWrap}>
        <BoardFrame size={boardSize}>
          {/* Overlays are siblings of `Board` inside this wrapper, never
              children of the frame — see the note in AGENTS.md. It is also
              what the drag measures, so the drop is read against the squares
              rather than the wood around them. */}
          <View ref={boardRef} collapsable={false} style={{ width: boardSize, height: boardSize }}>
            <Board
              board={state.board}
              stars={[]}
              selected={null}
              targets={[]}
              danger={null}
              lastMove={state.last === null ? null : { from: state.last, to: state.last }}
              size={boardSize}
              nudge={nudge}
              arrived={state.last}
              onTapSquare={onTapSquare}
            />
            {bloom ? <Bloom key={bloom.tick} square={bloom.square} cell={cell} /> : null}
            {wave ? (
              // Every piece's square, a rank at a time from her side to theirs.
              <BloomWave
                squares={findPieces(state.board)}
                cell={cell}
                delayOf={(sq) => Math.floor(sq / 8) * WAVE_STEP_MS}
              />
            ) : null}
            {peek ? (
              <Ghosts
                key={peek.tick}
                marks={peek.marks}
                cell={cell}
                onDone={() => setPeek(null)}
              />
            ) : null}
          </View>
        </BoardFrame>
      </View>

      {/* Hidden during the opening: she watches where they go first, and the
          pieces arrive once the board has shown her. */}
      <View style={[styles.tray, { minHeight: pieceSize + 32 }]}>
        {current && !demo && !won ? (
          <>
            <View style={[styles.slot, { width: pieceSize + 20, height: pieceSize + 20 }]}>
              <IncomingPiece
                key={current.id}
                ref={incoming}
                piece={current}
                size={pieceSize}
                cell={cell}
                boardRef={boardRef}
                onDrop={answer}
                onLanded={commit}
              />
            </View>
            {/* The ones behind it, small and dim: there are more coming, and
                she can see which colour is next. */}
            <View style={styles.waiting} {...DECORATIVE}>
              {waiting.map((p) => {
                const Art = pieceArt(p.color, p.type);
                return (
                  <View key={p.id} style={styles.waitingPiece}>
                    {p.color === 'b' ? <Halo size={pieceSize * 0.8} id={`halo-${p.id}`} /> : null}
                    <Art width={pieceSize * 0.55} height={pieceSize * 0.55} />
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </View>

      {won ? (
        <WinDialog earned={3} xpBefore={xpBefore.current} xpAfter={xp} size={boardSize}>
          {wonActions}
        </WinDialog>
      ) : null}
    </SafeAreaView>
  );
}

const DECORATIVE = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

export interface IncomingHandle {
  /** Fly to `sq` and hand over to the board. For a square that takes the piece. */
  accept: (sq: Square) => void;
  /** Fly to `sq`, rock "no-no", and come home. For a square that does not. */
  reject: (sq: Square) => void;
}

/**
 * The piece in her hand. Drag it to a square, or leave it and tap the square.
 *
 * Either way it travels to the square before anything is decided on the
 * board, so a tap is never a teleport: she sees her piece go there, which is
 * the same thing a drag shows her.
 *
 * Keyed by piece id, so each piece is a fresh mount with its own position: the
 * one she just put down unmounts in the same render the board gains it, which
 * is what stops it flashing back to the tray for a frame before vanishing.
 */
function IncomingPiece({
  piece,
  size,
  cell,
  boardRef,
  onDrop,
  onLanded,
  ref,
}: {
  piece: Piece;
  size: number;
  /** The board's square size, which the piece shrinks to on its way there. */
  cell: number;
  boardRef: AnimatedRef<View>;
  /** Let go over a square. The parent answers with `accept` or `reject`. */
  onDrop: (sq: Square) => void;
  /** Arrived on a square that takes it. */
  onLanded: (sq: Square) => void;
  ref?: Ref<IncomingHandle>;
}) {
  const reduced = useReducedMotion();
  /** The untransformed slot, so "home" can be measured while the piece is away. */
  const home = useAnimatedRef<View>();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const baseX = useSharedValue(0);
  const baseY = useSharedValue(0);
  const lift = useSharedValue(0);
  /** 0 in the tray, 1 at the board's size. */
  const shrink = useSharedValue(0);
  const tilt = useSharedValue(0);
  /** 0 still in the queue, 1 in the slot. */
  const enter = useSharedValue(0);
  /** On its way to a square that takes it: hands off until the board has it. */
  const flying = useSharedValue(false);

  useEffect(() => {
    enter.value = withTiming(1, ARRIVE);
  }, [enter]);

  /** How far the slot's centre is from `sq`'s, or null if either is unmeasured. */
  const offsetTo = useCallback(
    (sq: Square) => {
      'worklet';
      const b = measure(boardRef);
      const h = measure(home);
      if (!b || !h) return null;
      const c = squareCentre(sq, { x: b.pageX, y: b.pageY, width: b.width, height: b.height });
      return { dx: c.x - (h.pageX + h.width / 2), dy: c.y - (h.pageY + h.height / 2) };
    },
    [boardRef, home],
  );

  const accept = useCallback(
    (sq: Square) => {
      scheduleOnUI(() => {
        'worklet';
        const to = offsetTo(sq);
        // Reduced motion keeps the answer — the piece on its square — and
        // drops the trip.
        if (!to || reduced) {
          scheduleOnRN(onLanded, sq);
          return;
        }
        flying.value = true;
        lift.value = withTiming(0, FLY);
        shrink.value = withTiming(1, FLY);
        ty.value = withTiming(to.dy, FLY);
        tx.value = withTiming(to.dx, FLY, () => {
          scheduleOnRN(onLanded, sq);
        });
      });
    },
    [flying, lift, offsetTo, onLanded, reduced, shrink, tx, ty],
  );

  const reject = useCallback(
    (sq: Square) => {
      scheduleOnUI(() => {
        'worklet';
        const to = offsetTo(sq);
        lift.value = withSpring(0, pieceSpring);
        if (!to || reduced) {
          // Reduced motion keeps the answer — the square's ring, and the
          // piece back in the tray — and drops the trip.
          tx.value = withTiming(0, { duration: 150 });
          ty.value = withTiming(0, { duration: 150 });
          shrink.value = withTiming(0, { duration: 150 });
          return;
        }
        const away = ROCK_MS + SETTLE_MS;
        const step = { duration: ROCK_STEP_MS };
        tx.value = withSequence(withTiming(to.dx, FLY), withDelay(away, withSpring(0, pieceSpring)));
        ty.value = withSequence(withTiming(to.dy, FLY), withDelay(away, withSpring(0, pieceSpring)));
        shrink.value = withSequence(withTiming(1, FLY), withDelay(away, withSpring(0, pieceSpring)));
        // Each swing smaller than the last, so it comes to rest rather than
        // stopping dead.
        tilt.value = withSequence(
          withDelay(FLY_MS, withTiming(ROCK_DEG, step)),
          withTiming(-ROCK_DEG * 0.8, step),
          withTiming(ROCK_DEG * 0.5, step),
          withTiming(-ROCK_DEG * 0.25, step),
          withTiming(0, step),
        );
      });
    },
    [lift, offsetTo, reduced, shrink, tilt, tx, ty],
  );

  useImperativeHandle(ref, () => ({ accept, reject }), [accept, reject]);

  const goHome = () => {
    'worklet';
    tx.value = withSpring(0, pieceSpring);
    ty.value = withSpring(0, pieceSpring);
    lift.value = withSpring(0, pieceSpring);
    shrink.value = withSpring(0, pieceSpring);
  };

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        // One finger, and a small dead zone so a tap on the piece is not a
        // drag to where it already is.
        .maxPointers(1)
        .minDistance(4)
        .shouldCancelWhenOutside(false)
        .onStart((e) => {
          if (flying.value) return;
          // Centre the piece on her finger, so what she is aiming with is the
          // piece and not wherever on it she happened to grab. Grabbing it on
          // its way home is allowed, so it starts from wherever it is.
          baseX.value = tx.value + e.x - size / 2 - e.translationX;
          baseY.value = ty.value + e.y - size / 2 - e.translationY;
          tx.value = baseX.value + e.translationX;
          ty.value = baseY.value + e.translationY;
          lift.value = withSpring(1, pieceSpring);
          shrink.value = withSpring(0, pieceSpring);
          tilt.value = withTiming(0, { duration: 120 });
        })
        .onUpdate((e) => {
          if (flying.value) return;
          tx.value = baseX.value + e.translationX;
          ty.value = baseY.value + e.translationY;
        })
        .onEnd((e) => {
          if (flying.value) return;
          const b = measure(boardRef);
          const sq = squareAtPoint(
            e.absoluteX,
            e.absoluteY,
            b ? { x: b.pageX, y: b.pageY, width: b.width, height: b.height } : null,
          );
          if (sq < 0) {
            // Let go off the board: nothing to say no, so just come home.
            goHome();
            return;
          }
          scheduleOnRN(onDrop, sq);
        })
        .onFinalize((_e, success) => {
          // A cancelled pan never reaches `onEnd`; without this the piece
          // would be stranded wherever the finger was.
          if (!success && !flying.value) goHome();
        }),
    // `goHome` closes over the same shared values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseX, baseY, boardRef, flying, lift, onDrop, shrink, size, tilt, tx, ty],
  );

  // A rotation about the piece's foot rather than its middle, so the rock
  // reads as a piece standing on a square, not one spinning in the air: the
  // scale stays about the centre, which is what lands it square-on.
  const foot = size * 0.35;
  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateX: tx.value + (reduced ? 0 : (1 - enter.value) * size * 0.6) },
      { translateY: ty.value },
      { scale: (1 + lift.value * 0.15) * (1 + shrink.value * (cell / size - 1)) },
      { translateY: foot },
      { rotate: `${tilt.value}deg` },
      { translateY: -foot },
    ],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: enter.value }));

  const Art = pieceArt(piece.color, piece.type);

  return (
    <View ref={home} collapsable={false} style={{ width: size, height: size }}>
      {/* The Cburnett black set is black on black and vanishes on the plum
          chrome. The halo stays home while the piece travels, so it reads as
          light in the tray rather than as part of the piece. */}
      {piece.color === 'b' ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, haloStyle]}>
          <Halo size={size * 1.35} id={`halo-${piece.id}`} />
        </Animated.View>
      ) : null}
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="image"
          accessibilityLabel={strings.setup.incoming(piece.color, PIECE_NAMES[piece.type])}
          style={[{ width: size, height: size }, style]}
        >
          <Art width={size} height={size} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**
 * Pieces shown on their squares and taken away again: the stage's opening
 * ("this is where they go"), or the hint for the piece in her hand.
 *
 * Drawn over the board rather than put on it, so the board itself only ever
 * holds what she has actually placed — and the pieces fade rather than shrink,
 * because shrinking away is what a *captured* piece does.
 */
function Ghosts({
  marks,
  cell,
  onDone,
}: {
  marks: readonly Mark[];
  cell: number;
  onDone: () => void;
}) {
  // Eight pawns a side would take an age one at a time, so the stagger
  // tightens as the count goes up.
  const stagger = marks.length > 4 ? 60 : 160;

  useEffect(() => {
    const total = Math.max(0, marks.length - 1) * stagger + FADE_MS * 2 + HOLD_MS;
    const timer = setTimeout(onDone, total);
    return () => clearTimeout(timer);
    // `onDone` is a fresh arrow every render; the peek's own key restarts this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} {...DECORATIVE}>
      {marks.map((m, i) => (
        <Ghost
          key={m.square}
          mark={m}
          cell={cell}
          delay={i * stagger}
          hold={HOLD_MS + (marks.length - 1 - i) * stagger}
        />
      ))}
    </View>
  );
}

function Ghost({
  mark,
  cell,
  delay,
  hold,
}: {
  mark: Mark;
  cell: number;
  delay: number;
  hold: number;
}) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: FADE_MS }),
        withDelay(hold, withTiming(0, { duration: FADE_MS })),
      ),
    );
  }, [delay, hold, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value * 0.85,
    transform: [{ translateY: reduced ? 0 : (1 - t.value) * -cell * 0.35 }],
  }));

  const Art = pieceArt(mark.color, mark.type);
  const file = mark.square % 8;
  const rank = Math.floor(mark.square / 8);

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: cell, height: cell, left: file * cell, top: (7 - rank) * cell },
        style,
      ]}
    >
      <Art width={cell} height={cell} />
    </Animated.View>
  );
}

/**
 * The stages along the top, as the pieces they are about.
 *
 * The same reading as the path's circles without needing numbers: a piece
 * lit up is one she can do, a dim one is still to come, and the ring is the
 * one she is on. Finished ones sit on a jade wash, which is what finished
 * means on the path too.
 */
function StageRow({
  stage,
  finished,
  onPick,
}: {
  stage: number;
  finished: number;
  onPick: (stage: number) => void;
}) {
  return (
    <View style={styles.stages}>
      {STAGES.map((s, i) => {
        const open = isStageOpen(i, finished);
        const done = i < finished;
        const label = [
          strings.setup.stages[s.key],
          done ? strings.setup.done : open ? '' : strings.setup.locked,
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <Pressable
            key={s.key}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !open, selected: i === stage }}
            disabled={!open || i === stage}
            onPress={() => onPick(i)}
            hitSlop={4}
            style={[
              styles.stage,
              done && styles.stageDone,
              i === stage && styles.stageCurrent,
              !open && styles.stageLocked,
            ]}
          >
            <StageGlyph stage={s.key} size={30} />
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A stage's mark: its piece, for "everything" a pair standing together, and
 * for the lone pawn a pawn on one board square.
 */
export function StageGlyph({ stage, size }: { stage: StageKey; size: number }) {
  if (stage === 'lone') {
    // The square is what tells it from the pawns stage — a pawn on its own on
    // the board — and a light square is the one place a black piece shows.
    const Pawn = pieceArt('b', 'p');
    const tile = Math.round(size * 0.8);
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: tile,
            height: tile,
            borderRadius: 3,
            backgroundColor: colors.lightSquare,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pawn width={tile * 0.9} height={tile * 0.9} />
        </View>
      </View>
    );
  }
  if (stage === 'all') {
    // Both white: a black piece would vanish on the dark circle.
    const King = pieceArt('w', 'k');
    const Queen = pieceArt('w', 'q');
    return (
      <View style={{ width: size, height: size, flexDirection: 'row' }}>
        <View style={{ marginLeft: -size * 0.12 }}>
          <Queen width={size * 0.75} height={size * 0.75} />
        </View>
        <View style={{ marginLeft: -size * 0.38, marginTop: size * 0.25 }}>
          <King width={size * 0.75} height={size * 0.75} />
        </View>
      </View>
    );
  }
  const Art = pieceArt('w', stage);
  return <Art width={size} height={size} />;
}

// Eight of these and their gaps have to fit across a 360-wide phone.
const STAGE_SIZE = 38;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.boardPadding,
    paddingVertical: 8,
  },
  spacer: { width: layout.touchTarget },
  stages: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: layout.boardPadding,
    paddingBottom: 4,
  },
  stage: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    borderRadius: STAGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stageDone: { backgroundColor: colors.greenSoft },
  // Cream, the app's one ring for "this one".
  stageCurrent: { borderColor: colors.text },
  stageLocked: { opacity: 0.3 },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 20,
    // Above the board, so a piece dragged up onto it is drawn over the squares.
    zIndex: 1,
  },
  // Over the queue beside it, for the same reason the tray is over the board.
  slot: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
  },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 2, opacity: 0.6 },
  waitingPiece: { marginLeft: -6, alignItems: 'center', justifyContent: 'center' },
});
