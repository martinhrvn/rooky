import { StyleSheet, View } from 'react-native';

import type { PieceType } from '../chess/types';
import { Button } from './Button';
import { PieceTile } from './PieceTile';
import { strings } from './strings';
import { Text } from './Text';
import { colors, elevation } from './theme';

/** Most pieces shown in the header before it starts to crowd. */
const MAX_TILES = 6;

/**
 * The second home card: a shuffle of every level she has already beaten.
 *
 * The whole design problem here was not confusing this with Endless, and the
 * header is what solves it. The piece card is headed by *one* piece and
 * everything on it acts on that piece; this one is headed by *all* the pieces
 * she has played, and acts on all of them. That difference is legible without
 * reading either label — and the row visibly grows as she unlocks more, which
 * is a small reward of its own.
 *
 * The caller hides this entirely until there is enough to mix, so a new player
 * never meets an empty mode.
 */
export function MixCard({ pieces, onPlay }: { pieces: readonly PieceType[]; onPlay: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.tiles}>
          {pieces.slice(0, MAX_TILES).map((piece, i) => (
            // Overlapped like a hand of cards: reads as "several" at a glance
            // and stays compact however many she unlocks.
            <View key={piece} style={i > 0 && styles.overlap}>
              <PieceTile pieces={[piece]} size={34} dark={i % 2 === 1} />
            </View>
          ))}
        </View>
        <View style={styles.title}>
          <Text variant="title">{strings.mix.title}</Text>
          <Text variant="label" color={colors.textSoft}>
            {strings.mix.subtitle}
          </Text>
        </View>
      </View>

      <Button icon="shuffle" label={strings.mix.play} kind="go" onPress={onPlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Same surface, elevation and hairline as the piece card, so the two read as
  // siblings rather than as a card and an afterthought.
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    padding: 22,
    gap: 16,
    ...elevation('raised'),
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tiles: { flexDirection: 'row' },
  overlap: { marginLeft: -10 },
  title: { flex: 1, gap: 2 },
});
