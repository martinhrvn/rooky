/**
 * The Knight world — the L-shape, and the thing everyone finds surprising
 * about it.
 *
 * The knight is the only piece whose reach is not a line, so "close" and
 * "few moves" come apart completely. Tier 1 is built around that single
 * shock: level 3 puts a star on the square right next to the knight and it
 * takes THREE moves, while level 4 puts one four squares away and it takes
 * two. Both positions are the same knight on the same square, so the contrast
 * is the lesson.
 *
 * Tier 2 has a constraint no other world has. A white knight can never safely
 * capture a black knight: the square you must jump from is, by definition, a
 * knight's move from your target, which is exactly the set of squares that
 * target covers. So every guard here is a pawn or a bishop — a knight guard
 * would make the level unsolvable. (The rook world can use knight guards
 * precisely because a rook approaches along lines instead.)
 *
 * Every `par` below is the BFS solver's optimum, not a guess.
 *
 * These positions are our own. We follow the same broad teaching order as
 * lichess's Learn (an idea, freely reusable) but deliberately do not copy its
 * level data, which is AGPL — see ASSETS.md and the plan's licensing section.
 */

import type { LevelData } from '../../game/types';

export const knightLevels: readonly LevelData[] = [
  {
    id: 'knight-t1-01',
    world: 'knight',
    tier: 1,
    teaches: 'One hop, so the L is seen once before anything is asked of it',
    fen: '8/8/8/8/8/8/8/1N6 w - -',
    stars: 'c3',
    goal: 'collectAllStars',
    par: 1,
    hint: [['b1', 'c3']],
  },
  {
    id: 'knight-t1-02',
    world: 'knight',
    tier: 1,
    teaches: 'Two hops in a row — the same L twice, so it reads as a repeatable step',
    fen: '8/8/8/8/8/8/8/1N6 w - -',
    stars: 'c3 d5',
    goal: 'collectAllStars',
    par: 2,
    hint: [
      ['b1', 'c3'],
      ['c3', 'd5'],
    ],
  },
  {
    id: 'knight-t1-03',
    world: 'knight',
    tier: 1,
    // The whole game's best surprise, so the board is kept empty: one knight,
    // one star, one square between them and nothing else to look at. A knight
    // can never reach its own neighbour in one move — the L always overshoots,
    // and coming back costs three. Solver-confirmed par 3.
    teaches: 'The neighbour square: one step away, three moves to reach — the L always overshoots',
    fen: '8/8/8/8/3N4/8/8/8 w - -',
    stars: 'd5',
    goal: 'collectAllStars',
    par: 3,
    hint: [
      ['d4', 'e6'],
      ['e6', 'f4'],
    ],
  },
  {
    id: 'knight-t1-04',
    world: 'knight',
    tier: 1,
    // Same knight, same square as level 3. Four squares up is two moves; one
    // square up was three. Distance simply is not how a knight measures.
    teaches: 'The mirror of level 3: four squares away is only two moves, so far is not far',
    fen: '8/8/8/8/3N4/8/8/8 w - -',
    stars: 'd8',
    goal: 'collectAllStars',
    par: 2,
    hint: [['d4', 'e6']],
  },
  {
    id: 'knight-t1-05',
    world: 'knight',
    tier: 1,
    teaches: 'Four stars laid out along one long L-chain — a whole tour with no wasted hop',
    fen: '8/8/8/8/8/8/8/1N6 w - -',
    stars: 'c3 d5 e7 g8',
    goal: 'collectAllStars',
    par: 4,
  },
  {
    id: 'knight-t1-06',
    world: 'knight',
    tier: 1,
    // Two stars sit on each knight's own staircase and nothing bridges the
    // two halves, so four moves is only possible if both knights work.
    teaches: 'Two knights, two stars each — splitting the board beats touring it with one',
    fen: '8/8/8/8/8/8/8/1N4N1 w - -',
    stars: 'c3 d5 e5 f3',
    goal: 'collectAllStars',
    par: 4,
    hint: [
      ['b1', 'c3'],
      ['g1', 'f3'],
    ],
  },

  // ── Tier 2: the stars become real pieces, and every square an enemy covers
  // is tinted red. Enemies never move; you lose only by choosing to land on
  // red. Guards are pawns and bishops throughout — see the note at the top of
  // this file for why a knight can never take a black knight.
  {
    id: 'knight-t2-01',
    world: 'knight',
    tier: 2,
    teaches: 'Two loose pawns on one L-chain — only "they bite back" is new',
    fen: '8/8/8/3p4/8/2p5/8/1N6 w - -',
    goal: 'captureAll',
    par: 2,
    hint: [
      ['b1', 'c3'],
      ['c3', 'd5'],
    ],
  },
  {
    id: 'knight-t2-02',
    world: 'knight',
    tier: 2,
    // Both pawns are one hop from c2. One of them is defended, and the red
    // square says which — the first level where two identical-looking hops
    // have opposite outcomes.
    teaches: 'Both pawns are one hop away, but d4 defends e3 — take the defender first',
    fen: '8/8/8/8/3p4/4p3/2N5/8 w - -',
    goal: 'captureAll',
    par: 3,
    hint: [['c2', 'd4']],
  },
  {
    id: 'knight-t2-03',
    world: 'knight',
    tier: 2,
    // The bishop's two ways in are c3, blocked by its own pawn, and d2, which
    // that same pawn covers. a3 is the only door, and it is not the square a
    // beginner looks at first.
    teaches: 'Only one square attacks the bishop safely — the pawn seals every other approach',
    fen: '8/8/8/8/2N5/2p5/8/1b6 w - -',
    goal: 'captureAll',
    par: 3,
    hint: [['c4', 'a3']],
  },
  {
    id: 'knight-t2-04',
    world: 'knight',
    tier: 2,
    // f4 is one hop from the start and hangs invitingly; e5 defends it. The
    // right first move captures the defender, and from there the loose pawn on
    // d3 is a stepping stone back to f4.
    teaches: 'The nearest pawn is the defended one — the loose pawn on d3 is the way back to it',
    fen: '8/8/6N1/4p3/5p2/3p4/8/8 w - -',
    goal: 'captureAll',
    par: 3,
    hint: [['g6', 'e5']],
  },
  {
    id: 'knight-t2-05',
    world: 'knight',
    tier: 2,
    // A pawn chain: d5 defends c4, c4 defends b3. The order is forced from
    // the top down, and each link is a diagonal step — which for a knight
    // means two hops, not one.
    teaches: 'A defended chain taken from the top down, one diagonal link at a time',
    fen: '8/8/5N2/3p4/2p5/1p6/8/8 w - -',
    goal: 'captureAll',
    par: 5,
    hint: [
      ['f6', 'd5'],
      ['d5', 'e3'],
    ],
  },
];
