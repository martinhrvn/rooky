import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import type { Board as BoardModel } from '../chess/board';
import { findPieces } from '../chess/board';
import { type Piece, type PieceType, type Square, fileOf, rankOf, squareName } from '../chess/types';
import type { Move } from '../game/types';
import { pieceArt } from './pieces';
import { Star } from './Star';
import { colors, pieceSpring } from './theme';

export interface BoardProps {
  board: BoardModel;
  /** Stars still to collect. */
  stars: readonly Square[];
  selected: Square | null;
  /** Legal destinations for the selected piece. */
  targets: readonly Square[];
  /** Squares the enemy covers. `null` hides the overlay (tiers 1 and 3). */
  danger: ReadonlySet<Square> | null;
  /**
   * Her own pieces that could be taken where they stand.
   *
   * A different question from `danger`, and so a different mark: that one fills
   * the square and means "do not go here", this one rings the piece and means
   * "this one is in trouble". Filling the square for both would say the piece's
   * own square is a place to avoid, which is the opposite of the point.
   */
  threatened?: ReadonlySet<Square> | null;
  /**
   * The square she was just taken on. Pulses red regardless of tier — in tier
   * 3 the overlay is hidden, so this is the only thing that says *where* the
   * mistake was.
   */
  doomed?: Square | null;
  lastMove: Move | null;
  /** Board edge length in px. */
  size: number;
  /**
   * The square of a tap that changed nothing, and a counter that goes up on
   * every such tap so a repeat replays the answer rather than being swallowed.
   */
  nudge?: { square: Square; tick: number } | null;
  onTapSquare: (sq: Square) => void;
}

const PIECE_NAMES: Record<PieceType, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

/**
 * A square, said out loud.
 *
 * The hit layer used to be sixty-four buttons called "a1" through "h8", which
 * is the board's coordinates and none of its content: what stands there, what
 * it can do, and what is aiming at it were all carried by colour alone.
 *
 * It says exactly what the squares themselves say and no more — the danger set
 * is already null on tiers 1 and 3, so this cannot hand a screen-reader user
 * the help that tier 3 exists to withhold.
 */
function describeSquare(
  sq: Square,
  board: BoardModel,
  starSet: ReadonlySet<Square>,
  targetSet: ReadonlySet<Square>,
  selected: Square | null,
  danger: ReadonlySet<Square> | null | undefined,
  threatened: ReadonlySet<Square> | null | undefined,
): string {
  const parts = [squareName(sq)];
  const piece = board[sq];

  if (piece) parts.push(`${piece.color === 'w' ? 'your' : 'their'} ${PIECE_NAMES[piece.type]}`);
  if (starSet.has(sq)) parts.push('star');
  if (selected === sq) parts.push('picked up');
  if (targetSet.has(sq)) parts.push(piece || starSet.has(sq) ? 'can take this' : 'can move here');

  // The ring on a piece and the wash on a square are two different facts, and
  // stay two different words.
  if (threatened?.has(sq)) parts.push('in danger');
  else if (danger?.has(sq)) parts.push('they cover this square');

  return parts.join(', ');
}

/**
 * Everything drawn under the hit layer is decoration as far as a screen reader
 * is concerned: the pieces, the stars, the glows and the hints are all already
 * said by the label on the button covering that square. Without this they
 * become a second, unordered pass over the same board.
 */
const DECORATIVE = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** Screen position of a square's top-left corner, white at the bottom. */
const xOf = (sq: Square, cell: number) => fileOf(sq) * cell;
const yOf = (sq: Square, cell: number) => (7 - rankOf(sq)) * cell;

const isLight = (sq: Square) => (fileOf(sq) + rankOf(sq)) % 2 === 1;

