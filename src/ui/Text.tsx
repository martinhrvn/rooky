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
 * The only way text enters a screen.
 *
 * Every size and weight comes from the scale in theme.ts, so nothing drifts
 * into an ad-hoc fontSize and the app keeps one voice. Note that text always
 * *supports* meaning here and never carries it alone — the player is four and
 * cannot read a word of it.
 */
export function Text({ variant = 'body', color = colors.text, align, style, ...rest }: TextProps) {
  return <RNText style={[type[variant], { color, textAlign: align }, style]} {...rest} />;
}
