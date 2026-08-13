import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line, Polygon } from 'react-native-svg';

import { type Square, fileOf, rankOf } from '../chess/types';
import { colors } from './theme';

/** One enemy, and the piece of hers it is currently attacking. */
export interface Threat {
  readonly from: Square;
  readonly to: Square;
}

export interface ThreatArrowsProps {
  threats: readonly Threat[];
  /** Board edge length in px, matching `Board`'s `size`. */
  size: number;
}

/** How long the reveal takes to arrive and to leave. */
const FADE_MS = 200;

/**
 * The only thing in the app drawn *between* squares.
 *
 * Every other mark answers a question about one square. "Who is attacking this"
 * is a relationship between two, and a relationship needs a line — tinting both
 * ends the same colour would leave her to guess which of four red squares goes
 * with which.
 *
 * Belongs in the wrapper next to `Board`, never inside `BoardFrame`: absolute
 * children resolve against the padding box, so parenting it to the frame would
 * shift every arrow by the frame's border and leave a gap down two sides.
 */
export function ThreatArrows({ threats, size }: ThreatArrowsProps) {
  const cell = size / 8;
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withTiming(threats.length > 0 ? 1 : 0, { duration: FADE_MS });
  }, [threats.length, appear]);

  const style = useAnimatedStyle(() => ({ opacity: appear.value }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {/* An explicit viewBox, without which react-native-svg has nothing to
          scale by and draws at native coordinates inside the given box. */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {threats.map((threat) => (
          <ThreatArrow key={`${threat.from}-${threat.to}`} threat={threat} cell={cell} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Centre of a square in board coordinates, white at the bottom. */
const centreOf = (sq: Square, cell: number) => ({
  x: fileOf(sq) * cell + cell / 2,
  y: (7 - rankOf(sq)) * cell + cell / 2,
});

function ThreatArrow({ threat, cell }: { threat: Threat; cell: number }) {
  const start = centreOf(threat.from, cell);
  const end = centreOf(threat.to, cell);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  // Both ends are pulled in off the piece art: from the attacker so the line
  // starts clear of it, and from the victim so the head points *at* the piece
  // instead of covering it. A knight's move is the short case and still leaves
  // a visible shaft.
  const tailGap = cell * 0.36;
  const headGap = cell * 0.46;
  const headLength = cell * 0.3;
  const headHalfWidth = cell * 0.15;

  const tail = { x: start.x + ux * tailGap, y: start.y + uy * tailGap };
  const tip = { x: end.x - ux * headGap, y: end.y - uy * headGap };
  const base = { x: tip.x - ux * headLength, y: tip.y - uy * headLength };
  // Perpendicular, for the two back corners of the head.
  const px = -uy * headHalfWidth;
  const py = ux * headHalfWidth;

  return (
    <>
      <Line
        x1={tail.x}
        y1={tail.y}
        x2={base.x}
        y2={base.y}
        stroke={colors.dangerStrong}
        strokeWidth={Math.max(3, cell * 0.11)}
        strokeLinecap="round"
      />
      <Polygon
        points={`${tip.x},${tip.y} ${base.x + px},${base.y + py} ${base.x - px},${base.y - py}`}
        fill={colors.dangerStrong}
      />
    </>
  );
}
