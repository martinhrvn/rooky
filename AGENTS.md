# Rooky

A chess-teaching app for young kids. Expo + React Native + TypeScript.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code. Append `.md` to any docs URL to get the Markdown version.

**The version here has to match `package.json`**, which pins `expo ~54.0.0`
(installed: 54.0.36). This line said v57 for a while, three SDKs ahead of
anything installed — docs for an SDK you are not on are worse than no pointer,
because they read as authoritative and describe APIs that are not there. Bump
both together or neither.

## The two constraints that decide most arguments

**1. The player cannot read.** The first tester is a four-year-old. Text may
*support* meaning but must never be the only thing carrying it — every control
has to read from its icon, shape, or position alone.

**Numerals fall under that same rule, not under a ban.** She knows her numbers,
as do most children old enough to play chess at all — so a digit may support a
count, it just may never be the thing carrying it. **A count that has to be read
at a glance is pips**, because pips are countable without stopping to read; a
digit beside them is fine and often useful to whoever is helping. Where a number
is the *only* thing on offer, it has failed the rule, and that is what a bare
`12 of 58` was doing on the stickers screen before the collection replaced it.

*Ordinals* are a different case again and carry themselves: the circles on the
path are numbered 1, 2, 3 because that says which order they go in rather than
how many of anything.

