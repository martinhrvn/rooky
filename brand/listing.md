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

**These are drafts.** They are written from what the app does rather than from
anything you have said you want it to sound like — go through them.

### Short description — 80 characters max

> Chess for children who cannot read yet. One piece at a time.

(60 characters.)

### Full description — 4000 characters max

> Rooky teaches chess to children who are too young to read.
>
> Every control is a picture. Nothing on the playing screen needs a word to
> make sense of it, so a four-year-old can pick it up and start without an
> adult reading the buttons out.
>
> **One piece at a time.** Six worlds teach a single piece each — how a knight
> hops, why a bishop never leaves its colour — before six more introduce the
> ideas: taking, protecting, check, escaping, and finishing the game. Nothing
> is thrown at her all at once.
>
> **Getting it wrong costs nothing.** When a piece is taken, the board plays it
> out and steps back one move. There is no losing screen and no scolding, and
> the failures earn rewards of their own, because a child who is frightened of
> being wrong will not try the harder puzzle.
>
> **Stars, stickers and things you have done.** Finishing a level earns stars;
> stars fill a bar; a full bar buys a sticker she chooses herself from three.
> Achievements reward the pieces she likes rather than only forward progress.
>
> **For more than one child.** Each profile keeps its own progress, its own
> stickers and its own difficulty, and a grown-up can cap how hard the puzzles
> are allowed to get, per child.
>
> No adverts. No in-app purchases. No accounts, no sign-in, and no internet
> connection — Rooky collects nothing and sends nothing anywhere, because it
> has nowhere to send it to.

## Graphics

| Asset | File | Size |
|---|---|---|
| App icon | `brand/icon-play-store.png` | 512×512 |
| Feature graphic | `brand/feature-graphic.png` | 1024×500 |
| Phone screenshots | **still needed** — at least 2, at most 8 | |

Screenshots want the app running on a device, which is also the only way to
check the nav bar and the splash. One session settles all three.
