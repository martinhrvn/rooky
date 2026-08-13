/**
 * Every user-facing string, in one place.
 *
 * Keeps localisation cheap later, and makes it easy to audit the tone in one
 * sitting. Copy rule: name things by what the player does, use plain verbs,
 * and never let a word be the only thing carrying a meaning.
 */

export const strings = {
  appName: 'Rooky',

  home: {
    /** Nothing finished yet. */
    start: 'Start',
    /** Mid-way through. */
    continue: 'Continue',
    /** Everything finished. */
    replay: 'Play again',
    chooseAPiece: 'Choose a piece',
    settings: 'Settings',
  },

  pieces: {
    title: 'Pieces',
    subtitle: 'Pick one to start it from the beginning',
    locked: 'Locked',
    complete: 'Finished',
  },

  /** Tier names, shown beside each rank strip. */
  tiers: {
    1: 'Stars',
    2: 'Watch out',
    3: 'On your own',
  },

  play: {
    back: 'Back',
    retry: 'Try again',
    hint: 'Show a hint',
    next: 'Next level',
  },
} as const;
