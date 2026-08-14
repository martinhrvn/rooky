# Third-party assets

Everything in this file is licensed separately from the app's own MIT licence.
Record new assets here **when you add them**, not later.

## Chess pieces — `assets/pieces/*.svg`

| | |
|---|---|
| **Set** | Cburnett |
| **Author** | Colin M.L. Burnett |
| **Licence** | [CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| **Source** | [Wikimedia Commons — Standard chess diagram pieces](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces) |

Downloaded as `Chess_{k,q,r,b,n,p}{l,d}t45.svg` and renamed to `{w,b}{k,q,r,b,n,p}.svg`.
The only modification is stripping the XML prolog and `DOCTYPE` so the Metro SVG
transformer can parse them; the artwork itself is unchanged.

**Obligations.** CC-BY-SA requires attribution and share-alike. This applies to
the **artwork only** — it does not affect the licence of the app's source code,
which stays MIT. In practice that means:

- Keep this attribution. It is surfaced in the app on the parent-facing
  settings screen (`app/settings.tsx`, "Credits"); if that section is ever
  removed, the obligation is not met.
- If you modify the piece SVGs, the modified SVGs must stay CC-BY-SA 3.0.
- Replacing the set with a public-domain one would remove this obligation
  entirely, if that is ever preferable.

## Typeface — Fredoka

| | |
|---|---|
| **Family** | Fredoka |
| **Author** | The Fredoka Project Authors |
| **Licence** | [SIL Open Font License 1.1](https://scripts.sil.org/OFL) |
| **Source** | `@expo-google-fonts/fredoka` (weights 400, 500, 600) |

OFL is permissive and does not affect the app's MIT licence. The only real
obligations are keeping the licence text with the font files (npm does this for
us, in `node_modules/@expo-google-fonts/fredoka/LICENSE_FONT`) and not selling
the font on its own. Reserved Font Name rules apply if you ever modify it —
don't ship a modified build still called Fredoka.

## Sticker set — OpenMoji — `assets/stickers/*.svg`

| | |
|---|---|
| **Set** | OpenMoji (colour) |
| **Author** | The OpenMoji Project — HfG Schwäbisch Gmünd |
| **Licence** | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| **Source** | [openmoji.org](https://openmoji.org) / [hfg-gmuend/openmoji](https://github.com/hfg-gmuend/openmoji) |

Both the artwork and the metadata are used. `scripts/build-stickers.mjs`
generates `src/content/stickers/catalogue.ts` from OpenMoji's
`data/openmoji.json` (hexcodes, names, groupings) and downloads the colour SVG
for every sticker that survives curation into `assets/stickers/`, named by
hexcode. The only modification is stripping any XML prolog or `DOCTYPE` so the
Metro SVG transformer can parse them, exactly as for the Cburnett pieces; the
artwork itself is untouched.

Re-running the script prunes files that curation has since excluded, so the
set on disk always matches what ships. **The bundle is the artwork** — 738
stickers is roughly 1.9 MB of the Android bundle — so narrowing
`src/content/stickers/excluded.ts` is what makes the app smaller.

**Obligations.** Same shape as Cburnett: attribution plus share-alike, on the
**artwork and data only**, and it does not affect the app's MIT source licence.

- Keep this attribution, and keep the line in the settings Credits section.
  That section now discharges two obligations rather than one.
- **Do not recolour or edit the sticker SVGs.** A modified OpenMoji is a
  derivative and must itself be released under CC BY-SA 4.0. If one ever must
  be edited, keep it in its own directory and record it here, so the boundary
  between our artwork and theirs stays obvious. Note that the build script
  overwrites nothing it has not downloaded, but *does* delete files for
  excluded stickers — so an edited file in `assets/stickers/` is not a safe
  place to keep work either way.
- [Twemoji](https://github.com/jdecked/twemoji) (CC BY 4.0) and
  [Noto Emoji](https://github.com/googlefonts/noto-emoji) (Apache-2.0 / OFL)
  are both more permissive and would drop the share-alike. Stickers are stored
  by OpenMoji hexcode rather than by filename precisely so either could be
  swapped in without touching a single saved album.

## What is deliberately *not* used

- **[lila](https://github.com/lichess-org/lila) level data** (AGPL-3.0) — we follow
  a similar teaching order, which is an idea and free to reuse, but every FEN and
  star layout in `src/content/levels/` is our own.
- **[chessops](https://github.com/niklasf/chessops)** (GPL-3.0-or-later) — we
  hand-rolled `src/chess/` instead.

Both would relicense the whole app under a copyleft licence, which reopens the
long-standing conflict between GPL-family terms and the iOS App Store. If you
ever need a full chess-rules library (for tier 4's real games), use
[chess.js](https://github.com/jhlywa/chess.js), which is BSD-2-Clause.
