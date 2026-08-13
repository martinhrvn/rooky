import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TIERS } from '../src/content';
import { useActiveProfile, useMaxTier, useProgress } from '../src/progress/store';
import { Button } from '../src/ui/Button';
import { IconButton } from '../src/ui/IconButton';
import { strings } from '../src/ui/strings';
import { Text } from '../src/ui/Text';
import { colors, elevation, layout, type as typeScale } from '../src/ui/theme';

/** Taps on the version line that reveal the developer panel. */
const TAPS_TO_UNLOCK = 7;

/**
 * Parent-facing settings.
 *
 * The only screen in the app written for an adult, so it uses plain words
 * rather than icons. It is reached through the deliberately small gear on the
 * home screen, which is what keeps it out of a four-year-old's way.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const profile = useActiveProfile();
  const maxTier = useMaxTier();
  const setMaxTier = useProgress((s) => s.setMaxTier);
  const renameProfile = useProgress((s) => s.renameProfile);
  const resetProgress = useProgress((s) => s.resetProgress);
  const deleteProfile = useProgress((s) => s.deleteProfile);

  const [taps, setTaps] = useState(0);

  const confirmReset = () =>
    Alert.alert(strings.settings.startOver, strings.settings.startOverConfirm, [
      { text: strings.settings.cancel, style: 'cancel' },
      { text: strings.settings.confirm, style: 'destructive', onPress: resetProgress },
    ]);

  const onVersionTap = () => {
    const next = taps + 1;
    if (next >= TAPS_TO_UNLOCK) {
      setTaps(0);
      router.push('/dev');
      return;
    }
    setTaps(next);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="back" onPress={() => router.back()} accessibilityLabel={strings.play.back} />
        <Text variant="title">{strings.settings.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Section title={strings.settings.difficulty} help={strings.settings.difficultyHelp}>
          <View style={styles.choices}>
            {TIERS.map((tier) => (
              <Pressable
                key={tier}
                accessibilityRole="radio"
                accessibilityState={{ selected: tier === maxTier }}
                onPress={() => setMaxTier(tier)}
                style={({ pressed }) => [
                  styles.choice,
                  tier === maxTier && styles.choiceOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text variant="label" color={tier === maxTier ? colors.surface : colors.text}>
                  {strings.tiers[tier]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title={strings.settings.player} help={strings.settings.playerHelp}>
          <TextInput
            value={profile?.name ?? ''}
            onChangeText={(name) => profile && renameProfile(profile.id, name)}
            placeholder={strings.settings.namePlaceholder}
            placeholderTextColor={colors.textSoft}
            style={styles.input}
          />
        </Section>

        <Section title={strings.settings.startOver} help={strings.settings.startOverHelp}>
          <Button icon="retry" label={strings.settings.startOver} kind="again" onPress={confirmReset} />
        </Section>

        {/* Destructive, so it lives behind the gear rather than in the
            switcher a child can reach. */}
        <Section title={strings.profiles.remove} help={strings.profiles.removeHelp}>
          <Button
            icon="retry"
            label={strings.profiles.remove}
            kind="again"
            onPress={() =>
              profile &&
              Alert.alert(strings.profiles.remove, strings.profiles.removeConfirm, [
                { text: strings.settings.cancel, style: 'cancel' },
                {
                  text: strings.settings.confirm,
                  style: 'destructive',
                  onPress: () => {
                    deleteProfile(profile.id);
                    router.back();
                  },
                },
              ])
            }
          />
        </Section>

        <Section title={strings.settings.credits}>
          {/* Attribution is a licence condition of both the artwork and the
              typeface, not a courtesy — ASSETS.md commits to surfacing it on a
              parent-facing screen, and this is that screen. */}
          <Text variant="body" color={colors.textSoft}>
            {strings.settings.creditsBody}
          </Text>
        </Section>

        {/* The way in to the developer panel. Small, grey, and unreadable to
            the person who uses this app most. */}
        <Pressable onPress={onVersionTap} style={styles.version}>
          <Text variant="label" color={colors.textSoft}>
            {strings.settings.version} {Constants.expoConfig?.version ?? '—'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="title">{title}</Text>
      {help ? (
        <Text variant="body" color={colors.textSoft}>
          {help}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.boardPadding,
    paddingVertical: 8,
  },
  list: { padding: layout.screenPadding, gap: 16, paddingBottom: 40 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    padding: 18,
    gap: 10,
    ...elevation('raised'),
  },
  choices: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choice: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.green,
  },
  choiceOn: { backgroundColor: colors.green, borderColor: colors.green },
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
  version: { alignSelf: 'center', padding: 16 },
  pressed: { opacity: 0.7 },
});
