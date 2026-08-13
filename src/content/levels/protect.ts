/**
 * The Protect world — one of hers is in trouble before she has moved at all.
 *
 * The level is over the moment nothing of hers can be taken, which usually
 * gives two right answers: move it out of the way, or take the thing after it.
 * That is deliberate. There is no single line to memorise, so the hint here
 * shows the threat rather than the move, and `par` is nearly always 1 — the
 * difficulty is in seeing *which* piece is in trouble, not in counting moves.
 *
 * These positions are our own; see ASSETS.md.
 */

import type { LevelData } from '../../game/types';

export const protectLevels: readonly LevelData[] = [
  {
    id: 'protect-t2-01',
    world: 'protect',
    tier: 2,
    teaches: 'A bishop down the long diagonal: the knight only has to step off it',
    fen: '8/8/8/8/8/2b5/8/4N3 w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'protect-t2-02',
    world: 'protect',
    tier: 2,
    teaches: 'The pawn is blocked and cannot run, but it can take the bishop attacking it',
    fen: '8/8/8/4pb2/4P3/8/8/8 w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'protect-t2-03',
    world: 'protect',
    tier: 2,
    teaches: 'A queen covers six of the knight’s eight squares — only the far side is out of reach',
    // The one level here where "move it somewhere" is genuinely hard. The
    // queen sitting straight in front of the knight takes the whole rank and
    // both diagonals with it, so every square that feels like an escape is
    // still hers. Only c2 and e2, behind the knight, are safe.
    fen: '8/8/8/3q4/3N4/8/8/8 w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'protect-t2-04',
    world: 'protect',
    tier: 2,
    teaches: 'Two of hers and only one in danger — moving the safe one loses the other',
    fen: '8/8/8/3b4/8/8/8/1N5R w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
];
