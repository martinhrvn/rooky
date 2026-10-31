import * as Haptics from 'expo-haptics';
import { type ReactNode, type Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type AnimatedRef,
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
/** Beat between the last piece going down and the end-of-stage card. */
const DONE_DELAY_MS = 650;

/** The piece's trip to a wrong square, the shake there, and the beat before it goes home. */
const FLY_MS = 160;
const SHAKE_STEP_MS = 55;
const SHAKE_PX = 7;
const SETTLE_MS = 120;

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

  const boardRef = useAnimatedRef<View>();
  const incoming = useRef<IncomingHandle>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** Puts the piece in her hand on `sq` if it goes there. True if it did. */
  const tryPlace = useCallback(
    (sq: Square): boolean => {
      const before = live.current;
      const after = place(before, sq);
      if (after === before) return false;

      live.current = after;
      setState(after);
      buzz(Haptics.ImpactFeedbackStyle.Light);

      if (isComplete(after)) {
        // A beat to look at the finished board before the card covers it.
        timers.current.push(
          setTimeout(() => {
            buzz(Haptics.ImpactFeedbackStyle.Medium);
            setWon(true);
            onComplete();
          }, DONE_DELAY_MS),
        );
      }
      return true;
    },
    [onComplete],
  );

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
      if (tryPlace(sq)) return;
      setNudge((n) => ({ square: sq, tick: (n?.tick ?? 0) + 1 }));
      incoming.current?.reject(sq);
    },
    [demo, tryPlace, won],
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
              onTapSquare={onTapSquare}
            />
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
                boardRef={boardRef}
                onDrop={tryPlace}
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
  /** Fly to `sq`, shake, and come home. For a tap on the wrong square. */
  reject: (sq: Square) => void;
}

/**
 * The piece in her hand. Drag it to a square, or leave it and tap the square.
 *
 * Keyed by piece id, so each piece is a fresh mount with its own position: the
 * one she just put down unmounts in the same render the board gains it, which
 * is what stops it flashing back to the tray for a frame before vanishing.
 */
function IncomingPiece({
  piece,
  size,
  boardRef,
  onDrop,
  ref,
}: {
  piece: Piece;
  size: number;
  boardRef: AnimatedRef<View>;
  /** True if the piece went down. False sends it home with a shake. */
  onDrop: (sq: Square) => boolean;
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

  const reject = useCallback(
    (sq: Square) => {
      scheduleOnUI(() => {
        'worklet';
        const b = measure(boardRef);
        const h = measure(home);
        lift.value = withSpring(0, pieceSpring);
        if (!b || !h || reduced) {
          // Reduced motion keeps the answer — the square's ring, and the
          // piece back in the tray — and drops the trip.
          tx.value = withTiming(0, { duration: 150 });
          ty.value = withTiming(0, { duration: 150 });
          return;
        }
        const c = squareCentre(sq, { x: b.pageX, y: b.pageY, width: b.width, height: b.height });
        const dx = c.x - (h.pageX + h.width / 2);
        const dy = c.y - (h.pageY + h.height / 2);
        const step = { duration: SHAKE_STEP_MS };
        tx.value = withSequence(
          withTiming(dx, { duration: FLY_MS }),
          withTiming(dx + SHAKE_PX, step),
          withTiming(dx - SHAKE_PX, step),
          withTiming(dx + SHAKE_PX * 0.6, step),
          withTiming(dx - SHAKE_PX * 0.3, step),
          withTiming(dx, step),
          withDelay(SETTLE_MS, withSpring(0, pieceSpring)),
        );
        ty.value = withSequence(
          withTiming(dy, { duration: FLY_MS }),
          withDelay(SHAKE_STEP_MS * 5 + SETTLE_MS, withSpring(0, pieceSpring)),
        );
      });
    },
    [boardRef, home, lift, reduced, tx, ty],
  );

  useImperativeHandle(ref, () => ({ reject }), [reject]);

  const dropped = useCallback(
    (sq: Square) => {
      if (!onDrop(sq)) reject(sq);
    },
    [onDrop, reject],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        // One finger, and a small dead zone so a tap on the piece is not a
        // drag to where it already is.
        .maxPointers(1)
        .minDistance(4)
        .shouldCancelWhenOutside(false)
        .onStart((e) => {
          // Centre the piece on her finger, so what she is aiming with is the
          // piece and not wherever on it she happened to grab.
          baseX.value = tx.value + e.x - size / 2 - e.translationX;
          baseY.value = ty.value + e.y - size / 2 - e.translationY;
          tx.value = baseX.value + e.translationX;
          ty.value = baseY.value + e.translationY;
          lift.value = withSpring(1, pieceSpring);
        })
        .onUpdate((e) => {
          tx.value = baseX.value + e.translationX;
          ty.value = baseY.value + e.translationY;
        })
        .onEnd((e) => {
          const b = measure(boardRef);
          const sq = squareAtPoint(
            e.absoluteX,
            e.absoluteY,
            b ? { x: b.pageX, y: b.pageY, width: b.width, height: b.height } : null,
          );
          if (sq < 0) {
            // Let go off the board: nothing to say no, so just come home.
            tx.value = withSpring(0, pieceSpring);
            ty.value = withSpring(0, pieceSpring);
            lift.value = withSpring(0, pieceSpring);
            return;
          }
          scheduleOnRN(dropped, sq);
        })
        .onFinalize((_e, success) => {
          // A cancelled pan never reaches `onEnd`; without this the piece
          // would be stranded wherever the finger was.
          if (!success) {
            tx.value = withSpring(0, pieceSpring);
            ty.value = withSpring(0, pieceSpring);
            lift.value = withSpring(0, pieceSpring);
          }
        }),
    [baseX, baseY, boardRef, dropped, lift, size, tx, ty],
  );

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: 1 + lift.value * 0.15 },
    ],
  }));

  const Art = pieceArt(piece.color, piece.type);

  return (
    <View ref={home} collapsable={false} style={{ width: size, height: size }}>
      {/* The Cburnett black set is black on black and vanishes on the plum
          chrome. The halo stays home while the piece travels, so it reads as
          light in the tray rather than as part of the piece. */}
      {piece.color === 'b' ? <Halo size={size * 1.35} id={`halo-${piece.id}`} /> : null}
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

/** A stage's mark: its piece, or for the last stage a pair standing together. */
export function StageGlyph({ stage, size }: { stage: StageKey; size: number }) {
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

const STAGE_SIZE = 40;

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
    gap: 6,
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
