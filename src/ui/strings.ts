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
    /** Mid-way through, and once everything is done. */
    play: 'Play',
    /** Opens level 1 again. Never destroys progress. */
    reset: 'Start over',
    endless: 'Endless',
    changePiece: 'Change piece',
    settings: 'Settings',
  },

  pieces: {
    title: 'Pieces',
    subtitle: 'Pick one to start it from the beginning',
    locked: 'Locked',
    complete: 'Finished',
  },

  /** Shown after the last level of a difficulty. */
  tierDone: {
    title: 'Finished!',
    nextTier: 'Next difficulty',
    /** Shown once the whole piece is finished, not just one difficulty. */
    nextPiece: 'Next piece',
    endless: 'Keep playing',
    reset: 'Start over',
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
    another: 'Another one',
  },
} as const;
