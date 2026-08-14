import { Text as RNText } from 'react-native';

import { stickerArt } from '../content/stickers/art';
import { stickerById } from '../content/stickers';

/**
 * One sticker, drawn.
 *
 * OpenMoji artwork (CC BY-SA 4.0 — see ASSETS.md), which is the point: the
 * platform's own emoji look materially different on iOS and Android, and an
 * album is exactly where that shows.
 *
 * Falls back to the unicode character when there is no artwork. That is not a
 * theoretical branch — the build script only downloads the *curated* set, so
 * excluding a sticker somebody has already earned leaves her owning one with
 * no file. She keeps it and it still draws; it simply draws as the system
 * emoji. Losing a sticker to a later change of taste would be much worse.
 */
export function StickerArt({ id, size }: { id: string; size: number }) {
  const Art = stickerArt(id);

  if (Art) return <Art width={size} height={size} />;

  return (
    // Raw text, not the app's own: an emoji is a glyph rather than language
    // and should inherit no typeface. Same reason as `Avatar`.
    <RNText style={{ fontSize: size * 0.82, lineHeight: size }}>{stickerById(id).emoji}</RNText>
  );
}
