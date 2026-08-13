/**
 * The Checkmate world — the enemy king, at last.
 *
 * Three goals in one world, in the order they make sense: give check, get out
 * of check, and finish. Black still never replies; each of these is a fact
 * about the position after her move, which is why the solver needs no changes
 * to prove them.
 *
 * The out-of-check levels run under `danger: 'allPieces'` so that leaving the
 * king where he is has a consequence she can watch, rather than a move that
 * simply does not win. The rest do not need it: giving check with a piece that
 * can be taken is already punished by the square she lands on.
 *
 * These positions are our own; see ASSETS.md.
 */

import type { LevelData } from '../../game/types';

export const checkmateLevels: readonly LevelData[] = [
  {
    id: 'checkmate-t2-01',
    world: 'checkmate',
    tier: 2,
    teaches: 'A lone king and a rook: check him from the far end of a line, well out of reach',
    fen: '4k3/8/8/8/8/8/8/R7 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'checkmate-t2-02',
    world: 'checkmate',
    tier: 2,
    teaches: 'The corner square looks like the answer but the knight covers it — check down the file',
    fen: '4k3/2n5/8/8/8/8/8/R7 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'checkmate-t2-03',
    world: 'checkmate',
    tier: 2,
    teaches: 'Her king is on the bishop’s diagonal — one step off it and the check is over',
    fen: '8/8/8/b7/8/8/8/4K3 w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'checkmate-t2-04',
    world: 'checkmate',
    tier: 2,
    teaches: 'Check down the file, and a rook of her own that can step into the way instead',
    fen: '4r3/8/8/8/R7/8/8/4K3 w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'checkmate-t2-05',
    world: 'checkmate',
    tier: 2,
    teaches: 'The back rank: his own pawns are the wall, so the rook only has to arrive',
    fen: '6k1/5ppp/8/8/8/8/8/R7 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'checkmate-t2-06',
    world: 'checkmate',
    tier: 2,
    teaches: 'The queen goes right next to him because her own king is holding her there',
    // The position the whole `capturersOf` rule exists for: b7 is covered by the
    // black king, and he still may not take, because her king defends it.
    fen: 'k7/8/1QK5/8/8/8/8/8 w - -',
    goal: 'mateInOne',
    par: 1,
  },
];
