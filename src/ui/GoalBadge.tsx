import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import type { GoalKind } from '../game/types';
import { pieceArt } from './pieces';
import { Star } from './Star';
import { colors } from './theme';

/**
 * What the level wants, as one picture.
 *
 * Until the theme worlds the board explained itself: stars meant land on these,
 * black pieces meant take them, and there was nothing else it could be. That
 * stopped being true the moment capture, protect, check, escape and mate all
 * started showing the same thing — her pieces and his — while asking for
 * completely different moves. A child who has learned "take everything" will
 * try to take in a protect level and be punished for it, having read the board
 * correctly.
 *
 * So every badge is built from things she already knows rather than from new
 * symbols: real piece artwork, the same star the board uses, and one mark on
 * top in a colour that already means what the mark means. Red is danger and
 * attack. Green is safe. Gold is the reward. Nothing here has to be taught
 * except by playing.
 *
 * Deliberately not a button, and drawn without a surface or a shadow so it
 * cannot be mistaken for one — it is the only thing on the play screen that
 * says something rather than doing something.
 */
export function GoalBadge({ goal, size = 38 }: { goal: GoalKind; size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size }]}>
      {/* Three of these badges are built from *black* pieces, and the chrome is
          now dark — a black king on a plum bar is a hole, not a picture. The
          halo gives the silhouette something to stand on without becoming a
          surface: it has no edge, so it cannot be mistaken for a button, which
          is the one thing this badge must never look like. */}
      <Halo size={size * 1.5} />
      <Art goal={goal} size={size} />
    </View>
  );
}

/**
 * A soft pool of warm light. No edge anywhere in it, by design.
 *
 * Drawn larger than the badge and allowed to spill: an edge that lined up with
 * the artwork would read as a plate the piece is standing on.
 */
function Halo({ size }: { size: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.badge]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="goal-halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.lightSquare} stopOpacity={0.5} />
            <Stop offset="55%" stopColor={colors.lightSquare} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={colors.lightSquare} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={50} fill="url(#goal-halo)" />
      </Svg>
    </View>
  );
}

function Art({ goal, size }: { goal: GoalKind; size: number }) {
  switch (goal) {
    case 'collectAllStars':
      return <Star size={size * 0.86} id="goal-star" />;

    // Take them: the enemy, struck out. The cross is the one mark here that is
    // not already on the board, and it is the most universally understood
    // "this goes away" there is.
    case 'captureAll':
      return <Piece color="b" type="p" size={size} mark={<Cross size={size} />} />;

    case 'collectAndCapture':
      return (
        <View style={styles.pair}>
          <Star size={size * 0.5} id="goal-star-pair" />
          <Piece color="b" type="p" size={size * 0.62} mark={<Cross size={size * 0.62} />} />
        </View>
      );

    // Keep it safe: behind a shield rather than marked with one, because the
    // point is the piece being covered rather than the piece being singled out.
    case 'protect':
      return <Piece color="w" type="r" size={size * 0.58} behind={<Shield size={size} />} />;

    case 'escapeCheck':
      return <Piece color="w" type="k" size={size * 0.58} behind={<Shield size={size} />} />;

    // Get him: his king, ringed in the colour that means attack everywhere
    // else on the board.
    case 'check':
      return <Piece color="b" type="k" size={size * 0.72} behind={<Target size={size} />} />;

    // Finish him: the toppled king, which is what the end of a game of chess
    // has looked like for a very long time.
    case 'mateInOne':
      return <Toppled size={size} />;
  }
}

function Piece({
  color,
  type,
  size,
  mark,
  behind,
}: {
  color: 'w' | 'b';
  type: 'p' | 'r' | 'k';
  size: number;
  mark?: React.ReactNode;
  behind?: React.ReactNode;
}) {
  const PieceArt = pieceArt(color, type);
  return (
    <View style={styles.stack}>
      {behind ? <View style={styles.layer}>{behind}</View> : null}
      <PieceArt width={size} height={size} />
      {mark ? <View style={styles.layer}>{mark}</View> : null}
    </View>
  );
}

/** Everything below draws on a 100x100 canvas, matching `Star`. */
const CANVAS = '0 0 100 100';

function Cross({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox={CANVAS}>
      {[
        [24, 24, 76, 76],
        [76, 24, 24, 76],
      ].map(([x1, y1, x2, y2]) => (
        <Line
          key={`${x1}-${y1}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={colors.dangerInk}
          strokeWidth={13}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

function Shield({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox={CANVAS}>
      <Path
        d="M50 5 L92 20 V50 C92 76 73 92 50 97 C27 92 8 76 8 50 V20 Z"
        fill={colors.greenSoft}
        stroke={colors.greenLight}
        strokeWidth={7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Target({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox={CANVAS}>
      <Circle cx={50} cy={50} r={44} fill="none" stroke={colors.dangerInk} strokeWidth={8} />
    </Svg>
  );
}

function Toppled({ size }: { size: number }) {
  const KingArt = pieceArt('b', 'k');
  return (
    // Lying down, and lying *across* the badge rather than in a corner, so at
    // this size the silhouette still reads as a king rather than as a smudge.
    <View style={{ transform: [{ rotate: '72deg' }] }}>
      <KingArt width={size * 0.92} height={size * 0.92} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  stack: { alignItems: 'center', justifyContent: 'center' },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  layer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
