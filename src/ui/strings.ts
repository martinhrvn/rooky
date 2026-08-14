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
    /** Opens the path. Named for what she gets, not for what the screen is. */
    choose: 'Choose a level',
    changePiece: 'Change piece',
    /** The same control on a world that is not about a piece. */
    changeWorld: 'Change what you play',
    settings: 'Settings',
  },

  /**
   * The path behind "Choose a level": a ribbon per world, and a numbered
   * circle per difficulty under it.
   */
  path: {
    title: 'Levels',
    /** The button that skips the scrolling and opens whatever is next. */
    playNext: 'Play the next one',
    /** Reached by pressing the front of a world's ribbon. */
    endless: 'Play this piece forever',
    /** Read out for a circle. `1` here is which one, never how many. */
    node: (number: number, world: string) => `Level ${number}, ${world}`,
    done: 'finished',
    locked: 'locked',
  },

  /**
   * The second home card: a shuffle of everything she has already beaten.
   * Named for what it contains, not for how long it lasts — "Endless" is
   * already taken by the per-piece mode and the two must not blur.
   */
  mix: {
    title: 'Mix',
    subtitle: 'Anything you have finished, and something new',
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

  /**
   * Achievement names, keyed by the tally they watch.
   *
   * Read aloud rather than read: she cannot read them, but an adult is
   * usually nearby when something unusual happens on screen, and being told
   * "you got *Never give up*" is most of the value. The icon has to carry it
   * alone when nobody is watching.
   *
   * Warm, never a joke at her expense — especially the three that reward
   * failing. "Never give up", not "Blunderer".
   *
   * One name per tally rather than per tier: the second and third time she
   * crosses the same one it is honestly the same achievement, further along.
   */
  achievements: {
    'moved:p': 'Little steps',
    'moved:n': 'Hop, hop, hop',
    'moved:b': 'Diagonal dancer',
    'moved:r': 'Up and down',
    'moved:q': 'Queen of everywhere',
    'moved:k': 'The king walks',

    'took:p': 'Sneaky pawn',
    'took:n': 'Knight snatcher',
    'took:b': 'Bishop swoop',
    'took:r': 'Rook raider',
    'took:q': 'Queen takes all',
    'took:k': 'Brave king',

    'slid:b': 'The long diagonal',
    'slid:r': 'The long run',
    'slid:q': 'Right across the board',

    promoted: 'All grown up',
    checked: 'Check!',
    mated: 'Checkmate!',
    stars: 'Star collector',
    levels: 'Level after level',
    hints: 'Good spotting',
    mix: 'A bit of everything',
    endless: 'Round and round',

    /** The three for failing. Warm on purpose — see the note above. */
    taken: 'Back on your feet',
    stranded: 'Stuck, and carried on',
    tries: 'Never give up',
  } as Record<string, string>,

  /**
   * The rewards screen. Every label here is for the adult reading over her
   * shoulder — the stickers, the choice and the bar all carry themselves.
   */
  stickers: {
    title: 'Stickers',
    /** The moment a sticker is won. The animation carries it; this is for the adult. */
    tada: 'Ta-da!',
    /** Shown above the three she picks from. */
    choose: 'Pick one!',
    /** Nothing earned yet. */
    empty: 'Play to win stickers',
    /** Heads the list of achievements she has earned. */
    achievements: 'Things you have done',
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
    /** The pre-path selector, kept until the numbered path has proved itself. */
    oldSelector: 'Old selector',
    openOldSelector: 'Open the world-card selector',

    rewards: 'Rewards',
    /** Enough to fill the bar once, so the choice screen can be reached. */
    grantSticker: 'Earn a sticker',
    /** Every threshold at once — the state the notification is designed for. */
    grantAchievements: 'Cross every achievement',
    grantAlbum: 'Fill the album',
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
