# Rooky

A chess-teaching app for young kids. Expo + React Native + TypeScript.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
writing any code. Append `.md` to any docs URL to get the Markdown version.

## The two constraints that decide most arguments

**1. The player cannot read.** The first tester is a four-year-old. Text may
*support* meaning but must never be the only thing carrying it — every control
has to read from its icon, shape, or position alone. **Counts are pips, not
numerals** — "how many" has to be countable at a glance. *Ordinals* are the one
exception, and only on the path: the circles there are numbered 1, 2, 3 because
that says which order they go in rather than how many of anything, those three
shapes are known long before words are, and the path is a screen where an adult
is expected to help. Do not read that exception as permission for numerals
anywhere else. The play screen stays icon-only because words are noise mid-task;
the home and path screens carry titles and labels, because that is where an
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

## The difficulty ceiling

A parent can cap how far the tiers go, per profile. "Treat *On your own* as if
it didn't exist" has to hold in progression, unlocking, the selector and Mix at
once, so **screens never read `WORLDS` or `ALL_LEVELS` directly** — they call
`useCatalogue()` and get the filtered content. Functions that depend on it
(`nextLevel`, `levelAfter`, `isLastOfTier`, `nextWorldWithLevels`, `mixPool`)
take a `Catalogue`.

The one exception is `levelById`, which stays on the full catalogue: an id from
a hidden tier must still resolve or a stale route becomes a blank screen.

Lowering the ceiling **hides, never deletes** — results above it stay stored and
reappear when it is raised.

## Profiles

Everything is keyed off `activeProfileId`, so switching profile switches
progress, the difficulty ceiling and the Mix pool together — one child can be
on stars-only while another has all three tiers, and neither sees the other's
stars.

`activeProfileId` is inside `partialize`, which is the *entire* implementation
of "the app reopens on the last profile used". Dropping it from there would
silently reopen on the wrong player; `store.test.ts` asserts it stays.

Avatars are emoji stored **by id**, never by character, so the set can change
without orphaning saved profiles. `avatarById` falls back to the first entry
for an unknown id.

Switching lives in `app/profiles.tsx` and is child-reachable, because it is
non-destructive and instantly reversible. **Deleting a profile is in settings**
behind the gear and a confirm — do not move it into the switcher.

## Settings and the developer panel

`app/settings.tsx` is the only screen written for an adult, reached through the
small gear on the home screen. Its Credits section discharges a real licence
obligation (see `ASSETS.md`) — do not remove it.

`app/dev.tsx` is reached *only* by tapping the version line on settings seven
times, and is never linked. Everything there writes straight to saved progress
with no undo, so it must stay somewhere a child mashing the screen cannot reach
by accident. Do not add a shortcut to it from a play screen.

## Layout

```
src/chess/      pure move generation and attack maps. No React, no I/O.
src/game/       engine.ts (pure reducer), solver.ts (BFS), generator.ts, types.ts
src/content/    level data, world metadata, ordering
src/progress/   selectors.ts (pure unlock/progress) + zustand store on AsyncStorage
src/ui/         Board, Celebration, PathNode, TierRank, icons, theme, strings
app/            expo-router screens
```

Unlock and completion logic belongs in `src/progress/selectors.ts` as pure
functions, not inline in a screen — the home and path screens both read from
it, and it is covered by vitest.

## Choosing a level

`app/levels.tsx` is the path: a ribbon per world, and under it one numbered
circle per difficulty the world actually has. It is what "Choose a level" opens
and the only selector a child sees.

- **The circles are numbered by position, not by tier id.** A parent capping
  difficulty at *Watch out* leaves circles 1 and 2 — not 1 and 2-of-3. Theme
  worlds have no tier 1, so their first circle is still 1.
- **Tapping a finished circle plays it again and clears nothing.**
  `firstPlayableOfTier` falls back to the tier's first level once they are all
  done, and `recordResult` keeps the best stars and the fewest moves, so a
  replay can only improve a result. Do not add a reset here: unlocking reads
  completion (`isLevelUnlocked`, and `isWorldUnlocked` wants *every* earlier
  world complete), so clearing one tier would re-lock the rest of its world and
  every world after it — from a tap she cannot be talked out of.
- **The FAB is the answer to a long path**, not a decoration. It opens
  `nextLevel(...)`, which is exactly what Play opens, so the two can never
  disagree.
- `app/pieces.tsx` is the **previous** selector, kept while the path proves
  itself and reachable only from the developer panel. When the path is settled,
  delete it, `MixCard` and `TierRank` together — or bring `TierRank` back, per
  the note on the signature element in Design.

## Design

