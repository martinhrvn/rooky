/**
 * The Rook world — the first thing anyone plays.
 *
 * Tier 1 teaches the two axes separately before combining them, then
 * introduces the turn, then multiple stars, then a second rook. Every `par`
 * here is verified against the BFS solver in `levels.test.ts`.
 *
 * These positions are our own. We follow the same broad teaching order as
 * lichess's Learn (an idea, freely reusable) but deliberately do not copy its
 * level data, which is AGPL — see ASSETS.md and the plan's licensing section.
 */

import type { LevelData } from '../../game/types';

export const rookLevels: readonly LevelData[] = [
  {
    id: 'rook-t1-01',
    world: 'rook',
    tier: 1,
    // Straight up the file. One move, impossible to get wrong.
    fen: '8/8/8/8/8/8/8/4R3 w - -',
    stars: 'e5',
    goal: 'collectAllStars',
    par: 1,
    hint: [['e1', 'e5']],
  },
  {
    id: 'rook-t1-02',
    world: 'rook',
    tier: 1,
    // The same idea sideways, so "lines" doesn't get learned as "upwards".
    fen: '8/8/8/8/8/R7/8/8 w - -',
    stars: 'h3',
    goal: 'collectAllStars',
    par: 1,
    hint: [['a3', 'h3']],
  },
  {
    id: 'rook-t1-03',
    world: 'rook',
    tier: 1,
    // First corner: no single line reaches g6, so it takes two.
    fen: '8/8/8/8/8/8/1R6/8 w - -',
    stars: 'g6',
    goal: 'collectAllStars',
    par: 2,
    hint: [
      ['b2', 'b6'],
      ['b6', 'g6'],
    ],
  },
  {
    id: 'rook-t1-04',
    world: 'rook',
    tier: 1,
    // Two stars, and the first one is on the way to the second.
    fen: '8/8/8/8/8/8/2R5/8 w - -',
    stars: 'c6 f6',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'rook-t1-05',
    world: 'rook',
    tier: 1,
    // A lap of the board: three stars that form a square with the start.
    fen: '8/8/8/8/8/8/8/R7 w - -',
    stars: 'a5 e5 e1',
    goal: 'collectAllStars',
    par: 3,
  },
  {
    id: 'rook-t1-06',
    world: 'rook',
    tier: 1,
    // Two rooks, one star each — the point is that both pieces are yours.
    fen: '8/8/8/8/8/8/8/1R4R1 w - -',
    stars: 'b6 g6',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'rook-t1-07',
    world: 'rook',
    tier: 1,
    // A plus shape around the rook: every star is one line away, but the
    // order matters.
    fen: '8/8/8/8/3R4/8/8/8 w - -',
    stars: 'a4 d8 h4 d1',
    goal: 'collectAllStars',
    par: 5,
  },
  {
    id: 'rook-t1-08',
    world: 'rook',
    tier: 1,
    // Two rooks and four stars, laid out as two stars per rook so the clean
    // solution is "each rook does its own pair" rather than one rook touring.
    fen: '8/8/8/8/8/8/8/R6R w - -',
    stars: 'a5 d5 e3 h3',
    goal: 'collectAllStars',
    par: 4,
  },

  // ── Tier 2: the stars become real pieces, and the squares they cover are
  // tinted red. Enemies never move; the danger is entirely about where you
  // choose to land.
  {
    id: 'rook-t2-01',
    world: 'rook',
    tier: 2,
    // Two loose pawns, neither defending the other. Just take them, so the
    // new idea here is only "the stars bite back now".
    fen: '8/8/8/p2p4/8/8/8/R7 w - -',
    goal: 'captureAll',
    par: 2,
    hint: [
      ['a1', 'a5'],
      ['a5', 'd5'],
    ],
  },
  {
    id: 'rook-t2-02',
    world: 'rook',
    tier: 2,
    // The pawn on d5 is guarded by the knight on f4, so the obvious capture
    // straight down the file loses. Take the guard first.
    //
    // The guard is a knight rather than a rook on purpose: a knight paints
    // eight scattered red squares, which reads as a shape. A rook guard would
    // tint two entire lines — and worse, would cover every approach to itself,
    // making it uncapturable. The solver caught exactly that.
    fen: '8/8/8/3p4/5n2/8/8/3R4 w - -',
    goal: 'captureAll',
    par: 4,
    hint: [
      ['d1', 'd4'],
      ['d4', 'f4'],
    ],
  },
  {
    id: 'rook-t2-03',
    world: 'rook',
    tier: 2,
    // The black rook covers the whole a-file and the whole eighth rank, which
    // is every route out of the corner. Take the knight first and you strand
    // yourself with nowhere safe to stand — this one has to be taken in order.
    fen: 'r7/8/8/8/7n/8/8/R7 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'rook-t2-04',
    world: 'rook',
    tier: 2,
    // Level one's two loose pawns, now with a knight guarding the far one.
    // The near pawn is free the whole time, so the trap is grabbing the
    // guarded one on the way past.
    fen: '8/8/8/p2p4/5n2/8/8/R7 w - -',
    goal: 'captureAll',
    par: 5,
  },
  {
    id: 'rook-t2-05',
    world: 'rook',
    tier: 2,
    // Everything at once: the rook has to go first to open the board up, and
    // the remaining two are then a route-planning problem.
    fen: 'r7/2p5/8/8/7n/8/8/R7 w - -',
    goal: 'captureAll',
    par: 5,
  },
];
