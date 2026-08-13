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
];