- **The chrome is dark; the board is not.** Everything around the board is a
  deep plum ground (`background`, `surface`, `surfaceRaised`), and the board
  keeps its warm squares, its frame and every danger wash exactly as they were.
  That contrast *is* the design: a warm board on a dark ground reads as a lit
  object on a table, and it means the only bright things on screen are the
  pieces, the stars and the actions. **Never restyle a board colour from
  `theme.ts`** — those constants are what a real board looks like and what the
  Cburnett artwork was drawn against.
- **One colour per meaning, used everywhere without exception.** `actions` in
  `theme.ts`: jade = go on, periwinkle = play freely, coral = do it again,
  plain = help/leave. A glyph is a detail inside a shape, not the shape itself,
  so to a non-reader two same-coloured pills are the same button however
  different their icons. Filled-vs-outlined does not fix that — that signals
  importance, not identity.
- **Gold is rewards only.** If an action is gold it competes with the stars.
- **Nothing on the chrome may out-shout the board.** The accents are muted
  jewels, never acid. The palette was pastel once and read as a toddler's toy;
  it must not now overcorrect into a neon one.
- **Coloured buttons carry dark labels** (`inkOnAccent`). Cream fails AA on
  every accent in the palette (2.5–2.9:1) and dark clears it on all of them —
  which is the entire reason the accents are allowed to stay bright. If you add
  an accent, check both before shipping it.
- **Surfaces step up in lightness; controls stand on a shelf.** On a dark
  ground a shadow mostly darkens something already dark, so separation comes
  from `background` → `surface` → `surfaceRaised` plus a hairline. Controls
  ignore that entirely: every button sits a few pixels above a darker block of
  its own colour and sinks onto it when pressed. The shelf is what says "press
  me" in an app with no characters drawn to say it, and the button's total
  height never changes, so pressing never reflows the screen.
- **The board's cell size must stay a whole number of pixels.** A fractional
  cell leaves squares and the pieces on them rounding independently, which
  shows up as pieces sitting slightly off centre.
- **Anything overlaying the board goes inside the wrapper next to `Board`, not
  inside `BoardFrame`.** Absolute children resolve against the *padding* box,
  so a child of the frame lands inside its 2px border rather than inside its
  padding — offsetting the overlay by the frame's width and leaving a gap at
  the bottom and right.
- **Any SVG asset needs an explicit `viewBox`.** Without one react-native-svg
  has nothing to scale by and draws at native coordinates inside the given
  box, clipping and mis-centring. The Cburnett files shipped without one; this
  is the first thing to check if new artwork looks off.
- **Signature element:** progress is drawn as a rank of board squares filling
  in (`src/ui/TierRank.tsx`), not a progress bar. The squares **butt together
  with no gap** inside a clipped, hairlined frame — spaced out they were a row
  of tiles, touching they are a slice cut from the board, and the finished
  levels form one continuous bar rather than a dotted line.

  It now lives only on `app/pieces.tsx`, which the numbered path replaced and
  which nothing links to from home. So the thing the app was meant to be
  remembered by is currently on a screen a child never reaches. **If the path
  stays, this needs resolving** — either bring the rank back onto the path as a
  circle's progress, or accept a different signature and say so here. Do not
  leave it drifting.
- **The "next level" ring is dark, and has to be.** It sits on board squares,
  where cream is 1.18:1 on the light square and jade is 2.33 light / 1.01 dark.
  `inkOnAccent` is the only colour in the palette that clears 3:1 on both.
- **Black pieces need a halo on the chrome.** The Cburnett black set is black
  fill with a black stroke, so it disappears on the dark ground. `GoalBadge`
  puts a soft radial behind it — edgeless on purpose, because the badge must
  never look like a button.
- **The win celebration must stay skippable mid-flight.** Levels get replayed
  constantly; an unskippable cutscene becomes torture by the fifth attempt.
- **Nothing she can reach may destroy progress.** "Start over" opens level 1
  and leaves every tick and star intact. She presses buttons constantly and
  often by accident, and there is no confirm dialog she could read. Destructive
  actions belong behind the parent-facing gear.

## Worlds

Six worlds about a piece, then six about an idea — capture, protect, combat,
check, escape, mate. Reaching the king, getting out of check and finishing are
three separate skills and get three separate worlds; rolling them into one
"checkmate" world hides two of them behind the third.

`World.cast` is the distinction and the only one: **one piece means
a piece world, several means a theme world**, and everything downstream reads
the length rather than a separate flag (`soloPiece`). A row of pieces on the
tile is also what tells a non-reader that Taking Pieces is not another piece to
learn.

**Endless is unavailable on a theme world.** It builds levels by walking a
single piece around an empty board and could not produce a discovered attack if
it tried. Mix picks them up for free, because Mix replays whatever she has
beaten.

