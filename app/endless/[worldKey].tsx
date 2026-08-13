import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type World, worldByKey } from '../../src/content';
import { generateLevelOrEasier } from '../../src/game/generator';
import { hashString, makeRng } from '../../src/game/random';
import type { Level, Tier } from '../../src/game/types';
import { Button } from '../../src/ui/Button';
import { LevelPlayer } from '../../src/ui/LevelPlayer';
import { strings } from '../../src/ui/strings';
import { colors } from '../../src/ui/theme';

/**
 * Endless mode: randomly generated levels for one piece, forever.
 *
 * Nothing here is scored or saved. It's the pressure-free mode — the one to
 * reach for when she's stuck on a numbered level and would rather just mess
 * about with the rook than fail the same puzzle again.
 */
export default function EndlessScreen() {
  const { worldKey, tier } = useLocalSearchParams<{ worldKey: string; tier?: string }>();
  const world = worldKey ? worldByKey(worldKey) : undefined;
  const parsed = Number(tier);
  const resolved: Tier = parsed === 2 || parsed === 3 ? parsed : 1;

  if (!world) return <View style={styles.blank} />;
  return <Endless world={world} tier={resolved} />;
}

function Endless({ world, tier }: { world: World; tier: Tier }) {
  const router = useRouter();

  // `index` doubles as the difficulty ramp and as the level's identity, so a
  // new level is a genuinely new component rather than a reset of the old one.
  const [index, setIndex] = useState(0);
  const [level, setLevel] = useState<Level | null>(() => build(world, tier, 0));

  const another = useCallback(() => {
    const next = index + 1;
    setIndex(next);
    setLevel(build(world, tier, next));
  }, [index, world, tier]);

  // The generator falls back to easier levels before giving up, so this is
  // close to unreachable — but a dead screen would be worse than a way out.
  if (!level) {
    return (
      <View style={styles.empty}>
        <Button icon="back" label={strings.play.back} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <LevelPlayer
      key={level.id}
      level={level}
      onExit={() => router.back()}
      wonActions={
        <Button icon="endless" label={strings.play.another} variant="primary" onPress={another} />
      }
    />
  );
}

function build(world: World, tier: Tier, index: number): Level | null {
  return generateLevelOrEasier({
    world: world.key,
    piece: world.icon,
    tier,
    // Ramps roughly every other level, capped inside the generator.
    difficulty: index,
    // Seeded off the world, tier and index so levels differ between pieces but
    // stay reproducible from the level's id.
    rng: makeRng(hashString(`${world.key}-${tier}-${index}`)),
    index,
  });
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
