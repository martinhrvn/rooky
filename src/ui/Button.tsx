import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Glyph, type IconName } from './IconButton';
import { Text } from './Text';
import { colors, layout } from './theme';

type Variant = 'primary' | 'secondary';

/**
 * An icon with a word beside it.
 *
 * The icon carries the meaning on its own — she can't read the label — and the
 * label is there for the adult, and for her to grow into. Neither depends on
 * the other.
 */
export function Button({
  icon,
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const primary = variant === 'primary';
  const tint = primary ? colors.surface : colors.green;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.inner}>
        <Glyph name={icon} size={primary ? 30 : 24} color={tint} />
        <Text variant="button" color={tint}>
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
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primary: { backgroundColor: colors.green },
  secondary: { borderWidth: 2, borderColor: colors.green },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
