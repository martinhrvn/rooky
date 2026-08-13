/**
 * The Pawn world — the piece whose move and whose capture are different
 * shapes, which is the whole difficulty.
 *
 * Tier 1 spends its levels on that one-way walk: the single step, the double
 * step from home, and — the level everything else leans on — a star sitting on
 * the square the double step JUMPS OVER, so she learns that stars are taken by
 * landing. Tier 2 then splits "forward" from "capture": the enemy directly
 * ahead is the one she cannot touch, and it blocks her too.
 *
 * `pawn-t2-05` is the reason `solve()` branches on promotion at all: a knight
 * gets the rook in two, a queen needs three. `pawn-t2-08` is deliberately the
 * other way round, so the choice reads as a question about the position rather
 * than as "the clever answer is always the knight".
 *
 * Every `par` here is verified against the BFS solver.
 *
 * These positions are our own. We follow the same broad teaching order as
 * lichess's Learn (an idea, freely reusable) but deliberately do not copy its
 * level data, which is AGPL — see ASSETS.md and the plan's licensing section.
 */

import type { LevelData } from '../../game/types';

export const pawnLevels: readonly LevelData[] = [
  {
    id: 'pawn-t1-01',
    world: 'pawn',
    tier: 1,
    teaches: 'One step forward — the pawn only ever walks up the board',
    fen: '8/8/8/8/8/8/4P3/8 w - -',
    stars: 'e3',
    goal: 'collectAllStars',
    par: 1,
    hint: [['e2', 'e3']],
  },
  {
    id: 'pawn-t1-02',
    world: 'pawn',
    tier: 1,
    teaches: 'Three pawns, one star: only the pawn on the star\'s file can ever reach it',
    // Also her first double step — from home, a pawn may go two at once.
    fen: '8/8/8/8/8/8/2P1P1P1/8 w - -',
    stars: 'e4',
    goal: 'collectAllStars',
    par: 1,
    hint: [['e2', 'e4']],
  },
  {
    id: 'pawn-t1-03',
    world: 'pawn',
    tier: 1,
    teaches: 'The big first step jumps OVER a square — stars are only picked up by landing',
    fen: '8/8/8/8/8/8/4P3/8 w - -',
    stars: 'e3 e4',
    goal: 'collectAllStars',
    par: 2,
    hint: [
      ['e2', 'e3'],
      ['e3', 'e4'],
    ],
  },
  {
    id: 'pawn-t1-04',
    world: 'pawn',
    tier: 1,
    teaches: 'One star wants the double step, the other wants a single — swapping them costs a move',
    fen: '8/8/8/8/8/8/3P2P1/8 w - -',
    stars: 'd4 g3',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'pawn-t1-05',
    world: 'pawn',
    tier: 1,
    teaches: 'A pawn with a friend right in front of it cannot move at all — the front pawn goes',
    fen: '8/8/8/8/8/1P6/1P6/8 w - -',
    stars: 'b5',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'pawn-t1-06',
    world: 'pawn',
    tier: 1,
    teaches: 'The march to the far end, where the pawn turns into a big piece',
    fen: '8/8/8/4P3/8/8/8/8 w - -',
    stars: 'e6 e7 e8',
    goal: 'collectAllStars',
    par: 3,
  },

  {
    id: 'pawn-t1-07',
    world: 'pawn',
    tier: 1,
    teaches: 'Two pawns, three stars: one walks twice and the other takes its big step',
    fen: '8/8/8/8/8/8/3P1P2/8 w - -',
    stars: 'd3 d4 f4',
    goal: 'collectAllStars',
    par: 3,
  },
  {
    id: 'pawn-t1-08',
    world: 'pawn',
    tier: 1,
    teaches: 'Once it has left home the big step is gone, so the rest of the file is one at a time',
    fen: '8/8/8/8/8/8/4P3/8 w - -',
    stars: 'e3 e5 e7',
    goal: 'collectAllStars',
    par: 5,
  },
  {
    id: 'pawn-t1-09',
    world: 'pawn',
    tier: 1,
    teaches: 'Three pawns and three stars, one each — no pawn can ever help its neighbour',
    fen: '8/8/8/8/8/8/2P1P1P1/8 w - -',
    stars: 'c3 e4 g3',
    goal: 'collectAllStars',
    par: 3,
  },
  {
    id: 'pawn-t1-10',
    world: 'pawn',
    tier: 1,
    teaches: 'One pawn nearly home and one just starting — the far one is three moves of walking',
    fen: '8/8/8/1P6/8/8/6P1/8 w - -',
    stars: 'b8 g4',
    goal: 'collectAllStars',
    par: 4,
  },

  // ── Tier 2: real enemies, and the squares they cover tinted red. Enemies
  // never move. Guards are knights and pawns on purpose — a rook or queen
  // guard covers every approach to itself as well, which makes it
  // uncapturable and the level unsolvable. The one rook below is the
  // exception that proves it: a knight steps round its lines.
  {
    id: 'pawn-t2-01',
    world: 'pawn',
    tier: 2,
    teaches: 'The enemy straight ahead cannot be taken and blocks the way — the diagonal one can',
    fen: '8/8/8/8/4n3/3p4/4P3/8 w - -',
    goal: 'captureAll',
    par: 2,
    hint: [
      ['e2', 'd3'],
      ['d3', 'e4'],
    ],
  },
  {
    id: 'pawn-t2-02',
    world: 'pawn',
    tier: 2,
    teaches: 'Two captures in a row, right then left — the pawn zig-zags up the board',
    fen: '8/8/8/8/1n6/2n5/1P6/8 w - -',
    goal: 'captureAll',
    par: 2,
    hint: [
      ['b2', 'c3'],
      ['c3', 'b4'],
    ],
  },
  {
    id: 'pawn-t2-03',
    world: 'pawn',
    tier: 2,
    teaches: 'The knight guards the pawn, so the guard has to go first',
    fen: '8/8/8/3p4/4Pn2/6P1/8/8 w - -',
    goal: 'captureAll',
    par: 2,
    hint: [
      ['g3', 'f4'],
      ['e4', 'd5'],
    ],
  },
  {
    id: 'pawn-t2-04',
    world: 'pawn',
    tier: 2,
    teaches: 'Three pawns but one staircase — only the pawn at the bottom of it can climb',
    fen: '8/8/8/4n3/3n4/2n5/1P3P1P/8 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'pawn-t2-05',
    world: 'pawn',
    tier: 2,
    teaches: 'Becoming a knight beats becoming a queen — it is the only piece that reaches the rook',
    // The point of letting her choose. A knight on e8 forks straight onto d6;
    // a queen has to spend a move sidestepping the rook's lines first, so
    // queening still wins but costs a move and a star.
    fen: '8/4P3/3r4/8/8/8/8/8 w - -',
    goal: 'captureAll',
    par: 2,
  },
  {
    id: 'pawn-t2-06',
    world: 'pawn',
    tier: 2,
    teaches: 'The pawn in front cannot be taken by the pawn it is blocking — its neighbour does it',
    // The two halves of the world in one position: one pawn is stuck because
    // pawns cannot take forwards, and the answer is the pawn beside it, which
    // is attacking that very square.
    fen: '8/8/8/2n5/1p6/PP6/8/8 w - -',
    goal: 'captureAll',
    par: 2,
  },
  {
    id: 'pawn-t2-07',
    world: 'pawn',
    tier: 2,
    teaches: 'A staircase of three: every capture lands her in front of the next one',
    fen: '8/8/8/2n5/1n6/2n5/1P6/8 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'pawn-t2-08',
    world: 'pawn',
    tier: 2,
    teaches: 'This time the queen is the right choice — a knight cannot reach where she needs to go',
    // Deliberately the opposite answer to the level before it. Promotion is a
    // question, not a formality, and the position decides it.
    fen: '8/3P4/1n6/8/8/8/8/8 w - -',
    goal: 'captureAll',
    par: 2,
  },
  {
    id: 'pawn-t2-09',
    world: 'pawn',
    tier: 2,
    teaches: 'Each pawn owns its own two squares, so which one goes where is decided for her',
    fen: '8/8/8/8/1n6/2n4n/1P4P1/8 w - -',
    goal: 'captureAll',
    par: 3,
  },
  {
    id: 'pawn-t2-10',
    world: 'pawn',
    tier: 2,
    teaches: 'Two pawns, two staircases, and one of them climbs three times',
    fen: '8/8/8/4n3/3n4/2p3n1/1P3P2/8 w - -',
    goal: 'captureAll',
    par: 4,
  },
];
