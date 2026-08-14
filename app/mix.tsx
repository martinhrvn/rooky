import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type Catalogue, soloPiece } from '../src/content';
import { generateLevelOrEasier } from '../src/game/generator';
import { makeRng } from '../src/game/random';
import { reshuffle } from '../src/game/shuffle';
import type { Level } from '../src/game/types';
import { mixPool } from '../src/progress/selectors';
import { useCompletedIds, useProgress } from '../src/progress/store';
import { Button } from '../src/ui/Button';
import { LevelPlayer } from '../src/ui/LevelPlayer';
import { strings } from '../src/ui/strings';
import { useCatalogue } from '../src/ui/useCatalogue';
import { useRewards } from '../src/ui/useRewards';
import { colors } from '../src/ui/theme';

/** How often an invented level takes the place of a replayed one. */
const INVENT_EVERY = 4;

/**
 * Mix: a shuffled run through everything she has beaten, plus the occasional
 * invented one.
 *
 * The single "play forever" mode, and deliberately the only one on the home
 * screen. Endless still exists, but it is reached from a world's ribbon on the
 * path, where it is contextual — pressing *that* world means "more of this
 * piece". Two buttons on home that both mean "keep playing" is a distinction
 * no four-year-old can be expected to draw, and the row of pieces versus one
 * piece was never going to carry it on its own.
 *
 * Real authored levels are recorded, so a better run improves her best and the
 * store keeps only the best — playing here can never cost her anything. The
 * invented ones are not recorded, because they are not in the catalogue.
 *
 * It advances manually: auto-advancing would sweep her past a two-star result
 * before she could retry it.
 */
export default function MixScreen() {
  const router = useRouter();
  const completed = useCompletedIds();
  const catalogue = useCatalogue();
  const recordResult = useProgress((s) => s.recordResult);
  const rewards = useRewards('mix');

  /**
   * A seed for this visit, drawn once.
   *
   * The shuffle used to be seeded off the pool's *size*, which made it not a
   * shuffle at all: the same levels came up in the same order every time she
   * opened Mix, and the order only ever changed when she finished another
   * level. Leaving and coming back has to deal a fresh hand — that is the
   * whole promise of the mode.
   */
  const [seed] = useState(() => Date.now());

  // Fixed at mount. The pool grows as she plays, but reshuffling underneath
  // her mid-session would be more surprising than useful.
  const [pool] = useState(() => mixPool(catalogue, completed));
  const [queue, setQueue] = useState<Level[]>(() => reshuffle(pool, makeRng(seed)));
  /** Counts levels played, and keys the board so every one is a fresh mount. */
  const [round, setRound] = useState(0);
  /**
   * A generated level standing in for the next authored one, or null.
   *
   * Held apart from the queue so an invented level never consumes one of hers
   * — she gets the extra puzzle *as well as* everything she has beaten, not
   * instead of one of them.
   */
  const [invented, setInvented] = useState<Level | null>(null);

  const level = invented ?? queue[0];

  const another = useCallback(() => {
    const next = round + 1;
    setRound(next);

    // Every fourth is invented rather than replayed. Enough that she meets one
    // most sittings; rare enough that Mix still reads as "the ones I know".
    const makeUp = next % INVENT_EVERY === 0 ? inventFor(catalogue, completed, seed + next) : null;
    setInvented(makeUp);
    if (makeUp) return;

    setQueue((current) => {
      const rest = current.slice(1);
      if (rest.length > 0) return rest;
      // The cycle ran dry. Refill, keeping the level she just played off the
      // front — the seam is the only place a repeat is actually noticeable.
      return reshuffle(pool, makeRng(seed + next), current[0]);
    });
  }, [catalogue, completed, pool, round, seed]);

  const onWin = useCallback(
    (stars: 1 | 2 | 3, moves: number) => {
      if (!level) return;

      // An invented level has no place in the catalogue, so there is nothing
      // to record against — writing its id into `results` would put a level
      // that does not exist into everything that reads completion. It still
      // pays XP, exactly as Endless does.
      if (!invented) recordResult(level.id, stars, moves);

      // Never a first clear: the authored ones she has beaten already, and the
      // invented ones are not hers to be first at.
      rewards.settleWin({ stars, isFirstClear: false });
    },
    [invented, level, recordResult, rewards],
  );

  // Reachable only if the pool were empty, which the home card prevents — but
  // a dead screen would be worse than a way out.
  if (!level) {
    return (
      <View style={styles.empty}>
        <Button icon="back" label={strings.play.back} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <LevelPlayer
      key={round}
      level={level}
      onExit={() => router.back()}
      onWin={onWin}
      onMove={rewards.onMove}
      onLost={rewards.onLost}
      onStranded={rewards.onStranded}
      onHint={rewards.onHint}
      wonActions={<Button icon="shuffle" label={strings.mix.another} kind="go" onPress={another} />}
    />
  );
}

/**
 * An invented level for a piece she already plays, or null.
 *
 * Built from one of her *own* completed levels: that fixes the piece and the
 * tier to something she has actually met, so an invented puzzle can never be
 * harder or stranger than the mode it appears in.
 *
 * Theme worlds drop out — the generator builds levels by walking a single
 * piece and cannot produce a discovered attack — and null simply means the
 * round falls back to a replayed level, which is no loss.
 */
function inventFor(
  catalogue: Catalogue,
  completed: ReadonlySet<string>,
  seed: number,
): Level | null {
  const candidates = catalogue.worlds.flatMap((world) => {
    const piece = soloPiece(world);
    if (!piece) return [];
    return world.levels
      .filter((level) => completed.has(level.id))
      .map((level) => ({ world, piece, tier: level.tier }));
  });
  if (candidates.length === 0) return null;

  const rng = makeRng(seed);
  const pick = candidates[Math.floor(rng() * candidates.length)];

  return generateLevelOrEasier({
    world: pick.world.key,
    piece: pick.piece,
    tier: pick.tier,
    // Modest: Mix is a lap through familiar things, not a difficulty ramp.
    difficulty: 1,
    rng: makeRng(seed + 1),
    index: seed,
  });
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
