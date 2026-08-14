import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CANVAS_BACKGROUNDS, backgroundById } from './canvasBackgrounds';
import { CANVAS_ASPECT } from './canvasGeometry';
import { strings } from './strings';
import { colors } from './theme';

/**
 * How high a swatch is. The width follows the canvas's aspect, so what she
 * presses is a miniature of what she gets — which is the whole affordance and
 * the reason this row needs no words at all.
 */
const SWATCH_H = 52;
const SWATCH_W = Math.round(SWATCH_H * CANVAS_ASPECT);

/**
 * The grounds, under the picture they change.
 *
 * **Closed, it is the one ground she is on; open, it is all seven.** That is
 * how it shuts without inventing a close button: the control and the thing it
 * shows are the same object, so there is nothing extra to find and nothing
 * extra to understand. Picking one closes it again, which means the row is
 * only ever on screen while she is actually choosing — the rest of the time
 * that space belongs to the picture.
 *
 * Selection is a cream ring **and** full size, never colour alone: every
 * swatch is already a different colour, so one more would say nothing.
 */
export function BackgroundPicker({
  selected,
  onSelect,
  width,
}: {
  readonly selected: string;
  readonly onSelect: (id: string) => void;
  /** The canvas's width, so the row never grows wider than the picture. */
  readonly width?: number;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    const { name, Scene } = backgroundById(selected);
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ expanded: false }}
        accessibilityLabel={strings.stickers.canvas.grounds(name)}
        style={styles.target}
      >
        <View style={[styles.swatch, styles.chosen]}>
          <Scene width={SWATCH_W} height={SWATCH_H} />
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={width ? { maxWidth: width } : undefined}
      contentContainerStyle={styles.row}
    >
      {CANVAS_BACKGROUNDS.map(({ id, name, Scene }) => {
        const chosen = id === selected;
        return (
          <Pressable
            key={id}
            onPress={() => {
              // Pressing the one she is already on is how she backs out
              // without changing anything, so it closes either way.
              onSelect(id);
              setOpen(false);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: chosen }}
            accessibilityLabel={strings.stickers.canvas.background(name)}
            style={styles.target}
          >
            <View
              style={[
                styles.swatch,
                chosen ? styles.chosen : styles.unchosen,
                { transform: [{ scale: chosen ? 1 : 0.9 }] },
              ]}
            >
              <Scene width={SWATCH_W} height={SWATCH_H} />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 2, alignItems: 'center' },
  // Padded out to a comfortable target without making the swatches themselves
  // large enough to compete with the picture above them.
  target: { paddingVertical: 6 },
  swatch: {
    width: SWATCH_W,
    height: SWATCH_H,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
  },
  chosen: { borderColor: colors.text },
  unchosen: { borderColor: colors.surfaceEdge },
});
