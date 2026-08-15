/**
 * Every user-facing string, in one place.
 *
 * Keeps localisation cheap later, and makes it easy to audit the tone in one
 * sitting. Copy rule: name things by what the player does, use plain verbs,
 * and never let a word be the only thing carrying a meaning.
 */

export const strings = {
  appName: 'Rooky',

  /**
   * The bottom bar. One word each, because a tab label has one line and the
   * icon is doing the real work — these are for the adult being asked "where
   * did my stickers go?".
   */
  tabs: {
    home: 'Home',
    path: 'Levels',
    things: 'Things',
    stickers: 'Stickers',
  },

  home: {
    /** Nothing finished yet. */
    start: 'Start',
    /** Mid-way through. Gone once there is nothing left unplayed. */
    play: 'Play',
    /**
     * Every level finished — a real state, not the last world she happened to
     * land in. The row of pieces above it is what says so to a non-reader.
     */
    allDone: 'All finished!',
    allDoneHelp: 'Play anything you like',
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
   * That is also why the collection groups by tally — three rows all called
   * "Hop, hop, hop" would be three achievements to anyone reading it.
   */
  achievementNames: {
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
   * What each tally actually counts, keyed the same way as the names.
   *
   * A noun phrase rather than an instruction, and deliberately without a
   * number in it: the count beside it supplies the threshold, so one line
   * serves every tier of a tally instead of one per tier.
   *
   * This is the half of the collection that only an adult can use — the
   * question it answers is "what does she have to do to get that?", which is a
   * question a four-year-old asks out loud rather than reads. Every family
   * needs one; `achievements.test.ts` fails if a new counter arrives without.
   */
  achievementTallies: {
    'moved:p': 'Steps taken with a pawn',
    'moved:n': 'Hops with the knight',
    'moved:b': 'Moves with the bishop',
    'moved:r': 'Moves with the rook',
    'moved:q': 'Moves with the queen',
    'moved:k': 'Moves with the king',

    'took:p': 'Pieces taken with a pawn',
    'took:n': 'Pieces taken with the knight',
    'took:b': 'Pieces taken with the bishop',
    'took:r': 'Pieces taken with the rook',
    'took:q': 'Pieces taken with the queen',
    'took:k': 'Pieces taken with the king',

    'slid:b': 'Long diagonals crossed',
    'slid:r': 'Long lines crossed',
    'slid:q': 'Long moves by the queen',

    promoted: 'Pawns that reached the far side',
    checked: 'Checks given to the king',
    mated: 'Checkmates',
    stars: 'Stars collected',
    levels: 'Levels finished',
    hints: 'Times you looked at the danger',
    mix: 'Rounds of Mix',
    endless: 'Rounds of a piece on its own',

    taken: 'Times a piece was taken',
    stranded: 'Times there was nowhere to go',
    /** The streak, so "in a row" is the whole of it. */
    tries: 'Tries in a row on one level',
  } as Record<string, string>,

  /**
   * The collection. Labels here are for the adult reading over her shoulder —
   * the pictures and the pips carry it on their own.
   */
  achievements: {
    title: 'Things you have done',
    /** Nothing earned yet. */
    empty: 'Play to start collecting',
    /** Heads the three she has not got yet. */
    upNext: 'Coming up',
    /** Between a tally so far and the threshold it is heading for. */
    of: 'of',
    /**
     * Stands in for a locked one's name, for a screen reader as well as on
     * screen. Never the real name — the mystery is the whole point of drawing
     * it as a silhouette, and a name read out loud spends it.
     */
    locked: 'Not yet',
  },

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
    /** Nothing earned yet — shown down the tray where the stickers would be. */
    empty: 'Play to win stickers',

    /**
     * The picture she makes.
     *
     * Every one of these is an accessibility label and none of them is drawn:
     * the tray is a column of stickers, the canvas is a picture, and a swatch
     * is the scene it will give her drawn small. Nothing on this screen needs
     * a word to be understood, which is the point of it.
     */
    canvas: {
      area: 'Your picture',
      tray: 'Your stickers. Hold one to drag it onto the picture, or tap to drop it in the middle.',
      /** The closed picker: the ground she is on, and the way to the others. */
      grounds: (name: string) => `Background: ${name}. Tap to change it.`,
      /** Names a ground in the picker. */
      background: (name: string) => `Background: ${name}`,
      /** Names a sticker already stuck on. */
      placed: (name: string) => `${name}, on your picture`,
    },
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
    replayAll: 'Replay all',
    replayAllHelp:
      'Sends this player back to the first level with everything to win again. Stars and the path start over; stickers, the picture and everything earned are kept.',
    replayAllConfirm:
      'Play it all again? The levels lock back to the beginning. Stickers, the picture and the things she has done all stay.',
    replayAllConfirmAction: 'Play it again',
    startOver: 'Start over',
    startOverHelp:
      'Clears every level, every sticker and the picture for this player. Cannot be undone.',
    startOverConfirm:
      'This clears every level, every sticker and the picture for this player. It cannot be undone.',
    confirm: 'Clear it',
    cancel: 'Cancel',
    /**
     * The grown-up gate. `challenge` is spelled out in words on purpose — see
     * the note in `GrownUpGate.tsx`. The keypad shows digits, so reading is the
     * only thing standing between a four-year-old and a wiped profile.
     */
    gate: 'Type these numbers to carry on',
    gateNumbers: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const,
    gateBack: 'Delete the last number',
    gateClose: 'Leave this alone',
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
