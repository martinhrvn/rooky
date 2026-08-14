import { type ComponentType, type PropsWithChildren, memo } from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { CANVAS_ASPECT, type Size } from './canvasGeometry';
import { canvasGrounds } from './theme';

/**
 * The grounds she can stick things onto.
 *
 * Drawn here in `react-native-svg` rather than shipped as artwork: they are
 * then ours, there is no asset and no `ASSETS.md` entry, and nothing new
 * enters the dependency tree for a decoration.
 *
 * Seven, and no more. A picker she has to scroll through is a decision instead
 * of a choice, and the point of this screen is what she puts *on* the ground.
 */
export interface CanvasBackground {
  readonly id: string;
  /**
   * For the adult and the screen reader only. Nothing visible depends on it —
   * a swatch is the scene drawn small, which is the whole affordance.
   */
  readonly name: string;
  readonly Scene: ComponentType<Size>;
}

/**
 * One viewBox, derived from the aspect, so the two can never drift. An SVG
 * without a matching viewBox is the first thing to check when artwork looks
 * off, so there is exactly one of them and every scene shares it.
 */
const VB_H = 100;
const VB_W = 100 * CANVAS_ASPECT;

function Scene({ width, height, children }: PropsWithChildren<Size>) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {children}
    </Svg>
  );
}

/** A flat ground. Three of the seven, and the calmest thing to stick onto. */
const plain = (fill: string) =>
  memo(function Plain({ width, height }: Size) {
    return (
      <Scene width={width} height={height}>
        <Rect x={0} y={0} width={VB_W} height={VB_H} fill={fill} />
      </Scene>
    );
  });

const Hills = memo(function Hills({ width, height }: Size) {
  return (
    <Scene width={width} height={height}>
      <Defs>
        <LinearGradient id="hills-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={canvasGrounds.skyHigh} />
          <Stop offset="100%" stopColor={canvasGrounds.sky} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#hills-sky)" />
      <Circle cx={57} cy={18} r={9} fill={canvasGrounds.sun} />
      {/* Two overlapping hills rather than one: the seam between them is what
          says "hills" at a glance instead of "a green stripe". */}
      <Path
        d={`M0 68 Q 20 48 40 66 T ${VB_W} 62 L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
        fill={canvasGrounds.grassDeep}
      />
      <Path
        d={`M0 80 Q 26 62 48 80 T ${VB_W} 78 L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
        fill={canvasGrounds.grass}
      />
    </Scene>
  );
});

const Sunset = memo(function Sunset({ width, height }: Size) {
  return (
    <Scene width={width} height={height}>
      <Defs>
        <LinearGradient id="sunset-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={canvasGrounds.duskHigh} />
          <Stop offset="55%" stopColor={canvasGrounds.duskLow} />
          <Stop offset="100%" stopColor={canvasGrounds.sun} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#sunset-sky)" />
    </Scene>
  );
});

const Night = memo(function Night({ width, height }: Size) {
  return (
    <Scene width={width} height={height}>
      <Defs>
        <LinearGradient id="night-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={canvasGrounds.nightHigh} />
          <Stop offset="100%" stopColor={canvasGrounds.nightLow} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#night-sky)" />
      <Circle cx={54} cy={20} r={8} fill="#F5EFE0" />
      {/* Cut out of the moon rather than drawn as a crescent path, so the
          shadow is exactly the sky behind it at every gradient stop. */}
      <Circle cx={50} cy={17} r={8} fill={canvasGrounds.nightHigh} opacity={0.92} />
      {STARS.map(([cx, cy, r], i) => (
        <Circle key={i} cx={cx} cy={cy} r={r} fill="#F2EDE4" opacity={0.85} />
      ))}
    </Scene>
  );
});

/** Scattered by hand: random-looking without being random, so it never moves. */
const STARS: readonly (readonly [number, number, number])[] = [
  [8, 12, 0.9],
  [22, 26, 0.7],
  [36, 9, 1.1],
  [64, 34, 0.8],
  [15, 44, 0.9],
  [45, 52, 0.7],
  [69, 14, 0.9],
  [30, 68, 0.8],
  [58, 76, 1],
  [10, 84, 0.7],
  [42, 90, 0.9],
  [67, 60, 0.7],
];

const Sea = memo(function Sea({ width, height }: Size) {
  return (
    <Scene width={width} height={height}>
      <Defs>
        <LinearGradient id="sea-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={canvasGrounds.skyHigh} />
          <Stop offset="100%" stopColor={canvasGrounds.sky} />
        </LinearGradient>
        <LinearGradient id="sea-water" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={canvasGrounds.seaDeep} />
          <Stop offset="100%" stopColor={canvasGrounds.sea} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#sea-sky)" />
      <Circle cx={18} cy={16} r={8} fill={canvasGrounds.sun} />
      <Rect x={0} y={42} width={VB_W} height={44} fill="url(#sea-water)" />
      {/* The sand is a shallow arc, not a straight edge — a flat horizon and a
          flat beach one above the other read as three stripes. */}
      <Path d={`M0 88 Q ${VB_W / 2} 78 ${VB_W} 88 L ${VB_W} ${VB_H} L 0 ${VB_H} Z`} fill={canvasGrounds.sand} />
      <Ellipse cx={20} cy={58} rx={9} ry={1.4} fill="#FFFFFF" opacity={0.35} />
      <Ellipse cx={52} cy={70} rx={11} ry={1.6} fill="#FFFFFF" opacity={0.3} />
    </Scene>
  );
});

/** The first entry is `DEFAULT_BACKGROUND_ID` in `schema.ts`. */
export const CANVAS_BACKGROUNDS: readonly CanvasBackground[] = [
  { id: 'hills', name: 'Green hills', Scene: Hills },
  { id: 'sunset', name: 'Sunset', Scene: Sunset },
  { id: 'night', name: 'Night sky', Scene: Night },
  { id: 'sea', name: 'Sea and sand', Scene: Sea },
  { id: 'cream', name: 'Cream', Scene: plain(canvasGrounds.cream) },
  { id: 'mint', name: 'Mint', Scene: plain(canvasGrounds.mint) },
  { id: 'blossom', name: 'Blossom', Scene: plain(canvasGrounds.blossom) },
];

/**
 * Falls back to the first for an id it does not recognise — the same rule as
 * `avatarById`, `stickerById` and `levelById`, and for the same reason: a
 * stored id from a set that has since changed must still draw *something*
 * rather than leave her picture floating on nothing.
 */
export const backgroundById = (id: string): CanvasBackground =>
  CANVAS_BACKGROUNDS.find((background) => background.id === id) ?? CANVAS_BACKGROUNDS[0];

/**
 * Draws a ground into the box it is given.
 *
 * Takes only the id and the size, so committing a placement never re-runs an
 * SVG tree — the scenes are memoised on exactly these three props.
 */
export const CanvasGround = memo(function CanvasGround({
  id,
  width,
  height,
}: Size & { id: string }) {
  const { Scene: Ground } = backgroundById(id);
  return <Ground width={width} height={height} />;
});
