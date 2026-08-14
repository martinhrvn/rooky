import { StyleSheet, View } from 'react-native';

import type { PieceType } from '../chess/types';
import type { Mark } from '../progress/achievements';
import { Glyph, type IconName } from './IconButton';
import { Star } from './Star';
import { pieceArt } from './pieces';
import { colors } from './theme';

/**
 * Which glyph stands in for an achievement that is not about a piece.
 *
 * Reuses the app's existing shapes rather than inventing twelve new ones.
 * These are stand-ins and read as approximate — proper achievement artwork is
 * still outstanding, and is the obvious next thing once she has met a few.
 */
const MARKS: Record<Mark, IconName> = {
  move: 'forward',
  capture: 'next',
  slide: 'forward',
  promote: 'levelUp',
  check: 'levelUp',
  mate: 'levelUp',
  star: 'levelUp', // unreachable — `star` draws a Star. Here so the map is total.
  flag: 'path',
  hint: 'hint',
  shuffle: 'shuffle',
  endless: 'endless',
  // Failing, and carrying on. The circular arrow is the app's "again" shape,
  // which is exactly what these three are for.
  rescue: 'retry',
};

/**
 * An achievement's picture — the only place one is drawn.
 *
 * The toast and the collection screen both come here, so the shape she sees
 * arrive is the shape she finds afterwards. Two things that mean the same
 * achievement and look different are two achievements to a non-reader.
 *
 * Takes `{piece, mark}` rather than an `Achievement` so a whole `Family` can be
 * passed straight in — the collection groups by family and every tier of one
 * shares its picture.
 */
export function AchievementIcon({
  piece,
  mark,
  size,
  id,
  dimmed,
}: {
  piece?: PieceType;
  mark: Mark;
  size: number;
  /** Unique per rendered icon: `Star` names an SVG gradient with it. */
  id: string;
  /** Not earned yet. Drawn as a silhouette — see the note on `dimmed`. */
  dimmed?: boolean;
}) {
  const Art = piece ? pieceArt('w', piece) : null;

  return (
    // React Native cannot blur a view, so "not yours yet" is opacity, the same
    // as every other locked thing in the app (`PathNode`, `PieceTile`,
    // `TierRank`). It has to be a wrapper rather than a prop on each branch:
    // the Cburnett piece SVGs carry their own fills and cannot be flattened to
    // a single-colour shape, so the shape has to be dimmed from outside.
    <View style={dimmed && styles.dimmed}>
      {Art ? (
        <Art width={size} height={size} />
      ) : mark === 'star' ? (
        <Star size={size * 0.88} id={id} />
      ) : (
        <Glyph name={MARKS[mark] ?? 'levelUp'} size={size * 0.88} color={colors.text} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dimmed: { opacity: 0.3 },
});
