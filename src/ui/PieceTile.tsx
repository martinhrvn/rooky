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
  piece,
  size,
  dark = false,
  ringed = false,
  dimmed = false,
}: {
  piece: PieceType;
  size: number;
  /** Draw on a dark square instead of a light one. */
  dark?: boolean;
  /** Green ring, marking this as the thing to tap. */
  ringed?: boolean;
  dimmed?: boolean;
}) {
  const Art = pieceArt('w', piece);

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
      <Art width={size * 0.74} height={size * 0.74} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.4,
  },
});
