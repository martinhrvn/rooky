import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Glyph, type IconName } from './IconButton';
import { Text } from './Text';
import { type ActionKind, actions, layout } from './theme';

/**
 * An icon and a word, coloured by what the button *means*, standing on a shelf.
 *
 * The variants are named for meaning rather than rank ("go", not "primary")
 * because the colour is doing real work here, not decoration: to a player who
 * cannot read, two same-coloured pills are the same button however different
 * their glyphs. See `actions` in theme.ts.
 *
 * **The shelf is the affordance.** The face sits a few pixels above a darker
 * block of its own colour and sinks onto it when pressed, so the control looks
 * like a physical thing before anyone reads a word of it. This is the one
 * device standing in for the character artwork the app does not have, and it
 * is why the buttons can be flat colour without looking like flat colour.
 *
 * The total height never changes — the face moves inside a fixed box — so
 * pressing a button never reflows the screen around it.
 */
export function Button({
  icon,
  iconNode,
  label,
  onPress,
  kind = 'plain',
  disabled = false,
  style,
}: {
  icon: IconName;
  /**
   * Replaces the glyph. Used to put real chess pieces on the button — she
   * cannot read the label, but a bishop appearing there says exactly what
   * happens next, and a row of pieces says the next thing is not a piece.
   */
  iconNode?: ReactNode;
  label: string;
  onPress: () => void;
  kind?: ActionKind;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const action = actions[kind];
  const prominent = kind === 'go';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.shelf, { backgroundColor: action.shelf }, disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        // The travel is padding, not an offset, and the face stays in normal
        // flow. An absolutely-positioned face has no intrinsic width, so any
        // button that is not explicitly flexed — "Start over" sitting in a row
        // beside Play — would collapse to nothing.
        <View
          pointerEvents="none"
          style={{
            paddingTop: pressed ? layout.shelf : 0,
            paddingBottom: pressed ? 0 : layout.shelf,
          }}
        >
          <View
            style={[
              styles.face,
              {
                backgroundColor: pressed ? action.press : action.fill,
                borderColor: action.edge,
              },
            ]}
          >
            {iconNode ?? <Glyph name={icon} size={prominent ? 30 : 24} color={action.ink} />}
            <Text variant="button" color={action.ink}>
              {label}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** The block underneath, showing through as the face lifts off it. */
  shelf: {
    borderRadius: (layout.touchTarget + layout.shelf) / 2,
  },
  face: {
    height: layout.touchTarget,
    borderRadius: layout.touchTarget / 2,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  disabled: { opacity: 0.4 },
});
