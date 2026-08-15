# Play Store listing

The settled facts, so nobody has to remember them, and the copy in one place
where it can be edited like text rather than typed into a web form once.

## App details

| | |
|---|---|
| **App name** | Rooky |
| **Package** | `eu.hrvn.rooky` — permanent, claimed globally, set in `app.json` |
| **Default language** | English (United Kingdom) |
| **Type** | App |
| **Category** | Education |
| **Pricing** | Free, no in-app purchases, no ads |

**App rather than Game** puts Rooky on the Apps tab under Education — a thinner
shelf than the Games tab, which is dominated by monetised titles with marketing
budgets. That is the whole of what the choice decides, and it is **editable
after publishing** (Store settings → Edit, about 24 hours to propagate), unlike
the package name. If browse traffic disappoints, Games → Educational is the
other side of the coin and costs nothing to try.

It does **not** affect Teacher Approved, which covers "apps and games" alike.

**Teacher Approved** (shown in Play Console as *Expert Approved*, under Monitor
and Improve → Policy and Programmes) is the curated Kids tab shelf. Eligibility
comes from participating in **Designed for Families** and passing its
requirements — now folding into the broader Families Policy — not from the store
category. **Submission is automatic**, not something you opt into: a qualifying
title is put forward, and teachers and children's-media specialists rate it on
design, appeal, enrichment and age-appropriateness. The criteria differ per age
group and a title must meet them for *every* age group it declares, which is a
reason not to tick more of them than are true.

**Free with no purchases and no ads is the strongest position under the
Families policy.** The hard part of that policy is the ads SDK allowlist and
the purchase-flow rules, and neither applies here. Combined with no data
collection — there is no network call anywhere in `src/` or `app/` — the Data
Safety form is the shortest one Play accepts.

## Declarations to expect

- **Target audience**: under 5, and 6–8. Both, honestly — the first tester is
  four and the later worlds outlast that. But tick only what is true: Teacher
  Approved judges against every age group declared, so an optimistic extra one
  is a bar to clear rather than a wider net.
- **Families policy**: applies. Expect a slower review than a general app.
- **Content rating**: IARC questionnaire. Everything answers no.
- **Data safety**: no data collected, no data shared. True and checkable.
- **Ads**: none.
- **Privacy policy**: `PRIVACY.md` in this repo, served at
  <https://github.com/martinhrvn/rooky/blob/main/PRIVACY.md> — GitHub renders it
  as a page, which is what Play asks for, and the repo being public is the whole
  of the hosting. Required at a public URL even with nothing collected; Play
  does not accept "not applicable". It must stay reachable without a login, so
  **the repo cannot be made private** while that URL is the one on file.

## Copy

Written from what the app does. Two rules hold this copy together and are the
reason it is not prettier than it is:

**The Play fields are plain text, not Markdown.** `**bold**` pastes as literal
asterisks, so the section headers are bare lines carried by position — no
formatting characters, and no ALL CAPS either, which the metadata policy counts
as "excessive capitalisation" and which is a worse look on a children's app
than a quiet header.

**The copy says "a child", not "she".** The app is written for one four-year-old
and the notes in `AGENTS.md` say so; a store listing is read by every parent
deciding whether it is for *their* child, and a gendered pronoun there quietly
tells half of them it is not.

### Short description — 80 characters max

> Chess for children who cannot read yet. One piece at a time.

60 characters. This is the field Play weighs most in search, and it spends its
words on the one true differentiator — pre-literacy — rather than on "fun" or
"educational", which every competing listing already claims.

### Full description — 4000 characters max

1561 characters. Short on purpose: the opening two lines are what shows before
"Read more" is tapped, and almost nobody taps it.

> Rooky teaches chess to children who are too young to read.
>
> Every control is a picture. Nothing on the playing screen needs a word to
> make sense of it, so a four-year-old can pick it up and start playing without
> an adult reading the buttons out.
>
> One piece at a time
> Six worlds teach a single piece each — how a knight hops, why a bishop never
> leaves its colour — before six more introduce the ideas: taking, protecting,
> check, escaping check, and finishing the game. Nothing is thrown at a child
> all at once.
>
> Getting it wrong costs nothing
> When a piece is taken, the board plays it out and quietly steps back one
> move. There is no losing screen and no scolding, and trying again earns
> rewards of its own, because a child who is frightened of being wrong will not
> attempt the harder puzzle.
>
> Stars, stickers, and things you have done
> Finishing a level earns stars, stars fill a bar, and a full bar buys a
> sticker chosen from three. Achievements reward the pieces a child likes
> playing with, not only forward progress.
>
> Room for more than one child
> Each profile keeps its own progress, its own stickers, and its own
> difficulty. A grown-up can cap how hard the puzzles are allowed to get,
> separately for each child, so an older sibling and a beginner can share one
> device.
>
> No strings
> No adverts. No in-app purchases. No accounts and no sign-in. Rooky works
> entirely offline and needs no internet connection: it collects nothing and
> sends nothing anywhere, because it has nowhere to send it to.
>
> Best for ages 4 to 8, and for anyone learning how the pieces move.

The closing age line is there because the **target-audience declaration says
under 5 and 6–8**, and a listing that contradicts its own declaration is a
review flag. Change both or neither.

## Graphics

| Asset | File | Size |
|---|---|---|
| App icon | `brand/icon-play-store.png` | 512×512 |
| Feature graphic | `brand/feature-graphic.png` | 1024×500 |
| Phone screenshots | **still needed** — at least 2, at most 8 | |
| Tablet screenshots | **deliberately none** — see below | |

Screenshots want the app running on a device, which is also the only way to
check the nav bar and the splash. One session settles all three.

Play needs **two screenshots in total** to publish, and they may all be phone
ones. The 7-inch and 10-inch slots are **not mandatory**; they buy tablet and
Chromebook surfacing, which wants four per class to count for anything. That is
not what this app is for, so they stay empty.

**That decision does not make the app portrait on tablets.** `app.json` sets
`"orientation": "portrait"`, and Expo SDK 54 targets API 36 — where Android 16
**ignores** `screenOrientation`, `resizableActivity` and aspect-ratio limits on
any display at least `sw600dp`. So tablets and unfolded foldables run Rooky
landscape whatever the manifest says and whatever the listing shows, and
`LevelPlayer` sizes the board as `min(width - padding, height * 0.68)` — height
-bound in landscape, so a small board adrift in a wide screen. Three ways out,
none taken yet: the `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` opt-out
(temporary — it stops working at API 37), excluding large screens in the Play
Console device catalogue, or making the layout landscape-aware. **Empty
screenshot slots are not one of them**, which is the whole reason this note
sits here rather than in the graphics table.

If tablet shots are ever wanted, an emulator is not the way — a phone can be
told to report tablet metrics, which needs only `nix-shell -p android-tools`:

```sh
adb shell wm size 1080x1920 && adb shell wm density 280   # sw617dp → 7-inch
adb shell wm size 1440x2560 && adb shell wm density 320   # sw720dp → 10-inch
adb shell am force-stop eu.hrvn.rooky
adb exec-out screencap -p > shot.png
adb shell wm size reset && adb shell wm density reset     # always, or it sticks
```

The densities are picked to land one in each of Play's buckets (7-inch is
sw600–719dp, 10-inch is sw720dp and up). `screencap` writes **RGBA**, and Play
wants 24-bit with no alpha, so every capture needs
`magick shot.png -background '#221A26' -alpha remove -alpha off -strip PNG24:out.png`.
