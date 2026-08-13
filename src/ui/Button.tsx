import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Glyph, type IconName } from './IconButton';
import { Text } from './Text';
import { type ActionKind, actions, colors, elevation, layout } from './theme';

/**
 * An icon and a word, coloured by what the button *means*.
 *
 * The variants are named for meaning rather than rank ("go", not "primary")
 * because the colour is doing real work here, not decoration: to a player who
 * cannot read, two same-coloured pills are the same button however different
 * their glyphs. See `actions` in theme.ts.
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
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? action.press : action.fill,
          borderColor: action.edge,
        },
        // A real button sinks when pressed rather than fading — dimming a
        // filled colour just makes it look washed out.
        elevation(prominent && !pressed ? 'lifted' : 'raised'),
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.inner}>
        {iconNode ?? <Glyph name={icon} size={prominent ? 30 : 24} color={action.ink} />}
        <Text variant="button" color={action.ink}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.touchTarget,
    paddingHorizontal: 20,
    borderRadius: layout.touchTarget / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4, borderColor: colors.surfaceEdge },
});
