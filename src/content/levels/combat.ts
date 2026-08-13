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
];
