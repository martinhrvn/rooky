import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type ChaseSide, ROUNDS, SIDES, openingRound, startBoard } from '../../src/game/chase';
import { useChaseWon } from '../../src/progress/store';
import { Board } from '../../src/ui/Board';
import { BoardFrame, frameWidthFor } from '../../src/ui/BoardFrame';
import { IconButton } from '../../src/ui/IconButton';
import { strings } from '../../src/ui/strings';
import { Text } from '../../src/ui/Text';
import { colors, layout } from '../../src/ui/theme';

/** Edge of each side's little board. Two fit across a phone with room between. */
const PREVIEW = 148;

const DECORATIVE = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * The chase: pick a side.
 *
 * Each side is **its own starting position drawn small** — her eight pawns
 * under one black piece, or her queen under a row of black pawns — the way a
 * sticker ground's swatch is the scene it gives. What she presses is a picture
 * of what she gets, so no word is involved in the choice. It shows the round
 * she is up to, so the race picture changes piece as she climbs.
 *
 * Under each, a pip per round with the won ones filled: how far along that
 * ladder she is, countable without reading.
 */
export default function ChasePickScreen() {
  const router = useRouter();
  const won = useChaseWon();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton name="back" onPress={() => router.back()} accessibilityLabel={strings.play.back} />
      </View>

      <View style={styles.body}>
        <Text variant="display" align="center">
          {strings.chase.pick}
        </Text>
        <View style={styles.sides}>
          {SIDES.map((side) => (
            <SideTile
              key={side}
              side={side}
              won={won[side]}
              onPress={() => router.push(`/chase/${side}`)}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function SideTile({ side, won, onPress }: { side: ChaseSide; won: number; onPress: () => void }) {
  const rounds = ROUNDS[side];
  const board = startBoard(rounds[openingRound(side, won)]);
  const inner = PREVIEW - frameWidthFor(PREVIEW) * 2;
  const size = Math.floor(inner / 8) * 8;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${strings.chase.sides[side]}. ${strings.chase.sideHelp[side]}. ${strings.chase.progress(won, rounds.length)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View pointerEvents="none" {...DECORATIVE}>
        <BoardFrame size={size}>
          <Board
            board={board}
            stars={[]}
            selected={null}
            targets={[]}
            danger={null}
            lastMove={null}
            size={size}
            onTapSquare={() => {}}
          />
        </BoardFrame>
      </View>
      <View style={styles.pips} {...DECORATIVE}>
        {rounds.map((_, i) => (
          <View key={i} style={[styles.pip, i < won && styles.pipWon]} />
        ))}
      </View>
      <Text variant="title" align="center">
        {strings.chase.sides[side]}
      </Text>
      <Text variant="label" color={colors.textSoft} align="center">
        {strings.chase.sideHelp[side]}
      </Text>
    </Pressable>
  );
}

const PIP = 12;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.boardPadding,
    paddingVertical: 8,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 28,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentWidth,
    alignSelf: 'center',
  },
  sides: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16 },
  tile: {
    alignItems: 'center',
    gap: 10,
    padding: 14,
    width: PREVIEW + 28,
    borderRadius: layout.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  pips: { flexDirection: 'row', gap: 6 },
  // Empty is a ring, won is jade — the path's "finished".
  pip: {
    width: PIP,
    height: PIP,
    borderRadius: PIP / 2,
    borderWidth: 2,
    borderColor: colors.textSoft,
  },
  pipWon: { backgroundColor: colors.green, borderColor: colors.green },
});
