# Rooky

A chess-teaching app for young kids. Expo + React Native + TypeScript.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
writing any code. Append `.md` to any docs URL to get the Markdown version.

## The two constraints that decide most arguments

**1. The player cannot read.** The first tester is a four-year-old. Text may
*support* meaning but must never be the only thing carrying it — every control
has to read from its icon, shape, or position alone. Counts are pips, not
numerals. The play screen stays icon-only because words are noise mid-task; the
home and selector screens carry titles and labels, because that is where an
adult helps out.

All user-facing copy lives in `src/ui/strings.ts`, and all text goes through
`src/ui/Text.tsx` so nothing drifts into an ad-hoc `fontSize`.

**2. Licence hygiene.** The app is MIT and must stay installable on the iOS App
Store, so nothing copyleft may enter the dependency tree or the level content:

- Do **not** add `chessops` (GPL-3.0) or copy anything from `lichess-org/lila`
  (AGPL-3.0). Following lichess's teaching *order* is fine; copying its FENs and
  apple layouts is not.
- `chess.js` (BSD-2-Clause) is the approved library if full chess rules are ever
  needed for tier 4.
- Any new asset gets an entry in `ASSETS.md` in the same commit.

## Layout

```
src/chess/      pure move generation and attack maps. No React, no I/O.
src/game/       engine.ts (pure reducer), solver.ts (BFS), generator.ts, types.ts
src/content/    level data, world metadata, ordering
src/progress/   selectors.ts (pure unlock/progress) + zustand store on AsyncStorage
src/ui/         Board, Celebration, TierRank, icons, theme, strings
app/            expo-router screens
```

Unlock and completion logic belongs in `src/progress/selectors.ts` as pure
functions, not inline in a screen — both the home and selector screens read
from it, and it is covered by vitest.

## Design

- **One colour per meaning, used everywhere without exception.** `actions` in
  `theme.ts`: green = go on, walnut = play freely, light-square cream = do it
  again, plain = help/leave. A glyph is a detail inside a shape, not the shape
  itself, so to a non-reader two same-coloured pills are the same button
  however different their icons. Filled-vs-outlined does not fix that — that
  signals importance, not identity.
- **Gold is rewards only.** If an action is gold it competes with the stars.
- **Every fill comes from the board** — the tournament green, the dark square,
  the light square. Nothing new enters the palette, so it cannot drift towards
  looking like a toy.
- **Two elevations, `raised` and `lifted`, and nothing else.** Depth is what
  the app was missing; more levels would turn it into decoration.
- **The board's cell size must stay a whole number of pixels.** A fractional
  cell leaves squares and the pieces on them rounding independently, which
  shows up as pieces sitting slightly off centre.
- **Signature element:** progress is drawn as a rank of board squares filling
  in (`src/ui/TierRank.tsx`), not a progress bar. It's on both non-board
  screens and it's what the app is meant to be remembered by.
- **The win celebration must stay skippable mid-flight.** Levels get replayed
  constantly; an unskippable cutscene becomes torture by the fifth attempt.
- **Nothing she can reach may destroy progress.** "Start over" opens level 1
  and leaves every tick and star intact. She presses buttons constantly and
  often by accident, and there is no confirm dialog she could read. Destructive
  actions belong behind the parent-facing gear.

## Game modes

`src/ui/LevelPlayer.tsx` is the board screen. Both modes use it and differ only
in where levels come from and what happens on a win:

- **Campaign** (`app/play/[levelId].tsx`) — authored levels, results recorded.
  Finishing the last level of a tier offers a choice (next difficulty / endless
  / start over) rather than silently tipping into the next difficulty.
- **Endless** (`app/endless/[worldKey].tsx`) — generated levels, never scored
  or saved. The pressure-free mode, for when she's stuck and would rather mess
  about with a piece than fail the same puzzle again.

`generator.ts` builds levels by **random walk**, not by random placement plus
search. Drop the piece, take N legal moves, and make every square it lands on a
target. That makes the level winnable by construction and `par` exactly N —
each target needs its own landing, so no line can beat N, and the walk achieves
it. No solver call is needed at runtime, which matters because this runs on a
phone between levels. The solver checks the property in `generator.test.ts`.

Capture levels also **prefer positions where one enemy guards another** — that
is what makes them a puzzle rather than a shopping list. Mutual guards (two
knights covering each other, which nobody could ever take) cannot occur: the
walk only accepts a capture that is safe at the moment it happens, and neither
of a mutual pair ever is.

For tiers 2 and 3 the targets become real enemies, which adds two conditions
the walk must survive: enemies standing on later landing squares can **block**
the slides the walk depends on, and each capture must be safe against the
enemies *still on the board* at that moment. Capture walks step by
`attackedFrom` rather than `destinations`, because a pawn pushes straight but
takes diagonally — walking a pawn by its pushes yields a path it could never
capture along.

`src/chess/` is hand-rolled rather than a library because nearly every level
position is **kingless**, which real chess libraries reject, and tiers 1–3 need
only "where can this piece go" and "what does the enemy cover".

## Rules worth not re-deriving

- **Pseudo-legal is intentional.** Moves that walk into danger are never
  filtered out — the consequence *is* the lesson.
- **Getting taken rewinds one move, it does not restart the level.** She
  watches the enemy come and take her piece, then the board steps back and the
  failed move doesn't count. Never flash "wrong" — play the capture out.
- **Tier 3 is tier 2 mirrored**, derived in `src/content/index.ts` rather than
  authored twice. Holding the difficulty identical means "no help" is the only
  variable that changed, while the flip stops her replaying from memory.
- **Rook and queen guards are a trap when authoring capture levels.** A rook
  guarding a piece along a line also covers every approach square to itself,
  so it can never be taken and the level is unsolvable. The solver caught two
  of these. Prefer knights: eight scattered red squares read as a shape rather
  than tinting two whole lines.
- **Danger is resolved before the goal** in `applyMove`. Otherwise the winning
  move would be immune to capture and every level's last move would be a
  loophole.
- **Stars are collected by landing on them**, never by sliding over them.
- **A piece stays selected after it moves.** A multi-move level is then
  tap-target, tap-target, tap-target with no re-selecting in between. Tapping
  another of your own pieces still switches to it.
- **Over par never fails a level.** It only costs stars.
- Pieces carry a stable `id` from `parseFen` so the UI can animate one piece
  sliding rather than unmounting and remounting.

## Verification

```sh
npm test          # vitest: chess core, engine, and the level solver gate
npm run typecheck # tsc --noEmit
npx expo export --platform android   # catches bundling/native-module breakage
```

The solver test is the **content gate**: it proves every level is winnable and
that its declared `par` is the true optimum. Never hand-tune a `par` to silence
it — change the position instead.
