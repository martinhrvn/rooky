/**
 * The Queen world — "she is the rook and the bishop at once".
 *
 * Tier 1 replays the two earlier worlds one move at a time (a file, then a
 * diagonal), shows a corner the rook needed two moves for, then starts asking
 * for an ORDER rather than a move: because she reaches almost everything in
 * one hop, the only real difficulty a queen level can carry is planning the
 * route. Every `par` here is the BFS solver's answer, not a guess.
 *
 * Tier 2 keeps the enemies small and still. Guards are knights only — a rook
 * or queen guard also covers every square you would approach it from, which
 * makes the level unwinnable rather than hard.
 *
 * These positions are our own; we follow lichess's Learn teaching order (an
 * idea, freely reusable) but never its level data. See ASSETS.md.
 */

import type { LevelData } from '../../game/types';

export const queenLevels: readonly LevelData[] = [
  {
    id: 'queen-t1-01',
    world: 'queen',
    tier: 1,
    teaches: 'Straight up the file — the rook move, in the queen\'s hands',
    fen: '8/8/8/8/8/8/8/3Q4 w - -',
    stars: 'd6',
    goal: 'collectAllStars',
    par: 1,
    hint: [['d1', 'd6']],
  },
  {
    id: 'queen-t1-02',
    world: 'queen',
    tier: 1,
    teaches: 'The same one-move idea on a slant — the bishop move, same piece',
    fen: '8/8/8/8/8/8/8/2Q5 w - -',
    stars: 'g5',
    goal: 'collectAllStars',
    par: 1,
    hint: [['c1', 'g5']],
  },
  {
    id: 'queen-t1-03',
    world: 'queen',
    tier: 1,
    teaches: 'A corner the rook needed two moves for, taken in one — both powers in one piece',
    fen: '8/8/8/8/8/8/1Q6/8 w - -',
    stars: 'f6',
    goal: 'collectAllStars',
    par: 1,
    hint: [['b2', 'f6']],
  },
  {
    id: 'queen-t1-04',
    world: 'queen',
    tier: 1,
    teaches: 'One star on a line and one on a diagonal, so she has to use both in a row',
    fen: '8/8/8/8/8/8/2Q5/8 w - -',
    stars: 'c6 g2',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'queen-t1-05',
    world: 'queen',
    tier: 1,
    teaches: 'Three stars where grabbing the nearest one first costs an extra move',
    // e4 is the closest star and the wrong one to take first: from e4 she can
    // reach both of the others, but e8 and b4 cannot see each other, so the
    // last leg costs a spare move. Going out to b4 (or up to e8) first keeps
    // e4 as the hinge and finishes in three.
    fen: '8/8/8/8/8/8/8/4Q3 w - -',
    stars: 'e4 e8 b4',
    goal: 'collectAllStars',
    par: 3,
    hint: [['e1', 'b4']],
  },
  {
    id: 'queen-t1-06',
    world: 'queen',
    tier: 1,
    teaches: 'Five stars and a route to find — sliding over a star never collects it',
    // Only b6 is reachable from b1, and from there the loop can be walked in
    // either direction (b6-a6-c8-c3-f6 or b6-f6-c3-c8-a6). Wandering off the
    // loop is what costs moves.
    fen: '8/8/8/8/8/8/8/1Q6 w - -',
    stars: 'b6 f6 c3 c8 a6',
    goal: 'collectAllStars',
    par: 5,
  },

  {
    id: 'queen-t1-07',
    world: 'queen',
    tier: 1,
    teaches: 'Two stars up one file — even the queen has to land on each of them',
    fen: '8/8/8/8/8/8/8/Q7 w - -',
    stars: 'a4 a7',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'queen-t1-08',
    world: 'queen',
    tier: 1,
    teaches: 'A cross around her: the way from one arm to the next is always a diagonal',
    fen: '8/8/8/8/3Q4/8/8/8 w - -',
    stars: 'd6 f4 d2 b4',
    goal: 'collectAllStars',
    par: 4,
  },
  {
    id: 'queen-t1-09',
    world: 'queen',
    tier: 1,
    teaches: 'All four corners, one lap of the board, no move wasted',
    fen: '8/8/8/8/8/8/8/3Q4 w - -',
    stars: 'a1 a8 h8 h1',
    goal: 'collectAllStars',
    par: 4,
  },
  {
    id: 'queen-t1-10',
    world: 'queen',
    tier: 1,
    teaches: 'Six stars in a ring with one in the middle — the middle one is the last, not the first',
    fen: '8/8/8/8/8/8/8/3Q4 w - -',
    stars: 'b3 f3 f7 b7 d5 h1',
    goal: 'collectAllStars',
    par: 6,
  },

  // ── Tier 2: the stars become real pieces and the squares they cover turn
  // red. Nothing black ever moves; you only lose by LANDING somewhere covered.
  {
    id: 'queen-t2-01',
    world: 'queen',
    tier: 2,
    teaches: 'Two loose pawns, neither one protecting the other — only "they bite back" is new',
    fen: '8/8/8/3p4/8/1p6/8/3Q4 w - -',
    goal: 'captureAll',
    par: 2,
    hint: [
      ['d1', 'd5'],
      ['d5', 'b3'],
    ],
  },
  {
    id: 'queen-t2-02',
    world: 'queen',
    tier: 2,
    teaches: 'A knight guards the pawn, so the straight-up-the-file capture loses — take the guard first',
    // The tempting move is d1-d5, which is exactly the move the whole first
    // tier trained. The knight paints eight scattered red squares, which reads
    // as a shape; a rook or queen guard would instead cover every approach to
    // itself and make the level impossible.
    fen: '8/8/8/3p4/5n2/8/8/3Q4 w - -',
    goal: 'captureAll',
    par: 4,
    hint: [
      ['d1', 'f1'],
      ['f1', 'f4'],
    ],
  },
  {
    id: 'queen-t2-03',
    world: 'queen',
    tier: 2,
    teaches: 'Neither pawn is guarded, but the obvious corner to turn on is covered — go round the other way',
    // Both enemies are loose. The knight on f2 covers h1 and d1, so the whole
    // bottom-row route to the h-pawn is mined; the top route through a7 is
    // clean and costs the same.
    fen: '8/7p/8/8/8/8/5n2/Q7 w - -',
    goal: 'captureAll',
    par: 4,
    hint: [
      ['a1', 'a7'],
      ['a7', 'h7'],
    ],
  },
  {
    id: 'queen-t2-04',
    world: 'queen',
    tier: 2,
    teaches: 'One loose pawn and one guarded — the trap is sweeping along the rank and taking the guarded one on the way',
    fen: '8/8/p4p2/3n4/8/8/8/Q7 w - -',
    goal: 'captureAll',
    par: 5,
    hint: [
      ['a1', 'd1'],
      ['d1', 'd5'],
    ],
  },
  {
    id: 'queen-t2-05',
    world: 'queen',
    tier: 2,
    teaches: 'Everything at once: the free pawn is on the way, its neighbour is guarded, and the knight is a detour',
    // a4 falls in one move, and the rank she lands on runs straight into h4 —
    // which the knight on g6 covers. The knight has to die first, and it sits
    // nowhere near either pawn, so the route is the puzzle.
    fen: '8/8/6n1/8/p6p/8/8/Q7 w - -',
    goal: 'captureAll',
    par: 5,
  },
  {
    id: 'queen-t2-06',
    world: 'queen',
    tier: 2,
    teaches: 'The knight guards the pawn from a long way off — take it where it stands',
    fen: '8/8/3p4/8/1n6/8/8/Q7 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'queen-t2-07',
    world: 'queen',
    tier: 2,
    teaches: 'A wall of three pawns: the whole row in front of them is red, and the row behind is not',
    fen: '8/8/8/2ppp3/8/8/8/3Q4 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'queen-t2-08',
    world: 'queen',
    tier: 2,
    teaches: 'One knight guarding both pawns at once — it is the only piece that has to go first',
    fen: '8/1p3p2/8/3n4/8/8/8/3Q4 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'queen-t2-09',
    world: 'queen',
    tier: 2,
    teaches: 'One pawn in the far corner and a knight sitting on every sensible way to it',
    fen: '8/7p/8/8/3n4/8/8/Q7 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'queen-t2-10',
    world: 'queen',
    tier: 2,
    teaches: 'Two corners and a guard in the middle — the order is the whole puzzle',
    fen: '8/p6p/8/3n4/8/8/8/Q7 w - -',
    goal: 'captureAll',
    par: 4,
  },
];
