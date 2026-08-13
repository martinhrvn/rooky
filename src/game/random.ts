/**
 * Small seeded PRNG (mulberry32).
 *
 * Seeded rather than `Math.random` so a generated level can be reproduced from
 * its seed — which is what makes the generator testable, and what would let us
 * reproduce a level a player got stuck on.
 */

export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a. Turns a string into a seed, so two worlds don't collide just because
 * their keys happen to be the same length.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Integer in [0, max). */
export const randInt = (rng: Rng, max: number): number => Math.floor(rng() * max);

/** Picks `count` distinct items, or fewer if the pool is too small. */
export function sample<T>(rng: Rng, pool: readonly T[], count: number): T[] {
  const remaining = [...pool];
  const picked: T[] = [];
  while (picked.length < count && remaining.length > 0) {
    picked.push(...remaining.splice(randInt(rng, remaining.length), 1));
  }
  return picked;
}