export function Board({
  board,
  stars,
  selected,
  targets,
  danger,
  threatened,
  doomed,
  lastMove,
  size,
  nudge,
  onTapSquare,
}: BoardProps) {
  const cell = size / 8;
  const targetSet = new Set(targets);
  const starSet = new Set(stars);
  const collecting = useVanishingStars(stars);
  const captured = useCapturedPieces(board);

  return (
    <View style={[styles.board, { width: size, height: size }]}>
      {/* Squares, plus every tint that belongs to a square. */}
      {Array.from({ length: 64 }, (_, sq) => {
        const touched = lastMove && (lastMove.from === sq || lastMove.to === sq);
        return (
          <View
            key={`sq-${sq}`}
            style={[
              styles.cell,
              {
                width: cell,
                height: cell,
                left: xOf(sq, cell),
                top: yOf(sq, cell),
                backgroundColor: isLight(sq) ? colors.lightSquare : colors.darkSquare,
              },
            ]}
          >
            {touched ? <View style={[styles.fill, { backgroundColor: colors.lastMove }]} /> : null}
            {selected === sq ? (
              <View style={[styles.fill, { backgroundColor: colors.selected }]} />
            ) : null}
            {danger?.has(sq) ? (
              <View style={[styles.fill, { backgroundColor: colors.danger }]} />
            ) : null}
            {doomed === sq ? <DoomedSquare /> : null}
          </View>
        );
      })}

      {/* Stars sit under the pieces, so landing on one visibly covers it. */}
      {[...starSet].map((sq) => (
        <View
          key={`star-${sq}`}
          pointerEvents="none"
          {...DECORATIVE}
          style={[
            styles.centred,
            { width: cell, height: cell, left: xOf(sq, cell), top: yOf(sq, cell) },
          ]}
        >
          <Star size={cell * 0.62} />
        </View>
      ))}

      {/* Stars that were just taken, popping on their way out. This is the
          moment that repeats most in the whole game, so it gets the animation. */}
      {collecting.map((sq) => (
        <CollectedStar key={`collected-${sq}`} square={sq} cell={cell} />
      ))}

      {/* Pieces taken since the last render, shrinking away where they stood.
          Covers both directions: enemies she captures, and her own piece when
          it gets taken. */}
      {captured.map(({ piece, square }) => (
        <CapturedPiece key={`captured-${piece.id}`} piece={piece} square={square} cell={cell} />
      ))}

      {/* Under the pieces, so the artwork stays crisp and the red reads as
          something the piece is standing in. Above it — the ring this replaced —
          the mark competed with the piece it was about, and at a glance looked
          like one more square the board had painted rather than a fact about
          her rook. */}
      {[...(threatened ?? [])].map((sq) => (
        <View
          key={`threat-${sq}`}
          pointerEvents="none"
          {...DECORATIVE}
          style={[
            styles.centred,
            { width: cell, height: cell, left: xOf(sq, cell), top: yOf(sq, cell) },
          ]}
        >
          <ThreatGlow cell={cell} id={`threat-glow-${sq}`} />
        </View>
      ))}

      {findPieces(board).map((sq) => (
        <PieceView key={board[sq]!.id} piece={board[sq]!} square={sq} cell={cell} />
      ))}

      {/* Move hints go above the pieces so a capture target still reads. */}
      {[...targetSet].map((sq) => (
        <MoveHint
          key={`target-${sq}`}
          square={sq}
          cell={cell}
          from={selected}
          isCapture={Boolean(board[sq]) || starSet.has(sq)}
        />
      ))}

      {/* A tap that did nothing, answered. Above the pieces so it reads as
          something the board did, under the hit layer so it cannot eat the
          next tap. */}
      {nudge ? <TapNudge key={nudge.tick} square={nudge.square} cell={cell} /> : null}

      {/* Touch layer on top, so the whole square is tappable rather than just
          the piece inside it. Board squares can't reach the 64dp target we use
          for buttons (eight of them have to fit across the screen), so making
          the entire square live is what keeps mis-taps cheap. */}
      {Array.from({ length: 64 }, (_, sq) => (
        <Pressable
          key={`hit-${sq}`}
          accessibilityRole="button"
          accessibilityLabel={describeSquare(
            sq,
            board,
            starSet,
            targetSet,
            selected,
            danger,
            threatened,
          )}
          onPress={() => onTapSquare(sq)}
          style={{
            position: 'absolute',
            width: cell,
            height: cell,
            left: xOf(sq, cell),
            top: yOf(sq, cell),
          }}
        />
      ))}
    </View>
  );
}

/**
 * The glow under a piece that can be taken where it stands.
 *
 * A gradient rather than a shape: an outline of any kind reads as a marked
 * *square*, which is what the danger wash already means, and the two then fight.
 * A soft pool of red has no edge to mistake for one, and because it sits under
 * the artwork the piece itself is what she ends up looking at.
 *
 * Drawn in SVG because React Native cannot blur a view, and a coloured
 * `elevation` is not portable — this is also why it is not one of the theme's
 * two elevations. It is a highlight, not a third layer of depth.
 *
 * `id` must be unique per square: gradient ids are resolved per SVG root, and
 * react-native-svg has historically leaked them between roots on Android.
 */
