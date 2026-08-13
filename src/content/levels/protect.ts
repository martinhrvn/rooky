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
  {
    id: 'protect-t2-05',
    world: 'protect',
    tier: 2,
    teaches: 'A rook down the file her pawn cannot leave, so the knight has to go and take it',
    // The one threat a pawn can never walk out of: pushing keeps it on the
    // same file, and there is nothing on its capture squares. Every move but
    // the knight's loses it.
    fen: '4r3/8/3N4/8/4P3/8/8/8 w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'protect-t2-06',
    world: 'protect',
    tier: 2,
    teaches: 'The knight attacking her rook has a pawn behind it — taking back is the trap',
    fen: '8/8/8/8/3p4/2n5/4R3/8 w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'protect-t2-07',
    world: 'protect',
    tier: 2,
    teaches: 'One bishop attacking two of hers at once — moving either one loses the other',
    // Neither of the two can answer it: a rook is never on a line with the
    // bishop attacking it, so the third piece has to do the work.
    fen: '8/6N1/8/8/3b4/1N6/8/R7 w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'protect-t2-08',
    world: 'protect',
    tier: 2,
    teaches: 'Running away and taking something can be the same move',
    fen: '8/8/8/5p2/r2N4/8/8/8 w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'protect-t2-09',
    world: 'protect',
    tier: 2,
    teaches: 'Two enemies aiming at the same rook, so one move has to answer both',
    // Taking the rook is also stepping off the bishop's diagonal, which is why
    // it works. Anything that only deals with one of them still loses her rook.
    fen: '3r4/6b1/8/8/3R4/8/8/8 w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'protect-t2-10',
    world: 'protect',
    tier: 2,
    teaches: 'Three of hers on the board and only the pawn is in trouble — and it can only go forward',
    // The pair of protect-t2-05: the same rook, the same pawn, and the answer
    // is the opposite one, because this time the attack comes along the rank
    // and one step forward leaves it.
    fen: '8/8/8/P6r/8/8/8/1NB5 w - -',
    goal: 'protect',
    danger: 'allPieces',
    par: 1,
  },
];
