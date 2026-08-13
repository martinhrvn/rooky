/**
 * Visual constants.
 *
 * The board is the app, so the palette stays warm and quiet and lets the
 * pieces, the stars and the action colours carry everything.
 */

import { Platform, type ViewStyle } from 'react-native';

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

  /** Deep wood. The board's surround and the ink on pale buttons. */
  walnut: '#6B4E35',
  walnutPress: '#553D29',

  /** The board's surround. */
  frame: '#8A6244',
  frameEdge: '#5C4530',

  /**
   * Button pastels. Muted and close in lightness so three colours read as a
   * set rather than as a scatter — the point is that each action is *its own
   * colour*, not that the screen is colourful.
   */
  sky: '#8FB3D9',
  skyPress: '#7BA0CA',
  apricot: '#F4C39D',
  apricotPress: '#E9B187',

  text: '#3B3027',
  textSoft: '#8A7B6B',
  /** Warm off-white. Pure white on this cream page reads as a hole, not a card. */
  surface: '#FFFDF8',
  border: 'rgba(59, 48, 39, 0.12)',
  /** Hairline that defines a surface without drawing attention to itself. */
  surfaceEdge: 'rgba(59, 48, 39, 0.08)',
  /** Warm, not grey — a neutral shadow on a cream page looks like dirt. */
  shadow: '#2A211A',
} as const;

/**
 * One treatment per *meaning*, used everywhere without exception.
 *
 * A glyph is a small detail inside a shape, not the shape itself — so to a
 * player who cannot read, two same-coloured pills are the same button however
 * different their icons. Filled-versus-outlined does not fix that either; that
 * signals importance, not identity. Colour does.
 *
 * Only `go` is a strong colour. It is the one button she has to be able to
 * find, so it keeps the weight; the others are pastels of similar lightness,
 * which distinguishes them from each other without any of them shouting.
 */
export const actions = {
  /** Onward: play, next level, next difficulty, another one. */
  go: { fill: colors.green, press: '#33684A', ink: colors.surface, edge: 'transparent' },
  /** The open-ended mode: endless, keep playing. */
  free: {
    fill: colors.sky,
    press: colors.skyPress,
    ink: colors.text,
    edge: 'rgba(59, 48, 39, 0.16)',
  },
  /** Back to the beginning: start over, retry. */
  again: {
    fill: colors.apricot,
    press: colors.apricotPress,
    ink: colors.text,
    edge: 'rgba(59, 48, 39, 0.16)',
  },
  /** Everything else: hint, back, settings. */
  plain: { fill: colors.surface, press: '#F4EEE3', ink: colors.text, edge: colors.surfaceEdge },
} as const;

export type ActionKind = keyof typeof actions;

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
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16, letterSpacing: 0.6 },
  button: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
} as const;

/**
 * Two elevations, and nothing else.
 *
 * Depth is what the app was missing: flat surfaces with no shadow read as
 * unstyled rather than as designed. Restricting it to two levels keeps that
 * from turning into decoration.
 *
 * iOS draws from the shadow* props; Android needs `elevation` and a solid
 * background on the same view.
 */
export const elevation = (level: 'raised' | 'lifted'): ViewStyle => {
  const spec =
    level === 'raised'
      ? { height: 2, radius: 6, opacity: 0.07, android: 2 }
      : { height: 5, radius: 14, opacity: 0.11, android: 6 };

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
