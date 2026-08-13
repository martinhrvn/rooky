import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { useProgress } from '../src/progress/store';
import { Avatar } from '../src/ui/Avatar';
import { Button } from '../src/ui/Button';
import { IconButton } from '../src/ui/IconButton';
import { ProfileForm } from '../src/ui/ProfileForm';
import { strings } from '../src/ui/strings';
import { Text } from '../src/ui/Text';
import { colors, elevation, layout } from '../src/ui/theme';

/**
 * Who is playing.
 *
 * Switching only — no deleting. Switching is non-destructive and instantly
 * reversible, so it is safe for a child to reach; removing a player is not,
 * and lives behind the gear in settings.
 */
export default function ProfilesScreen() {
  const router = useRouter();
  const profiles = useProgress((s) => s.profiles);
  const activeProfileId = useProgress((s) => s.activeProfileId);
  const selectProfile = useProgress((s) => s.selectProfile);
  const createProfile = useProgress((s) => s.createProfile);

  const [adding, setAdding] = useState(false);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton
          name="back"
          onPress={() => router.back()}
          accessibilityLabel={strings.play.back}
        />
        <Text variant="title">{strings.profiles.switcher}</Text>
      </View>

      {/* Without this the first tap while the add-a-player keyboard is up is
          eaten by dismissing it, so adding someone takes two presses on the
          same button. */}
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {profiles.map((profile) => {
          const active = profile.id === activeProfileId;
          return (
            <Pressable
              key={profile.id}
              accessibilityRole="button"
              accessibilityLabel={profile.name}
              accessibilityState={{ selected: active }}
              onPress={() => {
                selectProfile(profile.id);
                router.back();
              }}
              style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
            >
              <Avatar id={profile.avatarId} size={56} selected={active} />
              <Text variant="title" style={styles.name}>
                {profile.name}
              </Text>
              {active ? <Tick /> : null}
            </Pressable>
          );
        })}

        {adding ? (
          <View style={styles.card}>
            <ProfileForm
              submitLabel={strings.profiles.add}
              onCreate={(name, avatarId) => {
                // createProfile also makes it active, which is what you want
                // after deliberately adding someone.
                createProfile(name, avatarId);
                router.back();
              }}
            />
          </View>
        ) : (
          <Button
            icon="play"
            label={strings.profiles.add}
            kind="plain"
            onPress={() => setAdding(true)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tick() {
  return (
    <Svg width={26} height={26} viewBox="0 0 100 100">
      <Rect x={4} y={4} width={92} height={92} rx={26} fill={colors.green} />
      <Path
        d="M26 52 L44 70 L76 32"
        stroke={colors.surface}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
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
  list: {
    padding: layout.screenPadding,
    gap: 12,
    paddingBottom: 40,
    width: '100%',
    maxWidth: layout.contentWidth,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    padding: 14,
    ...elevation('raised'),
  },
  rowActive: { borderColor: colors.green },
  name: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    padding: 18,
    ...elevation('raised'),
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
