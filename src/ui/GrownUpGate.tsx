import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  CHALLENGE_LENGTH,
  GATE_DIGITS,
  type GateDigit,
  drawChallenge,
  matches,
  withDigit,
} from './grownUpGate';
import { IconButton } from './IconButton';
import { strings } from './strings';
import { Text } from './Text';
import { colors, elevation, layout } from './theme';

/**
 * The guard in front of the two acts that destroy something.
 *
 * **The challenge is spelled out in words, and that is the entire mechanism.**
 * She knows her numbers — the whole app is built on that being true, which is
 * why pips may carry a digit beside them — so a keypad showing `157` would
 * stop nobody. Written as *one five seven* it becomes a reading test, and
 * reading is the one thing this app can rely on every adult passing and its
 * player failing. Anyone later tempted to "make it clearer" by showing the
 * digits would be removing the guard while appearing to improve it.
 *
 * It is a speed bump, not a password: no lockout, no attempt counter, and a
 * screen reader will read the challenge aloud quite happily. That last part is
 * deliberate. An adult who needs VoiceOver still has to be able to reset the
 * app, and the thing being defended against is a four-year-old holding the
 * tablet, not someone attacking it.
 *
 * `Alert.alert` used to do this job and could not: two words she cannot read
 * and a button she can hit. The warning lives on this card now, so there is one
 * dialog rather than a confirm behind a confirm — the second of which gets
 * tapped through by anyone who just typed a number to reach it.
 */
export function GrownUpGate({
  title,
  warning,
  onConfirm,
  onCancel,
}: {
  title: string;
  warning: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [challenge, setChallenge] = useState(drawChallenge);
  const [typed, setTyped] = useState<readonly GateDigit[]>([]);

  const press = (digit: GateDigit) => {
    const next = withDigit(typed, digit);

    if (next.length < CHALLENGE_LENGTH) {
      setTyped(next);
      return;
    }

    if (matches(next, challenge)) {
      onConfirm();
      return;
    }

    // Wrong, so the challenge is redrawn rather than merely cleared: guessing
    // at a number she has watched being typed gains nothing that way.
    setChallenge(drawChallenge());
    setTyped([]);
  };

  return (
    <View style={styles.host}>
      <View style={styles.card}>
        <Text variant="title" align="center">
          {title}
        </Text>

        <Text variant="body" color={colors.textSoft} align="center">
          {warning}
        </Text>

        <View style={styles.challenge}>
          <Text variant="label" color={colors.textSoft} align="center">
            {strings.settings.gate}
          </Text>
          <Text variant="display" align="center">
            {challenge.map((digit) => strings.settings.gateNumbers[digit - 1]).join(' ')}
          </Text>
        </View>

        {/* What has been typed, as pips rather than as the digits themselves:
            three slots filling in says how far along she is without the field
            becoming a second thing to read. */}
        <View style={styles.entry}>
          {Array.from({ length: CHALLENGE_LENGTH }, (_, i) => (
            <View key={i} style={[styles.slot, i < typed.length && styles.slotFilled]} />
          ))}
        </View>

        {/* Neutral tiles, not `theme.actions`. A digit is not a verb, and nine
            coral pills would read as nine "do it again" buttons. */}
        <View style={styles.pad}>
          {GATE_DIGITS.map((digit) => (
            <Pressable
              key={digit}
              accessibilityRole="button"
              accessibilityLabel={String(digit)}
              onPress={() => press(digit)}
              style={({ pressed }) => [styles.key, pressed && styles.pressed]}
            >
              <Text variant="title" align="center">
                {String(digit)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.controls}>
          <IconButton
            name="back"
            accessibilityLabel={strings.settings.gateBack}
            onPress={() => setTyped(typed.slice(0, -1))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.settings.gateClose}
            onPress={onCancel}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          >
            <Text variant="button" color={colors.textSoft}>
              {strings.settings.cancel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const KEY_SIZE = 64;

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    // Heavy, like the sticker offer's rather than the win card's: there is
    // nothing behind this worth reading while it is up.
    backgroundColor: 'rgba(13, 8, 16, 0.82)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    gap: 16,
    padding: 22,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surface,
    ...elevation('raised'),
  },
  challenge: { gap: 6 },
  entry: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  slot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surfaceRaised,
  },
  slotFilled: { backgroundColor: colors.text, borderColor: colors.text },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surfaceRaised,
    ...elevation('raised'),
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { paddingHorizontal: 14, paddingVertical: 10 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});
