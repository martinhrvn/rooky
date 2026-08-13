/**
 * The Rook world — the first thing anyone plays.
 *
 * Tier 1 teaches the two axes separately before combining them, then
 * introduces the turn, then multiple stars, then a second rook. Every `par`
 * here is verified against the BFS solver.
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
    teaches: 'Straight up the file — one move, impossible to get wrong',
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
    teaches: 'The same idea sideways, so "lines" is not learned as "upwards"',
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
    teaches: 'The first corner: no single line reaches the star, so it takes two moves',
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
    teaches: 'Two stars, the first one on the way to the second',
    fen: '8/8/8/8/8/8/2R5/8 w - -',
    stars: 'c6 f6',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'rook-t1-05',
    world: 'rook',
    tier: 1,
    teaches: 'A lap of the board — three stars forming a square with the start',
    fen: '8/8/8/8/8/8/8/R7 w - -',
    stars: 'a5 e5 e1',
    goal: 'collectAllStars',
    par: 3,
  },
  {
    id: 'rook-t1-06',
    world: 'rook',
    tier: 1,
    teaches: 'Two rooks, one star each — both pieces are yours to use',
    fen: '8/8/8/8/8/8/8/1R4R1 w - -',
    stars: 'b6 g6',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'rook-t1-07',
    world: 'rook',
    tier: 1,
    teaches: 'A plus shape: every star is one line away, but the order still matters',
    fen: '8/8/8/8/3R4/8/8/8 w - -',
    stars: 'a4 d8 h4 d1',
    goal: 'collectAllStars',
    par: 5,
  },
  {
    id: 'rook-t1-08',
    world: 'rook',
    tier: 1,
    teaches: 'Two stars per rook, so splitting the work beats touring with one',
    fen: '8/8/8/8/8/8/8/R6R w - -',
    stars: 'a5 d5 e3 h3',
    goal: 'collectAllStars',
    par: 4,
  },

  {
    id: 'rook-t1-09',
    world: 'rook',
    tier: 1,
    teaches: 'Corner to corner: three stars round the outside, each one a straight line away',
    fen: '8/8/8/8/8/8/8/R7 w - -',
    stars: 'a8 h8 h1',
    goal: 'collectAllStars',
    par: 3,
  },
  {
    id: 'rook-t1-10',
    world: 'rook',
    tier: 1,
    teaches: 'Three stars and two rooks, so one of them has to make two trips',
    // The counterpart of level 8, where the work split evenly. Here it cannot,
    // and finding which rook is the spare one is the whole level.
    fen: '8/8/8/8/8/8/8/1R4R1 w - -',
    stars: 'b5 g5 d5',
    goal: 'collectAllStars',
    par: 3,
  },

  // ── Tier 2: the stars become real pieces, and the squares they cover are
  // tinted red. Enemies never move; the danger is entirely about where you
  // choose to land.
  {
    id: 'rook-t2-01',
    world: 'rook',
    tier: 2,
    teaches: 'Two loose pawns, neither protecting the other — only "they bite back" is new',
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
    teaches: 'A knight guards the pawn, so the obvious capture loses — take the guard first',
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
    teaches: 'The enemy rook covers every route out of the corner — take it first or strand yourself',
    fen: 'r7/8/8/8/7n/8/8/R7 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'rook-t2-04',
    world: 'rook',
    tier: 2,
    teaches: 'One loose pawn and one guarded — the trap is grabbing the guarded one on the way past',
    fen: '8/8/8/p2p4/5n2/8/8/R7 w - -',
    goal: 'captureAll',
    par: 5,
  },
  {
    id: 'rook-t2-05',
    world: 'rook',
    tier: 2,
    teaches: 'Everything at once: open the board first, then plan the route',
    fen: 'r7/2p5/8/8/7n/8/8/R7 w - -',
    goal: 'captureAll',
    par: 5,
  },
  {
    id: 'rook-t2-06',
    world: 'rook',
    tier: 2,
    teaches: 'Three loose pawns and one route that turns twice and touches all of them',
    fen: '4p3/8/8/8/p3p3/8/8/R7 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'rook-t2-07',
    world: 'rook',
    tier: 2,
    teaches: 'Pawns bite sideways, so the square directly in front of one is the way in',
    // Two pawns side by side paint four red squares and none of them is the
    // square a rook actually wants. The lesson is what pawns do *not* cover.
    fen: '8/8/8/3pp3/8/8/8/R7 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'rook-t2-08',
    world: 'rook',
    tier: 2,
    teaches: 'A bishop guards the pawn down a diagonal — a line a rook can never travel on',
    // A new kind of guard for this world. The bishop covers the pawn and
    // nothing else the rook cares about, so the answer is to take the bishop
    // where it stands rather than to work round the red.
    fen: '8/1b6/8/3p4/8/8/8/R7 w - -',
    goal: 'captureAll',
    par: 4,
  },
  {
    id: 'rook-t2-09',
    world: 'rook',
    tier: 2,
    teaches: 'Both pawns are loose — it is the knight in the middle that mines the short way',
    fen: '8/8/8/2p1p3/8/4n3/8/R7 w - -',
    goal: 'captureAll',
    par: 4,
  },
  {
    id: 'rook-t2-10',
    world: 'rook',
    tier: 2,
    teaches: 'The longest route in the world: a knight to clear first, then a corner and a turn',
    fen: '8/2p5/8/3p4/8/1n6/8/R7 w - -',
    goal: 'captureAll',
    par: 6,
  },
];
