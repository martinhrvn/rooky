/**
 * Visual constants.
 *
 * The board is the app, so the palette stays warm and quiet and lets the
 * pieces, stars and one green action colour carry everything.
 */

export const colors = {
  background: '#FBF5EA',

  // Square colours are not a styling choice — they are what a real board looks
  // like, and what the Cburnett pieces were drawn against.
  lightSquare: '#F0D9B5',
  darkSquare: '#B58863',

  /**
   * Tournament green: the green/buff of a real vinyl tournament board. Used
   * for actions and progress, which keeps gold meaning exactly one thing.
   */
  green: '#3E7C59',
  greenLight: '#58A97B',
  greenSoft: 'rgba(62, 124, 89, 0.12)',

  /** Square the selected piece is standing on. */
  selected: '#F5CF5B',
  /** Where the last move came from and went to. */
  lastMove: '#F7E2A0',

  /** Legal destinations, drawn as a dot in the middle of the square. */
  moveDot: 'rgba(20, 60, 40, 0.28)',
  /** Legal destinations that hold something worth taking, drawn as a ring. */
  moveRing: 'rgba(20, 60, 40, 0.35)',

  /** Rewards only — never an action, or the reward stops reading as one. */
  star: '#FFC53D',
  starEdge: '#E0961A',

  /** Tier 2's "they can take you here" tint. */
  danger: 'rgba(216, 42, 42, 0.34)',
  /** The square she was actually taken on — shown at every tier. */
  dangerStrong: 'rgba(216, 42, 42, 0.72)',

  text: '#3B3027',
  textSoft: '#8A7B6B',
  surface: '#FFFFFF',
  border: 'rgba(59, 48, 39, 0.12)',
  shadow: '#2A211A',
} as const;

export const layout = {
  /** Minimum comfortable tap target for small hands. */
  touchTarget: 64,
  boardPadding: 12,
  screenPadding: 20,
  radius: 18,
  gap: 12,
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
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16, letterSpacing: 0.4 },
  button: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
} as const;

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
