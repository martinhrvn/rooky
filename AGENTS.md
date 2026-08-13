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
src/game/       engine.ts (pure reducer), solver.ts (BFS), types.ts
src/content/    level data, world metadata, ordering
src/progress/   selectors.ts (pure unlock/progress) + zustand store on AsyncStorage
src/ui/         Board, Celebration, TierRank, icons, theme, strings
app/            expo-router screens
```

Unlock and completion logic belongs in `src/progress/selectors.ts` as pure
functions, not inline in a screen — both the home and selector screens read
from it, and it is covered by vitest.

## Design

- **Gold is rewards only.** Actions and progress use tournament green
  (`colors.green`); if an action is gold it competes with the stars.
- **Signature element:** progress is drawn as a rank of board squares filling
  in (`src/ui/TierRank.tsx`), not a progress bar. It's on both non-board
  screens and it's what the app is meant to be remembered by.
- **The win celebration must stay skippable mid-flight.** Levels get replayed
  constantly; an unskippable cutscene becomes torture by the fifth attempt.

`src/chess/` is hand-rolled rather than a library because nearly every level
position is **kingless**, which real chess libraries reject, and tiers 1–3 need
only "where can this piece go" and "what does the enemy cover".

## Rules worth not re-deriving

- **Pseudo-legal is intentional.** Moves that walk into danger are never
  filtered out — the consequence *is* the lesson.
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
