/**
 * Visual constants.
 *
 * The board is the app, so the palette stays warm and quiet and lets the
 * pieces and stars carry the colour. Square colours are the classic
 * cream/brown pair, which is what a real board looks like and what the
 * Cburnett pieces were drawn against.
 */

export const colors = {
  background: '#FBF5EA',

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

  star: '#FFC53D',
  starEdge: '#E0961A',

  /** Tier 2's "they can take you here" tint. */
  danger: 'rgba(216, 42, 42, 0.34)',

  text: '#3B3027',
  textSoft: '#8A7B6B',
  surface: '#FFFFFF',
  shadow: '#2A211A',
} as const;

export const layout = {
  /** Minimum comfortable tap target for small hands. */
  touchTarget: 64,
  boardPadding: 12,
  radius: 18,
} as const;

/** Spring used for piece travel — quick, with just enough overshoot to feel alive. */
export const pieceSpring = {
  damping: 17,
  stiffness: 190,
  mass: 0.7,
} as const;
