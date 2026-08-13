import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import { type ActionKind, actions, colors, layout } from './theme';

export type IconName =
  | 'back'
  | 'forward'
  | 'retry'
  | 'hint'
  | 'next'
  | 'play'
  | 'endless'
  | 'shuffle'
  | 'levelUp';

/**
 * Every glyph in the app.
 *
 * Meaning has to survive without the label beside it — the player cannot read
 * one — so each shape says what it does on its own: a circular arrow for going
 * round again, a triangle for go, a lemniscate for "keeps going".
 */
export function Glyph({ name, size, color = colors.text }: { name: IconName; size: number; color?: string }) {
  const common = {
    stroke: color,
    strokeWidth: 7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {name === 'back' && <Path d="M60 20 L30 50 L60 80" {...common} />}

      {name === 'forward' && <Path d="M40 20 L70 50 L40 80" {...common} />}

      {name === 'retry' && (
        <>
          <Path d="M78 50 A28 28 0 1 1 50 22" {...common} />
          <Polygon points="50,8 50,36 34,22" fill={color} />
        </>
      )}

      {name === 'hint' && (
        <>
          <Path d="M50 18 A22 22 0 0 1 62 58 L62 68 L38 68 L38 58 A22 22 0 0 1 50 18 Z" {...common} />
          <Path d="M42 80 L58 80" {...common} />
        </>
      )}

      {(name === 'next' || name === 'play') && (
        <Polygon points="34,22 34,78 76,50" fill={color} />
      )}

      {name === 'endless' && (
        <>
          {/* A lemniscate: two loops that never end. */}
          <Circle cx={33} cy={50} r={17} {...common} />
          <Circle cx={67} cy={50} r={17} {...common} />
        </>
      )}

      {name === 'shuffle' && (
        <>
          {/* Two crossing paths. Deliberately not the lemniscate — that means
              Endless, and reusing it would undo the distinction the Mix card's
              layout is there to make. */}
          <Path d="M14 26 L34 26 L66 74 L84 74" {...common} />
          <Path d="M14 74 L34 74 L66 26 L84 26" {...common} />
          <Polygon points="76,14 96,26 76,38" fill={color} />
          <Polygon points="76,62 96,74 76,86" fill={color} />
        </>
      )}

      {name === 'levelUp' && (
        <>
          {/* Steps rising to the right — the next difficulty is a step up. */}
          <Path d="M18 78 L42 78 L42 56 L66 56 L66 34 L88 34" {...common} />
          <Polygon points="74,20 96,20 96,42" fill={color} />
        </>
      )}
    </Svg>
  );
}

/**
 * A round control, standing on the same shelf as `Button`.
 *
 * Takes the same meaning-based colours, so the retry circle on the play screen
 * matches every other "start again" control in the app rather than being a
 * third identical disc — and it sinks when pressed exactly the way the pill
 * buttons do, so the two read as the same kind of object.
 */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  kind = 'plain',
  prominent = false,
}: {
  name: IconName;
  onPress: () => void;
  /** For screen readers and for the adults; never rendered as visible text. */
  accessibilityLabel: string;
  kind?: ActionKind;
  prominent?: boolean;
}) {
  const action = actions[kind];
  const size = prominent ? layout.touchTarget * 1.4 : layout.touchTarget;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        borderRadius: (size + layout.shelf) / 2,
        backgroundColor: action.shelf,
      }}
    >
      {({ pressed }) => (
        // Padding rather than an offset, for the same reason as `Button`.
        <View
          pointerEvents="none"
          style={{
            paddingTop: pressed ? layout.shelf : 0,
            paddingBottom: pressed ? 0 : layout.shelf,
          }}
        >
          <View
            style={[
              styles.face,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: pressed ? action.press : action.fill,
                borderColor: action.edge,
              },
            ]}
          >
            <Glyph name={name} size={prominent ? 46 : 34} color={action.ink} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
