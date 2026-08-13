import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AVATARS, type AvatarId, avatarById } from '../progress/schema';
import { AvatarPicker } from './AvatarPicker';
import { Button } from './Button';
import { strings } from './strings';
import { colors, type as typeScale } from './theme';

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
      <AvatarPicker value={avatarId} onChange={setAvatarId} />

      <TextInput
        value={name}
        onChangeText={setName}
        // The placeholder disappears the moment anything is typed, so it names
        // the field for a sighted parent and nobody else.
        accessibilityLabel={strings.profiles.namePlaceholder}
        placeholder={strings.profiles.namePlaceholder}
        placeholderTextColor={colors.textSoft}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
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
  input: {
    ...typeScale.body,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    // Sunk into the card, not the same dark as the page behind it — an input
    // filled with the ground colour reads as a hole in the card.
    backgroundColor: colors.surfaceRaised,
  },
});
