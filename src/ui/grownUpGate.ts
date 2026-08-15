/**
 * The pure half of the grown-up gate.
 *
 * Separated from the dialog so the rules can be tested without mounting a
 * keypad — the same split as `canvasGeometry.ts`.
 */

/** How many digits an adult has to type. Three is the usual ask elsewhere. */
export const CHALLENGE_LENGTH = 3;

/**
 * The keys on the pad, and the digits a challenge is drawn from.
 *
 * One to nine, with no zero. Nine keys make a clean square, and it avoids the
 * one number this gate cannot spell unambiguously — "zero" and "oh" are the
 * same key to a reader and two different words on the screen.
 */
export const GATE_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type GateDigit = (typeof GATE_DIGITS)[number];

/**
 * A fresh challenge. Digits may repeat — that is a sequence to copy, not a
 * combination, and forbidding repeats would only shrink the pool.
 */
export function drawChallenge(random: () => number = Math.random): readonly GateDigit[] {
  return Array.from(
    { length: CHALLENGE_LENGTH },
    () => GATE_DIGITS[Math.floor(random() * GATE_DIGITS.length)],
  );
}

/** True once what has been typed is the challenge, in order and in full. */
export const matches = (typed: readonly GateDigit[], challenge: readonly GateDigit[]): boolean =>
  typed.length === challenge.length && typed.every((digit, i) => digit === challenge[i]);

/**
 * What a tap does: the digit goes on the end until the challenge is full.
 *
 * Overrunning is not possible, because a full entry is judged immediately —
 * right, and the act happens; wrong, and both the entry and the challenge are
 * replaced. `matches` is what the caller checks; this only appends.
 */
export const withDigit = (
  typed: readonly GateDigit[],
  digit: GateDigit,
): readonly GateDigit[] =>
  typed.length >= CHALLENGE_LENGTH ? typed : [...typed, digit];
