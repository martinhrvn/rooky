/**
 * The Capture world — the first that is about a position rather than a piece.
 *
 * Every level here runs under `danger: 'allPieces'`, which is the whole point:
 * up to now only the piece she moved could be taken, so the question was always
 * "is that square safe". Here the question becomes "what does this move leave
 * behind", and the answer is sometimes a piece on the other side of the board.
 *
 * The masked-line positions need reading twice before they make sense. A piece
 * can only block a line by standing on it, so a blocker is always itself under
 * attack — that is the warning. Moving it hands over whatever was behind it, so
 * the answer is never to step aside; it is to deal with the piece doing the
 * threatening. See AGENTS.md.
 *
 * These positions are our own. We follow the same broad teaching order as
 * lichess's Learn (an idea, freely reusable) but deliberately do not copy its
 * level data, which is AGPL — see ASSETS.md.
 */

import type { LevelData } from '../../game/types';

export const captureLevels: readonly LevelData[] = [
  {
    id: 'capture-t2-01',
    world: 'capture',
    tier: 2,
    teaches: 'Two pieces, two targets — neither is guarded, so the order does not matter',
    // Deliberately the gentlest possible start: no trap at all, just the new
    // shape of having more than one piece to think about.
    fen: '8/8/8/3p4/8/2p5/8/1N5B w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'capture-t2-02',
    world: 'capture',
    tier: 2,
    teaches: 'The guard has to go first, and only one of her pieces can reach it',
    fen: '8/8/8/p7/2n5/8/4B3/R7 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'capture-t2-03',
    world: 'capture',
    tier: 2,
    teaches: 'A pawn guarding a pawn: take the one behind, and the front one is free',
    fen: '8/8/2p5/3pN3/8/8/8/7B w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'capture-t2-04',
    world: 'capture',
    tier: 2,
    teaches: 'Her bishop is the only thing between the rook and her own rook — so take the rook',
    // The first masked line. Stepping the bishop anywhere loses the rook on a1,
    // and every square it could step to looks perfectly safe, which is exactly
    // the habit this world exists to break.
    fen: 'r7/8/1N6/8/B7/8/8/R7 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 1,
  },
];
