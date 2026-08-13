/**
 * The King world — "anywhere, but only one step".
 *
 * The king is the only piece whose reach and whose move are the same size, so
 * every star costs at least one move and distance is felt directly. That is
 * also the design constraint here: stars sit in tight clusters right next to
 * the king, because the move-dot row is read by a child who counts dots rather
 * than numbers, and a star four squares away would blow the row out on its own.
 * No par in this world is above 6.
 *
 * Tier 2 uses only pawns and knights as guards. A rook or queen guard covers
 * every approach square to itself as well as its ward, which makes a
 * one-step-at-a-time piece unable to ever reach it — the solver calls those
 * levels unwinnable, which is exactly what we want it to keep doing.
 *
 * Every `par` below is the BFS solver's optimum, asserted in king.test.ts.
 */

import type { LevelData } from '../../game/types';

export const kingLevels: readonly LevelData[] = [
  {
    id: 'king-t1-01',
    world: 'king',
    tier: 1,
    teaches: 'One step forward — the whole move, with nothing else to think about',
    fen: '8/8/8/8/8/8/8/4K3 w - -',
    stars: 'e2',
    goal: 'collectAllStars',
    par: 1,
    hint: [['e1', 'e2']],
  },
  {
    id: 'king-t1-02',
    world: 'king',
    tier: 1,
    teaches: 'A diagonal step costs the same as a straight one — two stars, two moves either way',
    fen: '8/8/8/8/4K3/8/8/8 w - -',
    stars: 'e5 f5',
    goal: 'collectAllStars',
    par: 2,
    hint: [['e4', 'f5']],
  },
  {
    id: 'king-t1-03',
    world: 'king',
    tier: 1,
    teaches: 'Three stars in a row: one square at a time, so three stars means three moves',
    fen: '8/8/8/8/1K6/8/8/8 w - -',
    stars: 'c4 d4 e4',
    goal: 'collectAllStars',
    par: 3,
  },
  {
    id: 'king-t1-04',
    world: 'king',
    tier: 1,
    teaches: 'Stars curling around the king — walk the ring in order or you pay for doubling back',
    fen: '8/8/8/8/3K4/8/8/8 w - -',
    stars: 'c4 c5 d5 e5',
    goal: 'collectAllStars',
    par: 4,
  },
  {
    id: 'king-t1-05',
    world: 'king',
    tier: 1,
    teaches: 'Two different two-move routes to the same star — neither is more right than the other',
    fen: '8/8/8/8/8/2K5/8/8 w - -',
    stars: 'e4',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'king-t1-06',
    world: 'king',
    tier: 1,
    teaches: 'A six-star block: a snake through it wastes nothing, any zig-zag costs extra',
    fen: '8/8/8/8/8/1K6/8/8 w - -',
    stars: 'c3 c4 d3 d4 e3 e4',
    goal: 'collectAllStars',
    par: 6,
    hint: [
      ['b3', 'c3'],
      ['c3', 'c4'],
    ],
  },

  // ── Tier 2: the stars become real pieces and the squares they cover turn
  // red. Enemies never move; the only way to lose is to step onto red.
  {
    id: 'king-t2-01',
    world: 'king',
    tier: 2,
    teaches: 'Two loose pawns side by side — pawns bite downwards, so the squares above them are safe',
    fen: '8/8/2K5/3pp3/8/8/8/8 w - -',
    goal: 'captureAll',
    par: 2,
    hint: [
      ['c6', 'd5'],
      ['d5', 'e5'],
    ],
  },
  {
    id: 'king-t2-02',
    world: 'king',
    tier: 2,
    teaches: 'A knight guards the pawn: take the guard first, then walk over to the pawn',
    fen: '8/8/8/3p4/5n2/6K1/8/8 w - -',
    goal: 'captureAll',
    par: 3,
    hint: [['g3', 'f4']],
  },
  {
    id: 'king-t2-03',
    world: 'king',
    tier: 2,
    teaches: 'Every square in front of the two pawns is red, so the king has to walk round the side',
    fen: '8/8/8/8/2pp4/8/4K3/8 w - -',
    goal: 'captureAll',
    par: 4,
    hint: [
      ['e2', 'f3'],
      ['f3', 'e4'],
    ],
  },
  {
    id: 'king-t2-04',
    world: 'king',
    tier: 2,
    teaches: 'One guarded pawn and one loose one further off — the guarded one is the trap on the way past',
    fen: '8/8/8/1p1p2K1/5n2/8/8/8 w - -',
    goal: 'captureAll',
    par: 5,
  },
  {
    id: 'king-t2-05',
    world: 'king',
    tier: 2,
    teaches: 'A chain: the pawn guards the knight and the knight guards the pawn, so only one order works',
    fen: '8/8/8/3p2p1/5nK1/8/8/8 w - -',
    goal: 'captureAll',
    par: 4,
  },
];
