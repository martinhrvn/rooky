/**
 * Visual constants.
 *
 * The board is the app. Everything around it — the chrome — is a dark plum
 * ground that exists to get out of the board's way: a warm wooden board on a
 * dark surface reads as a lit object on a table, which is the whole idea. The
 * pieces, the stars and the action colours are the only bright things, and
 * that is deliberate.
 *
 * **The board itself is never restyled from here.** Square colours, the frame
 * and every danger wash are what a real board looks like and what the Cburnett
 * artwork was drawn against. They are listed below as constants, not choices.
 */

import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  /** Deep plum. Warm enough not to feel cold, dark enough to rest the eyes. */
  background: '#221A26',
  /** Cards, one step up. On dark, elevation is lightness, not shadow. */
  surface: '#2E2433',
  /** Inputs, insets, and anything sunk into a card. */
  surfaceRaised: '#3A2E40',

  // ---------------------------------------------------------------------
  // The board. Not styling — these are what a real board looks like.
  // ---------------------------------------------------------------------

  lightSquare: '#F0D9B5',
  darkSquare: '#B58863',

  /** Square the selected piece is standing on. */
  selected: '#F5CF5B',
  /** Where the last move came from and went to. */
  lastMove: '#F7E2A0',

  /** Legal destinations, drawn as a dot in the middle of the square. */
  moveDot: 'rgba(20, 60, 40, 0.28)',
  /** Legal destinations that hold something worth taking, drawn as a ring. */
  moveRing: 'rgba(20, 60, 40, 0.35)',

  /** Tier 2's "they can take you here" tint. */
  danger: 'rgba(216, 42, 42, 0.34)',
  /** The square she was actually taken on — shown at every tier. */
  dangerStrong: 'rgba(216, 42, 42, 0.72)',
  /** The same red with no alpha of its own, for places that supply their own. */
  dangerInk: '#D82A2A',

  /** Deep wood. The board's surround, and the ring on a tap that did nothing. */
  walnut: '#6B4E35',
  /** The board's surround. */
  frame: '#8A6244',
  frameEdge: '#5C4530',

  // ---------------------------------------------------------------------
  // Ink
  // ---------------------------------------------------------------------

  /** Cream. 14.5:1 on the ground, 12.7:1 on a card. */
  text: '#F2EDE4',
  /** Secondary ink, still clearing AA on all three grounds (7.3 / 6.4 / 5.5). */
  textSoft: '#B3A99B',
  /**
   * The label on a coloured button, and the tick on a finished square.
   *
   * Dark, not cream: cream fails on every accent in the palette (2.5–2.9),
   * while this clears AA on all of them. Bright fills carry dark type — that
   * is the whole reason the accents are allowed to stay bright.
   */
  inkOnAccent: '#1B1420',

  // ---------------------------------------------------------------------
  // Accents. Muted jewels, never acid — the board is the warmest thing here
  // and nothing on the chrome is allowed to out-shout it.
  // ---------------------------------------------------------------------

  /** Go. Still green, because green means go and she has already learned it. */
  green: '#2FA36B',
  greenPress: '#288C5B',
  greenShelf: '#1F7049',
  /** Lighter jade, for confetti and small accents. */
  greenLight: '#4CC48A',
  /** Jade at a weight that actually reads on a dark ground. */
  greenSoft: 'rgba(47, 163, 107, 0.28)',

  /** The open-ended mode. */
  periwinkle: '#5B8DEF',
  periwinklePress: '#4A78D8',
  periwinkleShelf: '#3C63B0',

  /** Back to the beginning. */
  coral: '#E8785A',
  coralPress: '#D66647',
  coralShelf: '#B14F36',

  /** Rewards only — never an action, or the reward stops reading as one. */
  star: '#FFC53D',
  starEdge: '#E0961A',
  /** The two ends of the star's gleam. Same gold, lit from the top left. */
  starHigh: '#FFE08A',
  starLow: '#E8A020',

  // ---------------------------------------------------------------------
  // Edges
  // ---------------------------------------------------------------------

  /** Hairline that makes a card read as a card on a dark ground. */
  surfaceEdge: 'rgba(242, 237, 228, 0.12)',
  /** A little stronger, for an outline standing in for a surface. */
  border: 'rgba(242, 237, 228, 0.18)',
  /**
   * The edge of a pale control.
   *
   * A card only has to look like a surface; a *control* has to have a findable
   * boundary, which WCAG puts at 3:1. The plain button's fill is the card
   * colour, so on the ground it is 1.14:1 and invisible — this outline is the
   * entire reason it is a shape. Cream at this weight clears 3:1.
   */
  actionEdge: 'rgba(242, 237, 228, 0.35)',
  /** Near-black plum. Shadows on a dark ground have to be darker than it. */
  shadow: '#0D0810',
} as const;

