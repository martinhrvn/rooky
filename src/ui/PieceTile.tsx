import { StyleSheet, View } from 'react-native';

import type { PieceType } from '../chess/types';
import { pieceArt } from './pieces';
import { colors, elevation } from './theme';

/**
 * A piece standing on a board square.
 *
 * The home screen's Continue control and every card on the selector are built
 * from this, so the app's two non-board screens are still visibly made of the
 * board she just played on.
 */
export function PieceTile({
  pieces,
  size,
  dark = false,
  ringed = false,
  dimmed = false,
}: {
  /**
   * One piece for a world about a piece, a row of them for a world about an
   * idea. The row is what tells her at a glance that Taking Pieces is not
   * another piece to learn — the same job the crowd of pieces does on the Mix
   * card, and the reason theme worlds do not need a label to be told apart.
   */
  pieces: readonly PieceType[];
  size: number;
  /** Draw on a dark square instead of a light one. */
  dark?: boolean;
  /** Green ring, marking this as the thing to tap. */
  ringed?: boolean;
  dimmed?: boolean;
}) {
  // A row has to shrink and overlap to fit one square, and both numbers are a
  // compromise: much smaller and the pieces stop being recognisable, much less
  // overlap and three of them run off the edge. These fit three at ~0.9 of the
  // tile while leaving each one's silhouette readable.
  const many = pieces.length > 1;
  const art = many ? size * 0.44 : size * 0.9;
  const overlap = many ? size * 0.2 : 0;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: dark ? colors.darkSquare : colors.lightSquare,
          // A hairline by default, so the tile reads as a square lifted off
          // the board rather than a flat swatch of colour.
          borderWidth: ringed ? Math.max(3, size * 0.045) : 1,
          borderColor: ringed ? colors.green : colors.frameEdge,
        },
        !dimmed && elevation('raised'),
        dimmed && styles.dimmed,
      ]}
    >
      {pieces.map((piece, i) => {
        const Art = pieceArt('w', piece);
        return (
          <View
            key={`${piece}-${i}`}
            style={{ marginLeft: i === 0 ? 0 : -overlap }}
          >
            <Art width={art} height={art} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // A row of pieces is wider than the square holding it; clipping keeps the
    // tile reading as a board square rather than as a spill.
    overflow: 'hidden',
  },
  dimmed: {
    opacity: 0.4,
  },
});