function ThreatGlow({ cell, id }: { cell: number; id: string }) {
  const r = cell / 2;
  return (
    <Svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          {/* Held near full strength through the middle, then dropped away
              fast: a linear fade from the centre looks like fog rather than
              like something glowing. */}
          <Stop offset="0%" stopColor={colors.dangerInk} stopOpacity={0.62} />
          <Stop offset="45%" stopColor={colors.dangerInk} stopOpacity={0.5} />
          <Stop offset="75%" stopColor={colors.dangerInk} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={colors.dangerInk} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * A legal destination, fading in staggered by how far it is from the piece so
 * the options fan outward rather than all snapping on together.
 */
function MoveHint({
  square,
  cell,
  from,
  isCapture,
}: {
  square: Square;
  cell: number;
  from: Square | null;
  isCapture: boolean;
}) {
  const distance =
    from === null
      ? 0
      : Math.max(
          Math.abs(fileOf(square) - fileOf(from)),
          Math.abs(rankOf(square) - rankOf(from)),
        );

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(distance * 26, withTiming(1, { duration: 130 }));
  }, [distance, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      {...DECORATIVE}
      style={[
        styles.centred,
        { width: cell, height: cell, left: xOf(square, cell), top: yOf(square, cell) },
        style,
      ]}
    >
      {isCapture ? (
        <View
          style={{
            width: cell * 0.88,
            height: cell * 0.88,
            borderRadius: cell * 0.44,
            borderWidth: cell * 0.09,
            borderColor: colors.moveRing,
          }}
        />
      ) : (
        <View
          style={{
            width: cell * 0.3,
            height: cell * 0.3,
            borderRadius: cell * 0.15,
            backgroundColor: colors.moveDot,
          }}
        />
      )}
    </Animated.View>
  );
}

/** How long a collected star takes to pop and fade. */
const COLLECT_MS = 340;

/**
 * Squares whose star disappeared since the last render, so they can be
 * animated out after the fact. The board only receives the stars that remain,
 * so without this a collected star would simply blink out of existence.
 */
function useVanishingStars(stars: readonly Square[]): Square[] {
  const previous = useRef<readonly Square[]>(stars);
  const [vanishing, setVanishing] = useState<Square[]>([]);

  useEffect(() => {
    const current = new Set(stars);
    const gone = previous.current.filter((sq) => !current.has(sq));
    previous.current = stars;
    if (gone.length === 0) return;

    setVanishing((v) => [...v, ...gone]);
    const timer = setTimeout(
      () => setVanishing((v) => v.filter((sq) => !gone.includes(sq))),
      COLLECT_MS,
    );
    return () => clearTimeout(timer);
  }, [stars]);

  return vanishing;
}

function CollectedStar({ square, cell }: { square: Square; cell: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: COLLECT_MS, easing: Easing.out(Easing.quad) });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 + progress.value * 1.1 }, { translateY: -progress.value * cell * 0.5 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      {...DECORATIVE}
      style={[
        styles.centred,
        { width: cell, height: cell, left: xOf(square, cell), top: yOf(square, cell) },
        style,
      ]}
    >
      <Star size={cell * 0.62} />
    </Animated.View>
  );
}

/**
 * The square she was taken on, pulsing. Runs while the enemy is on its way in,
 * so the eye is already on the right square when the capture lands.
 */
function DoomedSquare() {
  const pulse = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Held at full strength instead of breathing. The square still has to say
    // *here* — in tier 3 it is the only thing that does — so what goes is the
    // repetition, not the mark.
    if (reduced) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 420 }), -1, true);
  }, [pulse, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.55 }));

  return <Animated.View style={[styles.fill, { backgroundColor: colors.dangerStrong }, style]} />;
}

/** How long the answer to a tap that did nothing takes to fade. */
const NUDGE_MS = 260;

