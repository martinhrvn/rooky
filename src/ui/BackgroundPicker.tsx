import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CANVAS_BACKGROUNDS, backgroundById } from './canvasBackgrounds';
import { CANVAS_ASPECT } from './canvasGeometry';
import { strings } from './strings';
import { colors, elevation, layout } from './theme';

/**
 * How high a swatch is. The width follows the canvas's aspect, so what she
 * presses is a miniature of what she gets — which is the whole affordance and
 * the reason this control needs no words at all.
 */
const SWATCH_H = 44;
const SWATCH_W = Math.round(SWATCH_H * CANVAS_ASPECT);

/**
 * The grounds, floating over the corner of the picture they change.
 *
 * **Closed, it is the one ground she is on; open, it is all seven.** That is
 * how it shuts without inventing a close button: the control and the thing it
 * shows are the same object, so there is nothing extra to find and nothing
 * extra to understand. Picking one closes it again, which means the row is
 * only ever on screen while she is actually choosing.
 *
 * It floats rather than sitting under the canvas because a row of swatches in
 * the layout cost the picture its height all day for a control she touches
 * once a week. Over the corner it costs a thumbnail.
 *
 * Selection is a cream ring **and** full size, never colour alone: every
 * swatch is already a different colour, so one more would say nothing. The
 * dark surround is what makes the whole thing read as a tool laid on top of
 * the picture rather than as part of it — and what stops a cream ring
 * disappearing against the cream ground.
 */
export function BackgroundPicker({
  selected,
  onSelect,
  width,
}: {
  readonly selected: string;
  readonly onSelect: (id: string) => void;
  /** The canvas's width, so the open row never grows wider than the picture. */
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
        style={[styles.shell, styles.closed]}
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
      style={[styles.shell, width ? { maxWidth: width - 16 } : null]}
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
  // The plum tray the swatches sit on, so they read as laid over the picture.
  shell: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    ...elevation('lifted'),
  },
  closed: { padding: 6 },
  row: { gap: 6, padding: 6, alignItems: 'center' },
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

/** How far the floating control sits inside the picture's corner. */
export const PICKER_INSET = layout.gap - 4;
