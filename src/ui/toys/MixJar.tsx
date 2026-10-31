import { StyleSheet, View } from 'react-native';

import type { PieceType } from '../../chess/types';
import { pieceArt } from '../pieces';
import { actions, colors } from '../theme';

/**
 * Where pieces lie in the jar, as fractions of its body, with a tilt each.
 *
 * Fixed rather than random so the jar does not reshuffle itself on every
 * render — a jar that rearranges itself while she looks at it is a jar that
 * looks broken. The first spots are low down, so a nearly empty jar fills from
 * the bottom the way a real one would.
 */
const SPOTS: readonly (readonly [x: number, y: number, deg: number])[] = [
  [0.08, 0.56, -22],
  [0.46, 0.58, 16],
  [0.26, 0.34, 30],
  [0.56, 0.3, -12],
  [0.04, 0.18, 10],
  [0.38, 0.06, -6],
  [0.6, 0.02, 24],
];

/**
 * Mix, as an object: a glass jar with the pieces she has played tumbled
 * inside, and a periwinkle lid because Mix has always been periwinkle.
 *
 * It fills as she learns, which is the jar's version of the row of pieces the
 * Mix button used to carry — it still says "everything you have played"
 * without a word. An empty jar is the locked state, dimmed by the shelf.
 *
 * Built from views rather than one SVG so the pieces are the real Cburnett
 * artwork at any size, clipped by the glass.
 */
export function MixJar({ pieces, width = 88 }: { pieces: readonly PieceType[]; width?: number }) {
  const body = { w: width * 0.82, h: width * 0.9 };
  const piece = width * 0.4;
  const lid = actions.free;

  return (
    <View style={{ width, alignItems: 'center' }}>
      {/* The lid stands on its own shelf block, like every periwinkle control. */}
      <View
        style={[
          styles.lid,
          {
            width: width * 0.76,
            height: width * 0.17,
            backgroundColor: lid.shelf,
            borderRadius: width * 0.06,
          },
        ]}
      >
        <View
          style={{
            height: width * 0.13,
            backgroundColor: lid.fill,
            borderRadius: width * 0.06,
          }}
        />
      </View>
      <View style={[styles.glass, { width: width * 0.62, height: width * 0.1, borderRadius: 4 }]} />
      <View
        style={[
          styles.glass,
          styles.body,
          { width: body.w, height: body.h, borderRadius: width * 0.2 },
        ]}
      >
        {pieces.slice(0, SPOTS.length).map((type, i) => {
          const [x, y, deg] = SPOTS[i];
          const Art = pieceArt('w', type);
          return (
            <View
              key={`${type}-${i}`}
              style={{
                position: 'absolute',
                left: x * body.w,
                top: y * body.h,
                transform: [{ rotate: `${deg}deg` }],
              }}
            >
              <Art width={piece} height={piece} />
            </View>
          );
        })}
        {/* The glint down one side is what makes it glass rather than a box. */}
        <View
          style={[
            styles.glint,
            { left: body.w * 0.1, top: body.h * 0.14, height: body.h * 0.62, width: width * 0.05 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lid: { justifyContent: 'flex-start', zIndex: 1 },
  glass: {
    backgroundColor: 'rgba(242, 237, 228, 0.07)',
    borderWidth: 2,
    borderColor: colors.actionEdge,
    marginTop: -2,
  },
  body: { overflow: 'hidden' },
  glint: {
    position: 'absolute',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
});
