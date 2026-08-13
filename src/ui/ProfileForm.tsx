import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AVATARS, type AvatarId, avatarById } from '../progress/schema';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { strings } from './strings';
import { colors, layout, type as typeScale } from './theme';

/**
 * Choose a face, and optionally a name.
 *
 * Used both on first run and when adding a second player, so the two are the
 * same thing and cannot drift apart.
 *
 * The name **defaults to the avatar's own name** — pick the fox and you are
 * "Fox" until a parent types otherwise. Better than "Player 1": it matches
 * what she sees, and nothing blocks on a keyboard she cannot use.
 */
export function ProfileForm({
  onCreate,
  submitLabel = strings.profiles.create,
}: {
  onCreate: (name: string, avatarId: AvatarId) => void;
  submitLabel?: string;
}) {
  const [avatarId, setAvatarId] = useState<AvatarId>(AVATARS[0].id);
  const [name, setName] = useState('');

  return (
    <View style={styles.form}>
      <View style={styles.grid}>
        {AVATARS.map((avatar) => (
          <Pressable
            key={avatar.id}
            accessibilityRole="radio"
            accessibilityLabel={avatar.name}
            accessibilityState={{ selected: avatar.id === avatarId }}
            onPress={() => setAvatarId(avatar.id)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Avatar id={avatar.id} size={layout.touchTarget} selected={avatar.id === avatarId} />
          </Pressable>
        ))}
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={strings.profiles.namePlaceholder}
        placeholderTextColor={colors.textSoft}
        style={styles.input}
      />

      <Button
        icon="play"
        label={submitLabel}
        kind="go"
        onPress={() => onCreate(name.trim() || avatarById(avatarId).name, avatarId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  input: {
    ...typeScale.body,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
});
