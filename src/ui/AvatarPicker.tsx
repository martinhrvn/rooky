import { Pressable, StyleSheet, View } from 'react-native';

import { AVATARS, type AvatarId } from '../progress/schema';
import { Avatar } from './Avatar';
import { layout } from './theme';

/**
 * The grid of faces, one of them selected.
 *
 * Shared by the form that creates a profile and the settings screen that edits
 * one, so picking a face is the same act in both places — the alternative was
 * two grids that would eventually disagree about size, order or what "selected"
 * looks like.
 *
 * Changing a face is not destructive and is undone by tapping another one, so
 * it needs no confirmation anywhere it appears.
 */
export function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
}) {
  return (
    <View style={styles.grid}>
      {AVATARS.map((avatar) => (
        <Pressable
          key={avatar.id}
          accessibilityRole="radio"
          accessibilityLabel={avatar.name}
          accessibilityState={{ selected: avatar.id === value }}
          onPress={() => onChange(avatar.id)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Avatar id={avatar.id} size={layout.touchTarget} selected={avatar.id === value} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
});
