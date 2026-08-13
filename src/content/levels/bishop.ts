/**
 * The Bishop world — the piece that can only ever stand on one colour.
 *
 * Tier 1 builds up to that fact rather than announcing it: a single diagonal,
 * then a turn, then a star that is two squares away along a rank and still
 * costs two moves, then two bishops that plainly cannot do each other's job.
 * Every `par` here is verified against the BFS solver.
 *
 * A note on tier 2, because it is not the same problem as the rook's. A bishop
 * can only ever capture on its own colour, so every enemy in these levels
 * stands on that colour — otherwise it could never be taken and the level
 * would be unwinnable. That rules out the rook world's knight guard: a knight
 * always attacks the opposite colour to the square it stands on, so a knight
 * on our colour guards nothing we can reach, and one on the other colour can
 * never be captured. Black pawns are the guard of choice instead — a pawn's
 * two capture squares are the same colour as the pawn itself, so it defends
 * exactly the squares our bishop wants to land on, and only two of them rather
 * than a whole line. An enemy BISHOP would be worse here than the rook the
 * rook world warned about: it covers every diagonal approach to itself, which
 * is precisely the set of squares it could ever be captured from.
 *
 * These positions are our own. We follow the same broad teaching order as
 * lichess's Learn (an idea, freely reusable) but deliberately do not copy its
 * level data, which is AGPL — see ASSETS.md and the plan's licensing section.
 */

import type { LevelData } from '../../game/types';

export const bishopLevels: readonly LevelData[] = [
  {
    id: 'bishop-t1-01',
    world: 'bishop',
    tier: 1,
    teaches: 'One slide along the diagonal — the whole piece in a single move',
    fen: '8/8/8/8/8/8/8/2B5 w - -',
    stars: 'f4',
    goal: 'collectAllStars',
    par: 1,
    hint: [['c1', 'f4']],
  },
  {
    id: 'bishop-t1-02',
    world: 'bishop',
    tier: 1,
    teaches: 'The first turn: the star is on her colour but not on her diagonal',
    fen: '8/8/8/8/8/8/8/5B2 w - -',
    stars: 'h5',
    goal: 'collectAllStars',
    par: 2,
    hint: [
      ['f1', 'e2'],
      ['e2', 'h5'],
    ],
  },
  {
    id: 'bishop-t1-03',
    world: 'bishop',
    tier: 1,
    teaches: 'Two stars on one diagonal — sliding over the first does not collect it',
    fen: '8/8/8/8/8/8/8/1B6 w - -',
    stars: 'd3 g6',
    goal: 'collectAllStars',
    par: 2,
    hint: [['b1', 'd3']],
  },
  {
    id: 'bishop-t1-04',
    world: 'bishop',
    tier: 1,
    teaches: 'A star along the back rank: she must step off the rank to come back to it',
    fen: '5B2/8/8/8/8/8/8/8 w - -',
    stars: 'h8',
    goal: 'collectAllStars',
    par: 2,
    hint: [
      ['f8', 'g7'],
      ['g7', 'h8'],
    ],
  },
  {
    id: 'bishop-t1-05',
    world: 'bishop',
    tier: 1,
    // The point of the world in one position: swap the two jobs over and
    // neither bishop can do the other's, however many moves you give it.
    teaches: "Two bishops, one star each, on opposite colours — neither can do the other's job",
    fen: '8/8/8/8/8/8/8/2B2B2 w - -',
    stars: 'e3 h3',
    goal: 'collectAllStars',
    par: 2,
  },
  {
    id: 'bishop-t1-06',
    world: 'bishop',
    tier: 1,
    teaches: 'Four stars, all one colour: a zig-zag route where every turn has to be planned',
    fen: '8/8/8/8/8/8/8/B7 w - -',
    stars: 'c3 f6 h4 e1',
    goal: 'collectAllStars',
    par: 4,
  },

  // ── Tier 2: the stars become real pieces, and the squares they cover are
  // tinted red. Enemies never move; the danger is entirely about where you
  // choose to land.
  {
    id: 'bishop-t2-01',
    world: 'bishop',
    tier: 2,
    teaches: 'Two loose pawns, neither protecting the other — only "they bite back" is new',
    fen: '8/8/8/8/3p4/8/5p2/B7 w - -',
    goal: 'captureAll',
    par: 2,
    hint: [
      ['a1', 'd4'],
      ['d4', 'f2'],
    ],
  },
  {
    id: 'bishop-t2-02',
    world: 'bishop',
    tier: 2,
    // The knight sits on the bishop's own diagonal, one slide away, and is
    // red. The pawn defending it is reachable from h2 — backwards, and on the
    // other diagonal, which is the move a child does not look for first.
    teaches: 'The knight is one slide away but a pawn defends it — take the defender first',
    fen: '8/8/3p4/2n5/8/8/8/6B1 w - -',
    goal: 'captureAll',
    par: 3,
    hint: [
      ['g1', 'h2'],
      ['h2', 'd6'],
    ],
  },
  {
    id: 'bishop-t2-03',
    world: 'bishop',
    tier: 2,
    // g5 can only be taken from f6, e7, d8 or h6 — and h6 is covered by the
    // pawn itself. So the obvious grab on f4 loses and the route out is
    // backwards to b2 first.
    teaches: 'The defender can only be reached from behind, so the route starts by going backwards',
    fen: '8/8/8/6p1/5n2/8/8/2B5 w - -',
    goal: 'captureAll',
    par: 4,
    hint: [
      ['c1', 'b2'],
      ['b2', 'f6'],
    ],
  },
  {
    id: 'bishop-t2-04',
    world: 'bishop',
    tier: 2,
    teaches: 'One loose knight and one guarded pawn — the trap is taking the guarded one on the way past',
    fen: '8/8/8/8/4p3/3p4/n7/1B6 w - -',
    goal: 'captureAll',
    par: 4,
    hint: [
      ['b1', 'a2'],
      ['a2', 'd5'],
    ],
  },
  {
    id: 'bishop-t2-05',
    world: 'bishop',
    tier: 2,
    teaches: 'Everything at once: the near pawn is guarded, so sail past the wall and unpick it from the far end',
    fen: '8/8/n7/1p6/2p5/8/8/5B2 w - -',
    goal: 'captureAll',
    par: 5,
    hint: [
      ['f1', 'g2'],
      ['g2', 'b7'],
    ],
  },
];
