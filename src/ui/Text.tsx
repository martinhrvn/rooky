import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, type } from './theme';

type Variant = keyof typeof type;

interface TextProps extends RNTextProps {
  variant?: Variant;
  /** Defaults to the main ink colour. */
  color?: string;
  align?: TextStyle['textAlign'];
}

/**
 * How far each variant may grow under the system's font-size setting.
 *
 * `body` and `title` are uncapped on purpose: they are the adult-facing text —
 * the world blurbs, all of settings — and letting them grow is the entire
 * point of the setting. The rest sit inside fixed shapes that come apart long
 * before the system's maximum: `button` inside a 64pt pill, `label` inside a
 * rank strip and a tier chip, `display` on a card that would push its own
 * form off screen. A cap is not a refusal to scale; it is the size past which
 * the layout stops carrying the meaning the words were only supporting.
 */
const MAX_SCALE: Partial<Record<Variant, number>> = {
  display: 1.4,
  button: 1.3,
  label: 1.3,
};

/**
 * The only way text enters a screen.
 *
 * Every size and weight comes from the scale in theme.ts, so nothing drifts
 * into an ad-hoc fontSize and the app keeps one voice. Note that text always
 * *supports* meaning here and never carries it alone — the player is four and
 * cannot read a word of it.
 */
export function Text({ variant = 'body', color = colors.text, align, style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={MAX_SCALE[variant]}
      style={[type[variant], { color, textAlign: align }, style]}
      {...rest}
    />
  );
}
