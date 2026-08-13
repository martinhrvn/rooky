/**
 * The Mate world — check he cannot answer, and the end of the road.
 *
 * `mateInOne` is the only goal that generates moves rather than reading the
 * position: it asks whether black has any legal reply at all. Stalemate is
 * carefully not a win — trapping a king is not the same as mating him, and a
 * level that accepted it would teach the wrong ending.
 *
 * Every mate here turns on someone else covering the squares he would run to.
 * That is what makes mate different from check, and it comes from one of two
 * places: a piece of hers holding the mating piece where the king could
 * otherwise take it, or his own pieces standing on his last free squares. The
 * back rank and the smothered mate are the second kind — she supplies only the
 * check.
 *
 * These positions are our own; see ASSETS.md.
 */

import type { LevelData } from '../../game/types';

export const mateLevels: readonly LevelData[] = [
  {
    id: 'mate-t2-01',
    world: 'mate',
    tier: 2,
    teaches: 'The back rank: his own pawns are the wall, so the rook only has to arrive',
    fen: '6k1/5ppp/8/8/8/8/8/R7 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mate-t2-02',
    world: 'mate',
    tier: 2,
    teaches: 'One rook holds the row below and the other arrives on the top — the ladder',
    fen: '6k1/R7/8/8/8/8/8/1R6 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mate-t2-03',
    world: 'mate',
    tier: 2,
    teaches: 'The queen goes right next to him, because her own king is holding her there',
    // The position the `capturersOf` rule exists for: b7 is covered by the
    // black king and he still may not take, because her king defends it.
    fen: 'k7/8/1QK5/8/8/8/8/8 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mate-t2-04',
    world: 'mate',
    tier: 2,
    teaches: 'Her king holds the three squares in front of his, and the rook takes the row',
    // The first mate every player is taught, and the clearest statement of what
    // mate is made of: someone gives the check, someone else takes the squares.
    fen: '4k3/8/4K3/8/8/8/8/R7 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mate-t2-05',
    world: 'mate',
    tier: 2,
    teaches: 'His own pieces have taken every square he could run to — the knight only arrives',
    // The one mate where none of the work is hers. Nothing black can reach the
    // knight either: his rook does not cover it and his pawns take the other
    // way.
    fen: '6rk/6pp/3N4/8/8/8/8/8 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mate-t2-06',
    world: 'mate',
    tier: 2,
    teaches: 'The rook has the file beside him already, so the bishop comes down the long diagonal',
    fen: '7k/7p/8/8/8/8/8/2B3R1 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mate-t2-07',
    world: 'mate',
    tier: 2,
    teaches: 'The knight covers his one flight square, so the rook can check from the side',
    fen: '6rk/8/R7/5N2/8/8/8/8 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mate-t2-08',
    world: 'mate',
    tier: 2,
    teaches: 'His rook is the only thing holding the row — taking it is the mate',
    // mate-t2-01 with one piece in the way, so the mating move is a capture.
    // Everything else about the position is the same, which is the point.
    fen: 'r5k1/5ppp/8/8/8/8/8/R7 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mate-t2-09',
    world: 'mate',
    tier: 2,
    teaches: 'A pawn holds the square beside him just as well as a king would',
    fen: '7k/8/5P2/8/8/8/8/6Q1 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mate-t2-10',
    world: 'mate',
    tier: 2,
    teaches: 'Her pawn turns into a queen on the last step, and the new queen is the mate',
    // The pawn world's promotion and this world's back rank in one move. A rook
    // mates here too, which is worth knowing and costs nothing: the solver
    // branches over all four choices and par is 1 either way.
    fen: '7k/5Ppp/8/8/8/8/8/8 w - -',
    goal: 'mateInOne',
    par: 1,
  },
];
