import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type ChaseSide, ROUNDS, openingRound } from '../../src/game/chase';
import { useChaseWon, useProgress } from '../../src/progress/store';
import { xpForResult } from '../../src/progress/xp';
import { Button } from '../../src/ui/Button';
import { ChasePlayer, RoundGlyph } from '../../src/ui/ChasePlayer';
import { strings } from '../../src/ui/strings';
import { colors } from '../../src/ui/theme';

/**
 * One side of the chase: the round she is up to, against the computer.
 *
 * A win pays XP like a board-setup stage — the three-star rate, first time at
 * the first-clear rate and after that at the replay rate — because there is no
 * "badly" to rate: she either got a pawn across or she did not. A loss pays
 * nothing and takes nothing; she goes again.
 */
export default function ChaseScreen() {
  const { side } = useLocalSearchParams<{ side: string }>();
  if (side !== 'race' && side !== 'hunt') return <View style={styles.blank} />;
  return <Chase side={side} />;
}

function Chase({ side }: { side: ChaseSide }) {
  const router = useRouter();
  const won = useChaseWon()[side];
  const winRound = useProgress((s) => s.winChaseRound);
  const settle = useProgress((s) => s.settle);

  const [round, setRound] = useState(() => openingRound(side, won));
  /** Bumped by "play again", so the same round remounts from the start. */
  const [game, setGame] = useState(0);

  const onWin = useCallback(() => {
    // Read before `winRound` moves it on.
    const isFirstClear = round >= won;
    winRound(side, round);
    settle(xpForResult({ stars: 3, isFirstClear }));
  }, [round, settle, side, winRound, won]);

  const rounds = ROUNDS[side];
  const next = round < rounds.length - 1 ? rounds[round + 1] : null;
  const pick = (r: number) => {
    setRound(r);
    setGame((g) => g + 1);
  };

  const again = (
    <Button
      icon="retry"
      label={strings.chase.again}
      kind="again"
      onPress={() => setGame((g) => g + 1)}
    />
  );
  const back = <Button icon="back" label={strings.chase.back} onPress={() => router.back()} />;

  return (
    <ChasePlayer
      key={`${round}-${game}`}
      side={side}
      round={round}
      won={won}
      onExit={() => router.back()}
      onPickRound={pick}
      onWin={onWin}
      wonActions={
        <>
          {/* The next round's opponent on the button, so what comes next is
              said without the word. */}
          {next ? (
            <Button
              icon="next"
              iconNode={
                <RoundGlyph
                  side={side}
                  opponent={next.opponent}
                  pawns={next.pawnCount}
                  size={34}
                  id="next-round"
                  color={colors.inkOnAccent}
                />
              }
              label={strings.chase.next}
              kind="go"
              onPress={() => pick(round + 1)}
            />
          ) : null}
          {again}
          {next ? null : back}
        </>
      }
      lostActions={
        <>
          {again}
          {back}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.background },
});