Theme worlds have no tier 1 — stars teach movement, and these do not. That
makes them the first worlds a difficulty ceiling can empty, so
`catalogueFor` **drops a world the ceiling has emptied** rather than showing a
card that can never open. A world with no levels *at all* still shows, as the
"coming soon" placeholder; those are different states and the code says so.

## Game modes

`src/ui/LevelPlayer.tsx` is the board screen. Both modes use it and differ only
in where levels come from and what happens on a win:

- **Campaign** (`app/play/[levelId].tsx`) — authored levels, results recorded.
  Finishing the last level of a tier offers a choice (next difficulty / endless
  / start over) rather than silently tipping into the next difficulty.
- **Endless** (`app/endless/[worldKey].tsx`) — generated levels, never scored
  or saved. The pressure-free mode, for when she's stuck and would rather mess
  about with a piece than fail the same puzzle again.
- **Mix** (`app/mix.tsx`) — a shuffle of every level she has already beaten,
  across every piece. Real authored levels, so results *are* recorded, and it
  advances manually rather than automatically.

**Endless and Mix must stay different in kind, not just in scope** — two
buttons that both mean "play forever" is the confusion this design exists to
avoid. Endless invents puzzles for one piece and records nothing; Mix replays
real ones from every piece and records. That difference is carried visually by
**one piece versus a row of them**, and by distinct glyphs — the lemniscate is
Endless, the crossing arrows are Mix. Don't blur either.

They are also no longer on the same screen, which is the other half of keeping
them apart. Mix is a button on home; the row of pieces that used to head the
Mix card now rides on that button via `Button`'s `iconNode` — the row is the
signal, so whatever carries it has to keep carrying it.

**Endless is reached by pressing the front of a world's ribbon** on the path,
and by the "Keep playing" choice at the end of a tier. It had a button of its
own on the ribbon and that competed with the circles, which are the only thing
the path is for — so the band became the control instead of carrying one.

The lemniscate at the end of the band is not decoration and must not be
removed: a control a non-reader cannot see is a control she does not have, and
a coloured bar with a name on it says nothing about being pressable. The band
is only pressable on a **solo-piece world that has opened** — the generator
walks a single piece and cannot build a theme world's levels.

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

- **Danger has a scope, set per level.** By default only the piece that just
  moved can be taken. A level can set `danger: 'allPieces'`, which checks every
  white piece and is what makes a discovered attack possible — the piece that
  gets taken is not the one that moved. It is opt-in because nine of the piece
  worlds' levels have more than one white piece, where a bystander coming under
  attack mid-solution is not a mistake. The moved piece is always checked
  first, so a plain blunder still reads as "you moved into that".
- **An enemy king may not take a defended piece** (`capturersOf`). Nothing else
  in the app needs this, but every mate in one turns on it: the mating piece
  stands next to the king, held there by a defender, and without the rule the
  king would simply take it and the mate would read as a blunder.
- **Blocking a check always loses, so never author it as an answer.** To block
  a line her piece has to stand *on* it, which is by definition a square the
  checking piece attacks — so the blocker is taken, and getting taken rewinds.
  Real chess calls that a trade and weighs it; Rooky has no notion of trading,
  only of losing a piece. The Escape world therefore teaches move-the-king and
  take-the-checker, and `escape-t2-02` exists to show the interposition being
  punished. Giving blocks a fair hearing means teaching the engine about
  defended pieces and trades, which is much larger than it looks: the question
  stops being "will it be taken" and becomes "is taking it worth it" — a static
  exchange evaluation. The cheap approximation, "the enemy never takes a
  defended piece", is not on the table: it is false everywhere else in the app
  and would quietly rewrite what is safe in every tier 2 and 3 level. Until
  there is a real SEE, blocking levels stay unauthored.
- **Under `danger: 'allPieces'`, every move must leave nothing of hers
  attacked.** So a level that starts with a piece in trouble has to resolve it
  on move one, and cannot pose two separate threats at once — the second would
  punish the move that answers the first. This is why every Protect level has
  `par: 1` (nothing attacked *is* the goal) and why Combat levels open with
  exactly one threat and put the length after it.
- **The hint shows the danger, not the answer.** It lends her tier 2's overlay
  for a couple of seconds, plus arrows from each enemy to the piece of hers it
  is attacking. It never points at a move — these levels usually have several
  right orders — and it is available from the first move rather than earned
  after three captures, because it shows the thing she is there to learn to
  see. It must stay a timed peek: leaving it up turns tier 3 back into tier 2.
- **`dangerFrom(board, from)`, not `dangerMap`, once a piece is selected.**
  `dangerMap` lifts *all* her pieces off and so paints squares red that a piece
  going nowhere is shielding. Moving changes where one piece stands, so lifting
  that one is the exact answer. With a single piece on the board the two agree,
  which is why this was invisible until the theme worlds.
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
- **Stars are collected by landing on them**, never by sliding over them. A
  pawn's two-square first move therefore does *not* collect a star on the
  square it jumps.
