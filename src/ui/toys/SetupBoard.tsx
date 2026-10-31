import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { pieceArt } from '../pieces';
import { colors } from '../theme';

/**
 * Board setup, as an object: a little chessboard leaning on the wall with a
 * rook standing in front of it, waiting to be put on.
 *
 * Its outline — a square tilted against the plank — is unlike the jar's
 * rounded upright one, which is the whole of how a non-reader tells the two
 * toys apart. Drawn from the board's own constants (squares, frame, walnut
 * edge), so it reads as a small copy of the thing it opens. No action colour:
 * every toy on the shelf means "play freely", and only the jar's lid is
 * periwinkle because Mix always was.
 *
 * Empty while locked would say nothing, so it stays as it is and the shelf
 * dims it, the same "not yours yet" as everywhere else.
 */
export function SetupBoard({ width = 92 }: { width?: number }) {
  const board = width * 0.82;
  const piece = width * 0.5;
  const RookArt = pieceArt('w', 'r');
  const PawnArt = pieceArt('b', 'p');

  return (
    <View style={{ width, height: width * 1.08 }}>
      <View
        style={{
          position: 'absolute',
          left: (width - board) / 2 - width * 0.04,
          top: 0,
          transform: [{ rotate: '-6deg' }],
        }}
      >
        <Svg width={board} height={board} viewBox="0 0 100 100">
          <Rect x={0} y={0} width={100} height={100} rx={5} fill={colors.frame} />
          <Rect
            x={1}
            y={1}
            width={98}
            height={98}
            rx={5}
            fill="none"
            stroke={colors.frameEdge}
            strokeWidth={2}
          />
          {Array.from({ length: 64 }, (_, i) => {
            const file = i % 8;
            const row = Math.floor(i / 8);
            return (
              <Rect
                key={i}
                x={7 + file * 10.75}
                y={7 + row * 10.75}
                width={10.75}
                height={10.75}
                fill={(file + row) % 2 === 0 ? colors.lightSquare : colors.darkSquare}
              />
            );
          })}
        </Svg>
        {/* One black pawn already standing at the far side, the way every
            stage opens with something on the board to say which end is
            whose. */}
        <View style={{ position: 'absolute', left: board * 0.52, top: board * 0.14 }}>
          <PawnArt width={board * 0.2} height={board * 0.2} />
        </View>
      </View>
      <View style={{ position: 'absolute', right: -width * 0.04, bottom: 0 }}>
        <RookArt width={piece} height={piece} />
      </View>
    </View>
  );
}