/**
 * The board's reply to a tap that changed nothing — an empty square with no
 * piece picked up, which the rules quite correctly ignore.
 *
 * Silence is the worst possible answer for someone who presses constantly and
 * cannot read: it is indistinguishable from a broken screen. A ring that
 * blooms and goes says "I heard that, and it was nothing" without claiming a
 * move happened.
 *
 * Deliberately visual only. The haptics already mean "that worked" — a buzz
 * here would say the opposite of the truth.
 */
function TapNudge({ square, cell }: { square: Square; cell: number }) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = withTiming(1, { duration: NUDGE_MS, easing: Easing.out(Easing.quad) });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - progress.value),
    // Reduced motion keeps the fade and drops the bloom: the fade is what
    // carries the answer, the scale was only ever the flourish.
    transform: [{ scale: reduced ? 1 : 0.55 + progress.value * 0.45 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      {...DECORATIVE}
      style={[
        styles.centred,
        { width: cell, height: cell, left: xOf(square, cell), top: yOf(square, cell) },
        style,
      ]}
    >
      <View
        style={{
          width: cell * 0.8,
          height: cell * 0.8,
          borderRadius: cell * 0.4,
          borderWidth: cell * 0.06,
          borderColor: colors.walnut,
        }}
      />
    </Animated.View>
  );
}

/** How long a captured piece takes to shrink away. */
const CAPTURE_MS = 300;

interface Placed {
  readonly piece: Piece;
  readonly square: Square;
}

/**
 * Pieces that were on the board last render and are gone now.
 *
 * Piece ids are stable for a whole level, so a missing id means captured. The
 * board only ever holds what survives, so without this a taken piece simply
 * blinks out — and in tiers 2 and 3 that capture *is* the lesson.
 */
function useCapturedPieces(board: BoardModel): Placed[] {
  const previous = useRef<Placed[]>([]);
  const [captured, setCaptured] = useState<Placed[]>([]);

  useEffect(() => {
    const current = findPieces(board).map((square) => ({ piece: board[square]!, square }));
    const live = new Set(current.map((p) => p.piece.id));
    const gone = previous.current.filter((p) => !live.has(p.piece.id));
    previous.current = current;
    if (gone.length === 0) return;

    setCaptured((c) => [...c, ...gone]);
    const goneIds = new Set(gone.map((p) => p.piece.id));
    const timer = setTimeout(
      () => setCaptured((c) => c.filter((p) => !goneIds.has(p.piece.id))),
      CAPTURE_MS,
    );
    return () => clearTimeout(timer);
  }, [board]);

  return captured;
}

function CapturedPiece({ piece, square, cell }: { piece: Piece; square: Square; cell: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: CAPTURE_MS, easing: Easing.in(Easing.quad) });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 - progress.value * 0.6 }],
  }));

  const Art = pieceArt(piece.color, piece.type);

  return (
    <Animated.View
      pointerEvents="none"
      {...DECORATIVE}
      style={[
        styles.centred,
        { width: cell, height: cell, left: xOf(square, cell), top: yOf(square, cell) },
        style,
      ]}
    >
      {/* Fills the square. The Cburnett artwork already carries its own
          margin — its ink covers about 60% of the 45-unit box — so scaling it
          down again would leave the pieces looking undersized. */}
      <Art width={cell} height={cell} />
    </Animated.View>
  );
}

function PieceView({ piece, square, cell }: { piece: Piece; square: Square; cell: number }) {
  const x = useSharedValue(xOf(square, cell));
  const y = useSharedValue(yOf(square, cell));

  useEffect(() => {
    // Springs to the new square so the piece visibly travels its line. The
    // path is the lesson, so this must never be a teleport.
    x.value = withSpring(xOf(square, cell), pieceSpring);
    y.value = withSpring(yOf(square, cell), pieceSpring);
  }, [square, cell, x, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  const Art = pieceArt(piece.color, piece.type);

  return (
    <Animated.View
      pointerEvents="none"
      {...DECORATIVE}
      style={[{ position: 'absolute', width: cell, height: cell }, styles.centre, style]}
    >
      {/* Fills the square. The Cburnett artwork already carries its own
          margin — its ink covers about 60% of the 45-unit box — so scaling it
          down again would leave the pieces looking undersized. */}
      <Art width={cell} height={cell} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
    overflow: 'hidden',
    // Nests inside BoardFrame's radius: the frame is (padding + 6), so the
    // playing area rounds by 6 and the two curves stay concentric.
    borderRadius: 6,
  },
  cell: {
    position: 'absolute',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centred: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