- **A move that strands her is taken back too**, not just one that gets her
  captured. Nothing attacked her, so there is no "lost" state — the position
  has simply become unwinnable, and without the rewind the board would just
  stop responding. Checked only while a pawn is on the board, since every
  other piece can always move again.
- **Promotion is a pause, not an outcome.** `tap()` parks the move as
  `phase: 'promoting'` and the UI asks; `promote()` completes it. The solver
  branches over all four choices, which is what lets par know that
  underpromotion is sometimes faster.
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

Each world has its own gate, so a single world can be validated in isolation:

```sh
npx vitest run src/content/levels/knight
```

`src/content/levels/validate.ts` holds the shared checks; each world's test
file is one line. This matters when several people (or agents) author worlds at
once — without it, one half-written file breaks everyone's test run.

The gate validates **what a world ships, not what was typed**: it applies
`withMirroredTier3` first, so the derived tier 3 is solver-verified too. Only
the uniqueness checks run on the authored levels alone, because a mirrored
level shares its `teaches` note with the tier 2 it came from. `levels.test.ts`
is deliberately thin — it holds only what no single world can check about
itself (ids unique across worlds, world order, next-world navigation). Do not
grow a per-level sweep back into it; that is the thing the per-world gate
replaced.

## Authoring levels

- **Every level needs a `teaches` line** saying what the position is *for*.
  Required on purpose: being made to say it is what stops three levels quietly
  teaching the same thing.
- **A piece can only capture a same-moving enemy from a square that enemy
  attacks** — so unless it starts there, it cannot capture it at all. This one
  fact explains three separate traps that each cost real authoring time:
  - A black **rook or queen guard** covers every approach to itself, so it is
    uncapturable and the level is unsolvable. Two of the first five rook levels
    died this way.
  - A white **knight can never take a black knight**: the square it must jump
    from is by definition a knight's move from the target, which is exactly
    what the target covers.
  - A black **bishop guard** is unsolvable in the bishop world for the same
    reason, one diagonal at a time.
- **Knights cannot guard in the bishop world at all.** A bishop is colour-bound
  and a knight always attacks the opposite colour to the square it stands on —
  so a knight on the bishop's colour guards only squares the bishop can never
  reach (decorative red), and one on the other colour is uncapturable. Use
  pawns: a pawn's two capture squares are its own colour.
- Safe guards in practice: **pawns and knights** for line pieces, **pawns**
  for the bishop.
- **A piece can only take its attacker back if the two attack each other**,
  which rules out three shapes that keep looking authorable: a rook or queen
  can never capture the knight forking it (a knight's move is never a line), a
  bishop can never capture a knight attacking it (a knight attacks the opposite
  colour to the square it stands on, so the bishop it hits is on a colour the
  bishop cannot reach), and a king can never capture a knight checking it. Each
  of those needs a third piece, which is the level.
- **A pawn cannot escape an attack down its own file**, because pushing keeps
  it on that file — it can only capture its way off. Along a *rank* one push is
  the whole answer. `protect-t2-05` and `-10` are that pair.
- **Only the square she lands on is checked, never the ones she slides over.**
  A rook may cross a whole file of red to take the piece at the end of it. This
  is what makes an enemy rook capturable at all: every square that attacks it
  along its own lines is red, so the answer is nearly always to start on that
  line and take it in one.
- **Two black guards that guard each other are unauthorable**, the same trap
  the generator avoids by construction: neither can ever be taken, so the level
  has no solution. A bishop on c3 and a pawn on b4 is the shape to watch for.
- **Do not author a mate that the white king delivers by stepping next to
  his.** `src/chess/` is pseudo-legal and does not stop it, so the solver will
  happily report par 1 — but kings may not touch, and the level would teach a
  move that is illegal in every real game. Check the solver's line, not just
  its length.
- **A masking piece is always itself under attack**, so a discovered-attack
  level needs a third piece. To mask a line hers has to stand *on* it, which
  makes it the first thing the enemy slider sees. Under `danger: 'allPieces'`
  that means moving it hands over the piece behind, and leaving it there hangs
  the masker — so a position with only the two loses on every move and is
  unsolvable. What makes it a puzzle is a piece that can go and take the
  slider, answering both threats at once. `validate.test.ts` holds a worked
  example of this and of every other new goal kind, each known to pass the
  gate.
- **Do not author tier 3.** It is derived from tier 2 by mirroring, in
  `src/content/index.ts`.
- When the gate fails it prints `declared par 3, solver found: c1e3 e3g5` —
  read the true par straight off that line rather than guessing again.
