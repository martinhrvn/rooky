/**
 * XP: the one currency, and the arithmetic behind the bar.
 *
 * Pure, no React and no store, like `selectors.ts` — the numbers below are the
 * whole tuning surface for the reward loop, so they live in one file where
 * they can be argued about rather than scattered across the screens.
 *
 * The loop: everything she does gives XP, the bar fills, and a full bar offers
 * three stickers to choose from. Achievements feed the same bar with a one-off
 * bonus rather than paying in a second currency — see `achievements.ts`.
 */

/**
 * What one sticker costs, and **it never changes**.
 *
 * Every XP system stretches its curve; this one deliberately does not. A
 * stretching curve reads to a four-year-old as the app quietly getting
 * stingier, and there is no way to explain "you levelled up so now it takes
 * longer" to someone who cannot read the number that changed.
 *
 * Five three-star levels, exactly — slow enough that each sticker is an event,
 * fast enough to arrive inside a single sitting.
 */
export const XP_PER_STICKER = 200;

/**
 * What a level pays, by the stars she earned. **This is the whole award.**
 *
 * Stars drive it and nothing else does — no tier bonus, no par bonus. That is
 * worth protecting: three stars is always forty, so playing a level better is
 * the only thing that ever makes it worth more, and there is no arithmetic to
 * explain to someone who cannot read the numbers anyway.
 *
 * Five three-star levels fill the bar exactly, which is the rate the whole
 * design was aimed at.
 */
const STAR_XP: Record<1 | 2 | 3, number> = { 1: 20, 2: 30, 3: 40 };

/**
 * What a *replay* pays, as a share of the same table.
 *
 * Still tied to stars, so playing it better still pays better — but a quarter,
 * because paying full price for a replay would make the shortest level in the
 * game the fastest way to earn, and grinding one easy puzzle is not the
 * behaviour to reward.
 *
 * **Never zero**, whatever the rounding: she replays her favourite level
 * dozens of times, and a bar that does not move for half an hour reads as
 * broken rather than as frugal.
 */
const REPLAY_SHARE = 0.25;

/**
 * What a finished level is worth.
 *
 * Note what is *absent*: no penalty for going over par. "Over par never fails
 * a level" — it only costs stars, which this already accounts for — and it
 * must not quietly fail the bar on top of that.
 *
 * Endless goes through here too, as a replay: its levels are generated, so
 * there is nothing to be first at, and its rate should be the one that does
 * not reward grinding.
 */
export function xpForResult({
  stars,
  isFirstClear,
}: {
  readonly stars: 1 | 2 | 3;
  readonly isFirstClear: boolean;
}): number {
  const full = STAR_XP[stars];
  return isFirstClear ? full : Math.max(1, Math.round(full * REPLAY_SHARE));
}

/** How many stickers a lifetime total has paid for. */
export const stickersFor = (totalXp: number): number =>
  Math.floor(Math.max(0, totalXp) / XP_PER_STICKER);

/**
 * How full the bar is, 0–1. The bar is the only place XP is ever shown, and it
 * is shown as a proportion — there is no numeral anywhere she can see.
 */
export const barProgress = (totalXp: number): number =>
  (Math.max(0, totalXp) % XP_PER_STICKER) / XP_PER_STICKER;

/**
 * How many times an award completed the bar.
 *
 * Usually one, occasionally two — a big achievement bonus landing on top of a
 * level's XP can cross two boundaries at once, and each one owes her a sticker.
 * Returning the count rather than a boolean is what stops the second one being
 * silently swallowed.
 */
export const fillsBetween = (before: number, after: number): number =>
  stickersFor(after) - stickersFor(before);
