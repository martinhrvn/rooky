import { type Rng, randInt } from './random';

/**
 * Fisher-Yates, taking an rng rather than reaching for `Math.random`.
 *
 * Seeded like the level generator, so an ordering can be reproduced in a test
 * instead of being something that only happens on a phone.
 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A fresh shuffle that does not begin with `avoidFirst`.
 *
 * Mix cycles through everything she has beaten and then reshuffles. The seam
 * between one cycle and the next is the only place a repeat is actually
 * noticeable — the last level of one pass landing again as the first of the
 * next — so that is the only repeat worth preventing.
 *
 * With a single item there is nothing to avoid, and repeating is correct
 * rather than a failure.
 */
export function reshuffle<T>(items: readonly T[], rng: Rng, avoidFirst?: T): T[] {
  const out = shuffle(items, rng);
  if (out.length > 1 && avoidFirst !== undefined && out[0] === avoidFirst) {
    const swap = 1 + randInt(rng, out.length - 1);
    [out[0], out[swap]] = [out[swap], out[0]];
  }
  return out;
}
