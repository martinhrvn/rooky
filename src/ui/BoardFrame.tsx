import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, elevation } from './theme';

/**
 * The wooden surround that turns 64 coloured squares into a board.
 *
 * A real set is an object with an edge, sitting on a table. Without this the
 * playing area just stops against the page, which is most of why the app read
 * as unfinished. The frame is a flat warm tone rather than a wood texture — a
 * photographic grain would look dated and would fight the pieces.
 *
 * The squares inside are untouched: same colours, same contrast. This only
 * surrounds them.
 */

/** Frame thickness as a share of the board edge. */
const FRAME_RATIO = 0.032;

/** Frame thickness for a board of `size` px. Callers subtract this from the
 *  space they have, so the framed board still fits. */
export const frameWidthFor = (size: number) => Math.round(Math.max(8, size * FRAME_RATIO));

export function BoardFrame({ size, children }: { size: number; children: ReactNode }) {
  const width = frameWidthFor(size);

  return (
    <View
      style={[
        styles.frame,
        {
          padding: width,
          borderRadius: width + 6,
        },
        elevation('lifted'),
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.frame,
    // A slightly darker line at the outer edge reads as a bevel without any
    // gradient work. Whole pixels: a half-pixel border puts everything inside
    // the frame on a half-pixel origin, which is enough to make pieces look
    // very slightly off centre.
    borderWidth: 2,
    borderColor: colors.frameEdge,
  },
});