The play screen stays icon-only because words and numbers are both noise
mid-task; the home, path and collection screens carry titles, labels and counts,
because that is where an adult helps out.

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
app/            expo-router screens; app/(tabs)/ is the four in the nav bar
```

Unlock and completion logic belongs in `src/progress/selectors.ts` as pure
functions, not inline in a screen — the home and path screens both read from
it, and it is covered by vitest.

## Navigation

Four tabs, in `app/(tabs)/`: **Home · Levels · Things · Stickers**. A row of
fixed icons in a fixed order is the strongest navigation available to someone
who cannot read — position is learned in one sitting and never lost — and it
puts the app's four places on screen at once instead of behind doors on home.

- **A tab is a place; a board is not.** Everything showing a board — `mix.tsx`,
  `play/[levelId].tsx`, `endless/[worldKey].tsx` — lives *outside* the group and
  opens over the bar, full screen. That is structural, not only aesthetic:
  `LevelPlayer` sizes the board off the whole window height (`height * 0.68`),
  so a bar beneath it would eat into the board rather than the board making room
  for it. **This is the reason Mix is not a tab** and stays a button on home.
  The adults' screens (`settings`, `dev`, `profiles`) are outside for the second
  reason — they are things you go and do, not places you live.
- **Route groups do not appear in the URL**, so moving those four screens into
  `(tabs)/` changed no path and no `router.push` call. `typedRoutes: true` in
  `app.json` means typecheck catches it if that ever stops being true.
- **The bar is uncoloured on purpose.** `theme.actions` spends jade, periwinkle
  and coral on what a control *does*, and gold is rewards only — and two of
  these four tabs *are* rewards, so colouring by meaning would either put gold
  on navigation or hand two tabs the same hue. Active is `colors.text`,
  inactive `colors.textSoft`; shape and position carry identity, which is what
  the reading rule asks for anyway. The one exception is the Stickers tab's
  star, which keeps its gold because that is what a reward looks like
  everywhere else — and it is why the Things tab is a **rosette**, a different
  shape rather than a second gold thing.
- **Tab labels go through `Text`**, via `tabBarLabel` as a render function.
  `tabBarLabelStyle` is an ad-hoc font size and the one thing `src/ui/Text.tsx`
  exists to prevent.
- **A tab screen has no back arrow.** There is nothing under it to pop to, and
  a dead control is worse than no control. The bar is how you leave.
- **Nothing sits an inch above its own tab.** "Choose a level" left home and the
  achievements row left the stickers screen for the same reason; the XP bar on
  home stays pressable because it is a status display whose tap is a shortcut,
  not a second control doing the Stickers tab's job.
- **A screen inside the bar already ends where the bar begins.** `BottomTabView`
  is a flex column — screen area, then the bar — so a screen positions against
  its own bottom edge as if the bar were not there. Do not offset anything by
  `layout.tabBar`; the path's FAB was, and floated a whole bar clear of nothing.
  For the same reason a tab screen's `SafeAreaView` takes `edges={['top']}`
  only: the bottom inset belongs to the bar, and asking for it inside the screen
  pads above the bar for something that is below it.
- **A numeric `height` in `tabBarStyle` silently drops the safe-area inset.**
  `getTabBarHeight` returns a custom numeric height verbatim and skips the
  `+ insets.bottom` it would otherwise add, while the bar keeps applying
  `paddingBottom: insets.bottom` *inside* that height — so the bar lands under
  Android's navigation buttons with its icons squashed. Add the inset by hand:
  `height: layout.tabBar + insets.bottom`. `layout.tabBar` is the bar proper.

## Choosing a level

`app/(tabs)/levels.tsx` is the path: a ribbon per world, and under it one
numbered circle per difficulty the world actually has. It is the **Levels tab**
and the only selector a child sees. It used to be behind a "Choose a level"
button on home; that button is gone, because the tab is the same door one inch
lower down.

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
  disagree. It was not dropped in favour of the Home tab: from halfway up a long
  path that would be two taps, and this is one. It needs no offset for the nav
  bar — see the note on that in Navigation.
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
  constantly; an unskippable cutscene becomes torture by the fifth attempt. One
  tap settles every animation at once — it never *dismisses* the card, so a tap
  always means "get on with it" and can never strand her on a finished board.
- **The win is a card over a thin scrim** (`WinDialog`), not the board-anchored
  overlay it used to be. That earlier decision was right while three stars were
  the only thing to show; it stopped being right once the XP bar and the way
  onward had to appear too, because neither is board-shaped and both landed on
  top of the pieces. The scrim stays thin so the finished position is still
  readable through it, which was the point of the original rule. `Celebration`
  is now only the two moving parts — the confetti and the star that springs in.
- **"Try again" and "Start over" are different acts and need different
  glyphs.** They sit side by side at the end of a tier and are both coral,
  because both mean "again" — so the circular arrow doing double duty made them
  one button to a non-reader. Replaying this level is `retry`; going back to the
  first level of the tier is `restart`, the rewind-to-start shape.
- **Nothing she can reach may destroy progress.** "Start over" opens level 1
  and leaves every tick and star intact. She presses buttons constantly and
  often by accident, and there is no confirm dialog she could read. Destructive
  actions belong behind the parent-facing gear.

## Rewards

XP feeds one bar, the bar buys stickers, and achievements are one-shot lumps of
XP on top — one economy, never two. `src/progress/achievements.ts` holds the
catalogue and every pure part of it; nothing there imports React or the store.

- **`AchievementIcon` is the only place an achievement is drawn.** The toast and
  the collection both go through it, because two pictures for one achievement
  are two achievements to a non-reader. It takes `{piece, mark}` rather than an
  `Achievement`, so a whole `Family` passes straight in.
- **The collection groups by tally, not by tier.** Names live in
  `strings.achievementNames` keyed by *counter*, so all three tiers of `moved:n`
  are "Hop, hop, hop" — listed flat that is the same row three times with
  nothing to tell them apart. `FAMILIES` does the grouping, derived from
  `ACHIEVEMENTS` so a new entry cannot be left out of one, and the tiers are a
  row of pips.
- **Pips carry the count; the `34 of 100` beside them is support.** Both are
  wanted here — the question this screen answers ("what do I have to do to get
  that one?") is asked out loud, and a digit answers it precisely for whoever is
  helping. The order is what matters: the pips say how far along a tally is on
  their own, so covering the numbers loses precision and nothing else.
  `strings.achievementTallies` says what each one counts, as a noun phrase with
  no number in it, so one line serves every tier. Two maps keyed by counter is
  a drift risk, so `achievements.test.ts` fails on a family missing from either
  and on a key in either that no family watches.
- **Three unearned ones are silhouettes, and hold back their name only.** They
  say what they count and how close she is — otherwise nobody in the house can
  tell her how to get one — but the name stays back, on screen and in the
  accessibility label, because that is the part worth discovering. `nextUp`
  picks the three she is *closest* to, so what is dangled moves as she plays,
  and it skips a family she has already started because that one is on the
  screen above with an empty pip.
- **Read a family's tally with `tallyOf`, never `counters[counter]`.** `tries`
  has an entry in both records and only the streak one is the number its
  achievements use.
- **"Not yours yet" is opacity, everywhere.** React Native cannot blur a view
  (`Board.tsx` says so where the glow is drawn in SVG instead), and the app
  already dims for locked in `PathNode`, `PieceTile` and `TierRank`. Do not add
  a blur dependency for this; one visual language for locked is worth more than
  a truer effect.

## The canvas

The Stickers tab is a picture she makes: a fixed-shape canvas filling the
screen, a two-row tray of everything she owns along the bottom, and the grounds
floating over one corner. It is the reason the album is worth filling — a shelf
is something you look at once, and this is a toy.

**The tray is a band at the bottom, not a column down the side.** The column
showed six stickers and left the picture a narrow slot to live in; the band
shows a dozen in the same height and gives the picture the whole width. A tray
is a drawer she rummages in, and a drawer is wide. For the same accounting the
grounds float over the picture's corner instead of sitting under it: a row in
the layout costs the picture its height all day for a control she touches once
a week, and over the corner it costs a thumbnail.

- **Placements are normalised, and the canvas has a fixed aspect**
  (`CANVAS_ASPECT`, 3:4) with the sticker size a fraction of its width
  (`STICKER_FRACTION`). Both halves are needed for the same promise: a picture
  made on a phone has to be the same picture on a tablet. Pixels anywhere in
  here means a composition that rearranges itself, which is a composition
  destroyed. The canvas therefore also ignores `layout.contentWidth` — that cap
  suits stacks of cards, and this screen's picture is its board.
- **Removal is a drag onto the tray, and there is no clear button anywhere she
  can reach.** `resolvePlacedDrop` removes *only* on the tray and otherwise
  puts the sticker back where it was, so an overshoot costs nothing and losing
  one takes a deliberate aim at a target. A `clearCanvas` would be a one-tap
  wipe of an afternoon's work with no confirm she could read; if one is ever
  wanted it goes on `app/dev.tsx`. Taking a placement off never touches
  `album`, which `store.test.ts` asserts — that is what makes the tray safe to
  use as a bin.
- **`resetProgress` does wipe the picture**, wholesale. It is behind the gear
  and a confirm, so nothing she can reach is affected, and a picture surviving
  a wiped album would leave her looking at a dozen stickers with an empty tray
  beside her, unable to place another copy of anything on screen.
- **The tray's drop reaction is the surface language, not an action colour** —
  `surface` → `surfaceRaised`, `surfaceEdge` → `actionEdge`, a small scale bump.
  Coral (`again`) is the tempting choice and would quietly make coral mean two
  things: `theme.actions` is a *button* vocabulary and a drop target is
  feedback, not a control.
- **Pinch and rotate live on the canvas, never on a sticker.** This was a real
  bug and is the kind that reads as "gestures are flaky" rather than as a
  mistake: **a gesture only receives fingers that land inside the view it is
  attached to**, and a sticker is smaller than the gap between two adult
  fingertips, so a pinch attached to one could never start. Up on the canvas
  both fingers land wherever is comfortable, and the ring says which sticker
  they are talking to. The same trap is waiting for any future two-fingered
  gesture on a small target.
- **A ring means "this one", and it is what the two-fingered gestures act on.**
  Tapping a sticker selects it, tapping the picture clears it, and the ring is
  cream — the same one the ground picker uses for the swatch that is chosen, so
  there is one visual language for *selected*. It is never an action colour: a
  ring is a state, not a control. Selection is React state and deliberately not
  stored, because a ring left around a sticker from last week is a state she
  never asked for and cannot clear without knowing it is there.
- **Pinch resizes and two fingers turn**, both committed on gesture end and
  both clamped (`clampScale`, `MIN_SCALE`/`MAX_SCALE`). The ceiling is not
  tidiness: one sticker big enough to cover the picture makes everything under
  it unreachable, and there is no send-to-back she could use to dig it out.
  A pinch re-clamps the position too, so growing one near an edge pulls it back
  on. **A placed sticker's drawn box ignores its scale** — all of it is in the
  transform — which keeps a sticker she has shrunk as easy to grab as one she
  has not.
- **With nothing selected the same pinch zooms the picture, and one finger on
  it pans.** `clampViewport` is what makes that safe: it will not zoom out past
  fit and the pan range falls straight out of the zoom, so at fit the picture
  cannot be nudged off-centre at all and there is no way to end up looking at
  nothing. Zooming is about the focal point rather than the centre, because
  zooming about the centre slides the corner she is pinching out from under
  her. Rotation is left out of this — a crooked frame with no way to say "put
  it back" is exactly the state she cannot recover from.
- **The viewport is never persisted.** Every visit opens at `FIT`, so the worst
  state she can reach is one screen away from being forgotten. It is also why
  it lives in `CanvasRects` beside the measured frames rather than in the
  store.
- **Every drop undoes the viewport, in exactly one place** (`normalise`). A
  placement is stored against the *picture*, never against however she happened
  to be looking at it when she let go. `visibleCentre` is the same rule for
  tap-to-drop: the middle of what she can see, because zoomed into a corner the
  true centre is off screen and the tap reads as a miss.
- **The floating picker is a sibling of the canvas, not a child of it.** Same
  reason the board's overlays sit next to `Board` rather than inside
  `BoardFrame`: the canvas clips, and everything inside it rides the viewport
  transform — a control that zoomed with the artwork would be unusable the
  moment she pinched.
- **The grounds are drawn in `canvasBackgrounds.tsx`**, so there is no asset
  and no `ASSETS.md` entry, and `canvasGrounds` in `theme.ts` holds their
  colours under the same licence the ribbons have: decorative, never actions.
  A swatch is the scene drawn small, which is the whole affordance — what she
  presses is a miniature of what she gets, and no word is involved. The night
  sky's stars are cream, because a sky of gold dots would compete with the
  stars that mean *reward*.
- **Closed, the picker is the ground she is on; open, it is all seven.** That
  is how it shuts without inventing a close button — the control and the thing
  it shows are one object, so there is nothing extra to find. Choosing closes
  it, including choosing the one she is already on, which is how she backs out.
  It sits on a plum shell so it reads as a tool laid over the picture, and so
  that a cream ring does not vanish against the cream ground.
- **The canvas is bright, and it is the only place besides the board where the
  dark-chrome rule bends.** A canvas is the thing being looked at, so it is lit
  like the board is and everything around it stays plum.

### The drag

This is the app's only drag, and `src/ui/canvasGeometry.ts` exists so that the
rules deciding it are pure and tested rather than buried in a gesture callback.
Every function there is `'worklet'`-marked, so the *same* code runs on the UI
thread and in vitest.

- **One ghost for the whole screen** (`DragGhost`), not one per item. Both the
  tray and the canvas clip their children, so a ghost inside either is sliced
  off at the edge exactly as it starts to travel — and one ghost means the two
  drag sources share a single code path.
- **`activateAfterLongPress` is what lets the tray both scroll and be dragged
  from, and it must not be given a `minDistance`.** Any minimum distance makes
  the pan activate on movement, which steals every scroll; with the hold as the
  only way in, moving first *fails* the pan and hands the flick back to the
  `ScrollView`. Do not declare `simultaneousWithExternalGesture` (the tray
  would scroll while she drags) or `blocksExternalGesture` (every scroll waits
  out the hold).
- **`Gesture.Exclusive(pan, tap)`, never `Race`** — a `Tap` activates on
  touch-down and would win a race before the hold timer fired. The tap needs an
  explicit `maxDistance`: a `Tap` has no distance limit by default, so a flick
  that scrolled would still end as a tap and drop a sticker she never asked
  for. The tap path is also the only screen-reader-operable way to place one,
  so it is not redundant with the drag and must not be dropped as such.
- **`onFinalize`, not `onEnd`, resets the drag state.** A pan the `ScrollView`
  cancels never ends, and a cancel that skipped the reset strands the ghost on
  screen.
- **One store write per gesture, in `onEnd`.** Committing mid-drag re-renders
  the canvas under the finger, and a re-render that remounts a gesture's host
  view cancels the gesture outright on Android. Everything that moves lives in
  shared values (`dragState.ts`).
- **What is *held* is React state; only where it is lives on the UI thread.**
  This is the fix for the drag that flicked: whether a sticker is in the air
  decides two things that must change in the same breath — the ghost
  disappearing and the placement re-appearing where she left it. Driven from a
  shared value those land on different frames, and she watches the sticker snap
  back to where it started before jumping to where she put it. So every drop
  handler **clears `held` in the same JS tick as the store write** (see
  `app/(tabs)/stickers.tsx`), React renders both at once, and nothing moves
  twice. For the same reason the ghost is mounted and unmounted rather than
  faded, and the hidden placement uses a plain `opacity` prop rather than an
  animated style.
- **`maxPointers(1)` on the one-finger pans, and a small `minDistance`.** The
  first keeps a second finger out of them so the canvas's pinch can have it;
  the second stops the first finger down lifting a sticker before the second
  finger arrives, which would make every pinch start with a flinch.
  `Gesture.Simultaneous(pinch, rotation)` — sizing and turning are one
  two-fingered act, and making her choose between them means neither works.
- **Layering does the work gesture relations would otherwise have to.** The
  canvas backdrop is a full-size view *under* the placed stickers, so a tap on
  a sticker never reaches it and a tap on the picture never reaches a sticker —
  which is how "tap away to deselect" and the viewport pan both work without a
  single `requireExternalGestureToFail` against a list of children that changes
  every time she places something.
- **Rects come from `measure()` in the gesture worklet, not `onLayout`**, taking
  `pageX/pageY` — `onLayout` is parent-relative and a drop point arrives in
  window coordinates. `rects.sync()` re-reads all three at the start of every
  drag, so nothing is stale after a scroll or a rotation, and `measure` returns
  `null` for an unlaid-out view, which `hitTest` treats as "never hit".
- **`scheduleOnRN`, not `runOnJS`.** Worklets 0.5 deprecates `runOnJS`, and
  Reanimated's re-export of it is deprecated on top of that.
- **Do not add a `babel.config.js`.** SDK 54's `babel-preset-expo` injects
  `react-native-worklets/plugin` automatically; adding
  `react-native-reanimated/plugin` by hand is the RN-3 instruction and
  double-transforms.

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
  across every piece, with **every fourth one invented** by the generator.
  The authored ones are recorded; the invented ones cannot be, because they
  are not in the catalogue. It advances manually rather than automatically.

**Only one "play forever" button reaches the home screen, and it is Mix.**
The two modes really are different in kind — one replays what she knows, the
other invents — but that distinction was being asked to survive on one piece
versus a row of them, and a four-year-old does not draw it. Rather than teach
the difference, Mix absorbed it: it now serves an invented level every fourth
round, so the variety arrives without a second button to choose between.

**Endless is still its own mode and is not on home.** It lives on the path,
reached by pressing a world's ribbon, where it is *contextual* — pressing that
world plainly means "more of this piece", which is a thing the screen itself
says. That is the difference between the two placements: on the ribbon Endless
is an elaboration of the world she is looking at, and on home it would be a
rival to Mix.

The consequence for the Mix button is that its **row of pieces is no longer
carrying a distinction** — nothing competes with it now. Keep it anyway: it
says "everything you have played", which is still true and still the fastest
way to see the mode's scope without reading.

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

- **Never pass a store action straight to `useEffect`.** `useEffect(bump, [])`
  looks tidy and crashes on unmount with `destroy is not a function`: a zustand
  action returns whatever `set` returns, and React reads an effect's return
  value as its cleanup. Call it inside the effect body —
  `useEffect(() => { bump(); }, [bump])`.
- **Anything mounted beside `<Stack>` needs its own `SafeAreaProvider`.**
  Screens get one from react-navigation; the root-level overlays
  (`StickerChoiceDialog`, `AchievementToasts`) are siblings of the navigator
  and do not, so `app/_layout.tsx` wraps the lot in one explicitly.

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
