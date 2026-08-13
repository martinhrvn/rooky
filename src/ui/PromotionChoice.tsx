import { Pressable, StyleSheet, View } from 'react-native';

import type { PromotionType } from '../game/types';
import { PieceTile } from './PieceTile';
import { colors, elevation, layout } from './theme';

/**
 * What the pawn becomes, asked as four pieces rather than four words.
 *
 * The queen comes first because she is the usual answer, but the knight is
 * genuinely worth having: it reaches squares a queen cannot, so there are
 * positions where it is faster. That is a real chess idea and it is worth
 * meeting it early rather than being handed a queen automatically.
 */
const CHOICES: readonly PromotionType[] = ['q', 'n', 'r', 'b'];

export function PromotionChoice({
  size,
  onChoose,
}: {
  /** Board edge length, so the panel sits over the board. */
  size: number;
  onChoose: (type: PromotionType) => void;
}) {
  const tile = Math.min(layout.touchTarget, (size - 40) / 4 - 10);

  return (
    <View style={[styles.overlay, { width: size, height: size }]}>
      <View style={styles.panel}>
        {CHOICES.map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`Promote to ${PIECE_NAMES[type]}`}
            onPress={() => onChoose(type)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <PieceTile pieces={[type]} size={tile} ringed />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Screen-reader only — never rendered. */
const PIECE_NAMES: Record<PromotionType, string> = {
  q: 'a queen',
  n: 'a knight',
  r: 'a rook',
  b: 'a bishop',
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Dimmed here, unlike the win celebration: this one is a question and
    // needs an answer, so the board should recede until she gives one.
    backgroundColor: 'rgba(59, 48, 39, 0.35)',
    borderRadius: 6,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: layout.radius,
    backgroundColor: colors.surface,
    ...elevation('lifted'),
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.94 }] },
});
