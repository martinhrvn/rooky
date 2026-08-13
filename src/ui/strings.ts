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
    /** The same control on a world that is not about a piece. */
    changeWorld: 'Change what you play',
    settings: 'Settings',
  },

  /**
   * The second home card: a shuffle of everything she has already beaten.
   * Named for what it contains, not for how long it lasts — "Endless" is
   * already taken by the per-piece mode and the two must not blur.
   */
  mix: {
    title: 'Mix',
    subtitle: 'Anything you have finished',
    play: 'Play a mix',
    another: 'Another one',
  },

  profiles: {
    title: 'Who is playing?',
    switcher: 'Players',
    add: 'Add a player',
    create: 'Start playing',
    namePlaceholder: 'Name (optional)',
    /** Parent-facing, on the settings screen. */
    remove: 'Remove this player',
    removeHelp: 'Deletes this player and everything they have finished.',
    removeConfirm: 'Remove this player and all their progress? This cannot be undone.',
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
    /**
     * The same button leading into a world that is not about a piece. "Next
     * piece" would be a lie there — Under Attack is not a piece to learn — and
     * the row of pieces on the button says as much on its own.
     */
    nextWorld: 'Next challenge',
    endless: 'Keep playing',
    reset: 'Start over',
  },

  /** Tier names, shown beside each rank strip. */
  tiers: {
    1: 'Stars',
    2: 'Watch out',
    3: 'On your own',
  },

  /**
   * Parent-facing, so plain words are fine here — this is the one part of the
   * app an adult reads.
   */
  settings: {
    title: 'Settings',
    difficulty: 'Difficulty',
    difficultyHelp: 'How far the levels go. Lowering this hides the harder ones without losing anything already earned.',
    player: 'Player',
    playerHelp:
      'Pick a face for this player. The name is shown only to you, so you can tell profiles apart.',
    namePlaceholder: 'Name',
    startOver: 'Start over',
    startOverHelp: 'Clears every level for this player. Cannot be undone.',
    startOverConfirm: 'Clear all progress for this player? This cannot be undone.',
    confirm: 'Clear it',
    cancel: 'Cancel',
    credits: 'Credits',
    creditsBody:
      'Chess pieces are the Cburnett set by Colin M.L. Burnett, used under CC BY-SA 3.0. Type is Fredoka, used under the SIL Open Font License 1.1.',
    version: 'Version',
  },

  dev: {
    title: 'Developer',
    warning: 'These change saved progress directly. There is no undo.',
    resetProfile: 'Reset this player',
    completeAll: 'Finish everything',
    completeThrough: 'Finish up to a piece',
    state: 'Stored state',
    done: 'Done',
  },

  play: {
    back: 'Back',
    retry: 'Try again',
    /** Shows what the enemy covers for a moment, not what to play. */
    hint: 'Show me the danger',
    /**
     * The goal badge, read aloud rather than shown. She cannot read these, and
     * the badge does not depend on them — they are for a screen reader and for
     * an adult working out what a level is asking.
     */
    goals: {
      collectAllStars: 'Collect all the stars',
      captureAll: 'Take all their pieces',
      collectAndCapture: 'Collect the stars and take their pieces',
      protect: 'Get your piece out of danger',
      escapeCheck: 'Get your king out of check',
      check: 'Put their king in check',
      mateInOne: 'Checkmate in one move',
    },
    next: 'Next level',
    another: 'Another one',
  },
} as const;
