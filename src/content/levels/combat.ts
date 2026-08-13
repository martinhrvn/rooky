/**
 * The Combat world — the two previous worlds at once.
 *
 * The goal is the Capture world's (take everything) and the opening position is
 * the Protect world's (something of hers is already in trouble). So the fastest
 * route to the last enemy is never the right one: it walks off and leaves the
 * threatened piece to be taken. Deal with the threat first, then clear up.
 *
 * These positions are our own; see ASSETS.md.
 */

import type { LevelData } from '../../game/types';

export const combatLevels: readonly LevelData[] = [
  {
    id: 'combat-t2-01',
    world: 'combat',
    tier: 2,
    teaches: 'Taking the bishop saves the knight and starts the job — the far knight can wait',
    // The tempting line is the rook straight across to the knight, which is
    // shorter and loses the knight on e1 on the way.
    fen: '2R5/8/8/8/6n1/2b5/8/4N3 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 3,
  },
  {
    id: 'combat-t2-02',
    world: 'combat',
    tier: 2,
    teaches: 'Her rook is attacked and the pawn is not going anywhere — save first, take second',
    // The knight can take the pawn whenever it likes, which is the trap: doing
    // it on move one leaves the rook on the bishop's diagonal and loses it.
    fen: '8/8/8/3b4/8/2p5/8/1N5R w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 3,
  },
  {
    id: 'combat-t2-03',
    world: 'combat',
    tier: 2,
    teaches: 'Grabbing the pawn walks onto the bishop’s diagonal — take the bishop and it is free',
    // The greedy move is available on move one and looks like progress. It is
    // the same square the bishop is watching, so it costs the rook.
    fen: '8/p7/8/1N6/3b4/8/8/R7 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'combat-t2-04',
    world: 'combat',
    tier: 2,
    teaches: 'One rook attacking two of hers — taking it answers both, and the pawn can wait',
    fen: '3r3R/8/8/5p2/3N4/8/8/8 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'combat-t2-05',
    world: 'combat',
    tier: 2,
    teaches: 'Running from the bishop up the file takes its guard on the way',
    // The knight guards the bishop, so the bishop cannot be taken first — and
    // the square the rook has to run to is the knight's. One move that saves
    // and clears the way at once.
    fen: '8/8/8/8/n7/2b5/8/R7 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 3,
  },
  {
    id: 'combat-t2-06',
    world: 'combat',
    tier: 2,
    teaches: 'The pawn has to go before the knight it guards, and the rook has to get clear first',
    // Three things in order, and none of them is the capture she wants to make.
    fen: '8/8/8/8/4p3/3n4/5R2/8 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 4,
  },
  {
    id: 'combat-t2-07',
    world: 'combat',
    tier: 2,
    teaches: 'Taking sideways is how her pawn gets off the file it is attacked on',
    // Two enemies attack the pawn and one capture answers both: it removes the
    // pawn and leaves the rook's file in the same move.
    fen: '4r3/8/3N4/3p4/4P3/8/8/8 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'combat-t2-08',
    world: 'combat',
    tier: 2,
    teaches: 'A knight is the one attacker her bishop can never take back',
    // A knight always attacks the opposite colour to the square it stands on,
    // so a bishop it is attacking is on a colour the bishop can never reach.
    // The rook has to answer it.
    fen: '8/7p/8/4n3/8/3B4/8/4R3 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'combat-t2-09',
    world: 'combat',
    tier: 2,
    teaches: 'Both of hers can take the knight — so the rook should go and take the rook',
    fen: '8/8/8/8/8/2n5/1B6/2R4r w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'combat-t2-10',
    world: 'combat',
    tier: 2,
    teaches: 'Two of hers on the same diagonal, and only one piece on the board can answer it',
    // The hardest position in the world: the bishop attacks the rook and the
    // knight beside it, so nothing may be left where it is, and only the other
    // knight covers the bishop. Everything after that is clearing up.
    fen: '8/8/8/1p3p2/8/2b5/8/R2NN3 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 4,
  },
];
