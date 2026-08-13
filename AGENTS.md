# Rooky

A chess-teaching app for young kids. Expo + React Native + TypeScript.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
writing any code. Append `.md` to any docs URL to get the Markdown version.

## The two constraints that decide most arguments

**1. The player cannot read.** The first tester is a four-year-old. The play
loop — home, level grid, game screen — must contain no text she has to read.
Controls are icons, kept to a minimum, in fixed positions. Counts are pips, not
numerals. Parent-facing screens (settings, profile setup) may use words freely;
a parent typing a name is fine, and setup steps are allowed to assume an adult.

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
src/content/    level data + world ordering
src/progress/   zustand store persisted to AsyncStorage
src/ui/         Board, icons, and other presentation
app/            expo-router screens
```

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
