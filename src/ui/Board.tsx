import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Board as BoardModel } from '../chess/board';
import { findPieces } from '../chess/board';
import { type Piece, type Square, fileOf, rankOf, squareName } from '../chess/types';
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
  lastMove: Move | null;
  /** Board edge length in px. */
  size: number;
  onTapSquare: (sq: Square) => void;
}

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
  lastMove,
  size,
  onTapSquare,
}: BoardProps) {
  const cell = size / 8;
  const targetSet = new Set(targets);
  const starSet = new Set(stars);
  const collecting = useVanishingStars(stars);

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
          </View>
        );
      })}

      {/* Stars sit under the pieces, so landing on one visibly covers it. */}
      {[...starSet].map((sq) => (
        <View
          key={`star-${sq}`}
          pointerEvents="none"
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

      {/* Touch layer on top, so the whole square is tappable rather than just
          the piece inside it. Board squares can't reach the 64dp target we use
          for buttons (eight of them have to fit across the screen), so making
          the entire square live is what keeps mis-taps cheap. */}
      {Array.from({ length: 64 }, (_, sq) => (
        <Pressable
          key={`hit-${sq}`}
          accessibilityRole="button"
          accessibilityLabel={squareName(sq)}
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
      style={[{ position: 'absolute', width: cell, height: cell }, styles.centre, style]}
    >
      <Art width={cell * 0.86} height={cell * 0.86} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
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
