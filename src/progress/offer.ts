/**
 * Choosing the three stickers she is offered when the bar fills.
 *
 * Pure and **deterministic**: the offer is derived from which fill it is, not
 * from `Math.random()`. Three reasons, and all three matter. The offer has to
 * survive being persisted and rehydrated unchanged; the tests must not be
 * flaky; and a child who discovers that force-quitting re-rolls the dice will
 * do it every single time.
 */

import { STICKERS, type Sticker } from '../content/stickers';

/** How many she picks from. Three is a choice; two is a coin toss. */
export const OFFER_SIZE = 3;

/**
 * A cheap integer hash. Not cryptography — it just has to scatter consecutive
 * fill numbers so offer 4 does not look like offer 3 shifted by one.
 */
function scatter(n: number): number {
  let x = (n + 1) * 2654435761;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  return Math.abs(x);
}

/**
 * Three stickers she does not own, from three different groups where possible.
 *
 * The variety is the point. Offered a fox, a rocket and a pretzel she is
 * making a real choice; offered three near-identical birds she is being asked
 * to pick a number. Falls back to filling from anywhere once the pool thins,
 * and returns fewer than three only when fewer than three are left.
 */
export function offerFor(fill: number, owned: ReadonlySet<string>): readonly string[] {
  const available = STICKERS.filter((sticker) => !owned.has(sticker.id));
  if (available.length <= OFFER_SIZE) return available.map((sticker) => sticker.id);

  const byGroup = new Map<string, Sticker[]>();
  for (const sticker of available) {
    byGroup.set(sticker.group, [...(byGroup.get(sticker.group) ?? []), sticker]);
  }

  const groups = [...byGroup.keys()];
  const picked: string[] = [];

  // One from each of three different groups, walking the group list from a
  // hashed starting point so consecutive fills do not open the same door.
  const start = scatter(fill) % groups.length;
  for (let i = 0; i < groups.length && picked.length < OFFER_SIZE; i += 1) {
    const group = byGroup.get(groups[(start + i) % groups.length])!;
    picked.push(group[scatter(fill * 31 + i) % group.length].id);
  }

  // Fewer than three groups left, or a duplicate slipped through: top up from
  // the whole pool rather than handing back a short offer.
  for (let i = 0; picked.length < OFFER_SIZE && i < available.length * 2; i += 1) {
    const candidate = available[scatter(fill * 7919 + i) % available.length].id;
    if (!picked.includes(candidate)) picked.push(candidate);
  }

  return picked;
}
