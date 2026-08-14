/**
 * The curation list. **This is the file to edit** — `catalogue.ts` is
 * generated and will be overwritten.
 *
 * The catalogue is deliberately generous: it takes whole OpenMoji groups and
 * lets us subtract, rather than making someone hand-pick six hundred stickers
 * to start with. Everything here is a judgement about what a four-year-old
 * would actually be pleased to win.
 *
 * `node scripts/build-stickers.mjs --list` prints everything still included,
 * grouped, as ready-to-paste lines.
 */

/**
 * Whole subgroups that are not worth offering. Coarse, and it does most of
 * the work — `time` alone is thirty-one clock faces.
 *
 * Seeded with the obvious ones; nothing here is precious, so delete a line to
 * get a subgroup back.
 */
export const EXCLUDED_SUBGROUPS: readonly string[] = [
  'objects/office', // staplers, paperclips, filing
  'objects/money', // banknotes, credit cards
  'objects/mail', // envelopes, postboxes
  'objects/lock', // padlocks and keys
  'objects/medical', // syringes, pills
  'objects/computer', // floppy disks, printers
  'objects/phone', // handsets, pagers
  'objects/sound', // speaker and bell states, mostly UI glyphs
  'travel-places/time', // twenty-four clock faces plus watches
  'travel-places/place-map', // world maps, compass
  'travel-places/hotel', // a bed and a bellhop bell
];

/**
 * Individual stickers to drop, by OpenMoji hexcode. Keep the emoji and the
 * name in the comment — a bare hexcode is unreadable, and this list is meant
 * to be argued with.
 *
 * Excluding one she has **already earned** is safe: `stickerById` resolves
 * against the full catalogue, so it stays in her album. It only stops being
 * offered to anyone new.
 */
export const EXCLUDED: readonly string[] = [
  // '1F4CE', // 📎 paperclip
];
