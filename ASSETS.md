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

- Keep this attribution, and surface it in the app's parent-facing about screen.
- If you modify the piece SVGs, the modified SVGs must stay CC-BY-SA 3.0.
- Replacing the set with a public-domain one would remove this obligation
  entirely, if that is ever preferable.

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