/**
 * One treatment per *meaning*, used everywhere without exception.
 *
 * A glyph is a small detail inside a shape, not the shape itself — so to a
 * player who cannot read, two same-coloured pills are the same button however
 * different their icons. Filled-versus-outlined does not fix that either; that
 * signals importance, not identity. Colour does.
 *
 * Every kind carries a `shelf`: the darker block the button face sits on and
 * sinks onto when pressed. It is the one thing in the app that says "press me"
 * without a word or a character drawn to say it.
 */
export const actions = {
  /** Onward: play, next level, next difficulty, another one. */
  go: {
    fill: colors.green,
    press: colors.greenPress,
    shelf: colors.greenShelf,
    ink: colors.inkOnAccent,
    edge: 'transparent',
  },
  /** The open-ended mode: endless, keep playing. */
  free: {
    fill: colors.periwinkle,
    press: colors.periwinklePress,
    shelf: colors.periwinkleShelf,
    ink: colors.inkOnAccent,
    edge: 'transparent',
  },
  /** Back to the beginning: start over, retry. */
  again: {
    fill: colors.coral,
    press: colors.coralPress,
    shelf: colors.coralShelf,
    ink: colors.inkOnAccent,
    edge: 'transparent',
  },
  /** Everything else: hint, back, settings. */
  plain: {
    fill: colors.surface,
    press: colors.surfaceRaised,
    shelf: '#150F19',
    ink: colors.text,
    edge: colors.actionEdge,
  },
} as const;

export type ActionKind = keyof typeof actions;

export const layout = {
  /** Minimum comfortable tap target for small hands. */
  touchTarget: 64,
  /**
   * How far a button stands off its shelf, and so how far it travels when
   * pressed. Small enough to read as a press rather than a jump.
   */
  shelf: 5,
  boardPadding: 12,
  screenPadding: 20,
  radius: 16,
  gap: 12,
  /**
   * Widest a column of cards is allowed to get.
   *
   * The app supports tablets, and every non-board screen is a stack of cards
   * with an icon at one end. Left to fill an iPad each one becomes a thin band
   * with its contents pushed to opposite edges — so they stop growing at about
   * a large phone's width and centre instead. The board is unaffected: it is
   * already capped by its own `height * 0.68`.
   */
  contentWidth: 560,
} as const;

export const fonts = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
} as const;

/**
 * The whole type scale. Screens go through `src/ui/Text.tsx` rather than
 * reaching for a raw <Text> with an ad-hoc fontSize.
 */
export const type = {
  display: { fontFamily: fonts.semibold, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16, letterSpacing: 0.6 },
  button: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
} as const;

/**
 * Two elevations, and nothing else.
 *
 * On a dark ground a shadow does most of its work by darkening something
 * already dark, so the real separation comes from the surface steps
 * (`background` → `surface` → `surfaceRaised`) and the hairline on top. What
 * is left here is the soft ambient darkness under a raised thing, which still
 * helps on Android where `elevation` is the only tool available.
 *
 * Controls do not use this at all — they sit on a shelf. See `actions`.
 */
export const elevation = (level: 'raised' | 'lifted'): ViewStyle => {
  const spec =
    level === 'raised'
      ? { height: 3, radius: 8, opacity: 0.3, android: 3 }
      : { height: 8, radius: 18, opacity: 0.42, android: 8 };

  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: spec.height },
      shadowRadius: spec.radius,
      shadowOpacity: spec.opacity,
    },
    android: { elevation: spec.android },
    default: {},
  })!;
};

/** Spring used for piece travel — quick, with just enough overshoot to feel alive. */
export const pieceSpring = {
  damping: 17,
  stiffness: 190,
  mass: 0.7,
} as const;

/** Bouncier spring for reward moments. */
export const rewardSpring = {
  damping: 11,
  stiffness: 160,
  mass: 0.8,
} as const;
