import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { colors, layout } from './theme';

export type IconName = 'back' | 'retry' | 'hint' | 'next';

/**
 * The complete set of controls on the play screen. Four icons, always in the
 * same place, so meaning comes from position and shape rather than words.
 */
function Glyph({ name, size }: { name: IconName; size: number }) {
  const stroke = colors.text;
  const common = {
    stroke,
    strokeWidth: 7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {name === 'back' && <Path d="M60 20 L30 50 L60 80" {...common} />}
      {name === 'retry' && (
        <>
          {/* Circular arrow: the shape itself suggests "go round again". */}
          <Path d="M78 50 A28 28 0 1 1 50 22" {...common} />
          <Polygon points="50,8 50,36 34,22" fill={stroke} />
        </>
      )}
      {name === 'hint' && (
        <>
          <Path d="M50 18 A22 22 0 0 1 62 58 L62 68 L38 68 L38 58 A22 22 0 0 1 50 18 Z" {...common} />
          <Path d="M42 80 L58 80" {...common} />
        </>
      )}
      {name === 'next' && <Polygon points="34,22 34,78 76,50" fill={stroke} />}
    </Svg>
  );
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  prominent = false,
}: {
  name: IconName;
  onPress: () => void;
  /** For screen readers and for the adults; never rendered as visible text. */
  accessibilityLabel: string;
  prominent?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        prominent && styles.prominent,
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none">
        <Glyph name={name} size={prominent ? 46 : 34} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    // Never below the comfortable tap target for small hands.
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: layout.touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  prominent: {
    width: layout.touchTarget * 1.4,
    height: layout.touchTarget * 1.4,
    borderRadius: layout.touchTarget * 0.7,
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
});
