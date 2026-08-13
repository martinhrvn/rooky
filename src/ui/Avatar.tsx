import { StyleSheet, Text as RNText, View } from 'react-native';

import { avatarById } from '../progress/schema';
import { colors } from './theme';

/**
 * A player's emoji, in a circle.
 *
 * Uses a raw `Text` rather than the app's own, because this is a glyph rather
 * than language — it carries no typeface and should not inherit one.
 */
export function Avatar({
  id,
  size,
  selected = false,
}: {
  id: string;
  size: number;
  selected?: boolean;
}) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: selected ? Math.max(3, size * 0.06) : 1,
          borderColor: selected ? colors.green : colors.surfaceEdge,
        },
      ]}
    >
      <RNText style={{ fontSize: size * 0.52, lineHeight: size * 0.68 }}>
        {avatarById(id).emoji}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightSquare,
  },
});
