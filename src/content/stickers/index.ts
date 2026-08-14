/**
 * The stickers, after curation.
 *
 * `CANDIDATES` is generated from OpenMoji; `STICKERS` is what she can actually
 * be offered. Everything downstream reads `STICKERS`, with one exception that
 * matters — see `stickerById`.
 */

import { CANDIDATES, type Sticker } from './catalogue';
import { EXCLUDED, EXCLUDED_SUBGROUPS } from './excluded';

export type { Sticker };

const excludedIds = new Set(EXCLUDED);
const excludedSubgroups = new Set(EXCLUDED_SUBGROUPS);

/** What can be offered, in a stable order. */
export const STICKERS: readonly Sticker[] = CANDIDATES.filter(
  (sticker) =>
    !excludedIds.has(sticker.id) &&
    !excludedSubgroups.has(`${sticker.group}/${sticker.subgroup}`),
);

// Typed as plain strings: `catalogue.ts` is `as const`, so an untyped Map here
// would key on the literal union of 867 ids and reject a lookup by `string`.
const byId = new Map<string, Sticker>(CANDIDATES.map((sticker) => [sticker.id, sticker]));

/**
 * Looks up **the full catalogue, not the curated list** — the same rule
 * `levelById` follows, and for the same reason. A sticker she has already
 * earned must keep resolving after someone decides it was boring, or curating
 * the list would blank out part of a child's album.
 *
 * Falls back rather than returning undefined, so an id from a future version
 * renders as *something* instead of a hole.
 */
export const stickerById = (id: string): Sticker => byId.get(id) ?? CANDIDATES[0];

/** The groups still represented, in catalogue order. Used to vary an offer. */
export const STICKER_GROUPS: readonly string[] = [
  ...new Set(STICKERS.map((sticker) => sticker.group)),
];
