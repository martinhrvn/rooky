import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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

      {findPieces(board).map((sq) => (
        <PieceView key={board[sq]!.id} piece={board[sq]!} square={sq} cell={cell} />
      ))}

      {/* Move hints go above the pieces so a capture target still reads. */}
      {[...targetSet].map((sq) => (
        <View
          key={`target-${sq}`}
          pointerEvents="none"
          style={[
            styles.centred,
            { width: cell, height: cell, left: xOf(sq, cell), top: yOf(sq, cell) },
          ]}
        >
          {board[sq] || starSet.has(sq) ? (
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
        </View>
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
