/**
 * The Mate world — check he cannot answer, and the end of the road.
 *
 * `mateInOne` is the only goal that generates moves rather than reading the
 * position: it asks whether black has any legal reply at all. Stalemate is
 * carefully not a win — trapping a king is not the same as mating him, and a
 * level that accepted it would teach the wrong ending.
 *
 * Every mate here turns on a support piece. That is what makes mate different
 * from check: the mating piece is usually standing somewhere the king covers,
 * and only survives because something of hers is holding it there.
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
];
