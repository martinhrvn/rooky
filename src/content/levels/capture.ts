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
  {
    id: 'capture-t2-05',
    world: 'capture',
    tier: 2,
    teaches: 'One knight guarding both pawns — take the knight and they are both free',
    // The first level where removing one piece changes the status of two
    // others. Either pawn taken first is taken back by the knight.
    fen: '8/8/8/3n4/Rp3p2/8/8/7B w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 3,
  },
  {
    id: 'capture-t2-06',
    world: 'capture',
    tier: 2,
    teaches: 'Three pawns down one diagonal, each guarding the one in front — start at the back',
    // The bishop is on their diagonal, so the near pawn is the one it can
    // reach — and the one that is guarded. Coming at the chain from the far
    // end is the whole answer.
    fen: 'B7/8/2p5/3p4/4p3/8/8/8 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 3,
  },
  {
    id: 'capture-t2-07',
    world: 'capture',
    tier: 2,
    teaches: 'The bishop shielding her rook is also the one that can go and take the attacker',
    // The other half of capture-t2-04: there the masking piece could not reach
    // the enemy and a second piece had to. Here the masker answers both threats
    // itself, which is the move that looks least likely — it steps out of the
    // way *towards* the thing threatening it.
    fen: '7b/8/8/4B3/8/8/8/R7 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'capture-t2-08',
    world: 'capture',
    tier: 2,
    teaches: 'Taking the pawn opens the file behind it, onto the square she just took it from',
    // Nothing guards the pawn, so the red squares say the capture is safe — and
    // it is, until the pawn is gone and the rook behind it can see that far.
    fen: '2r5/8/3N4/8/2p5/8/8/2R5 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'capture-t2-09',
    world: 'capture',
    tier: 2,
    teaches: 'Her pawn takes to the side — but only once the pawn guarding the knight is gone',
    fen: '8/8/2p5/N2n4/4P3/8/8/8 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 2,
  },
  {
    id: 'capture-t2-10',
    world: 'capture',
    tier: 2,
    teaches: 'A pawn guards the knight and the knight guards a pawn — three, in one order only',
    // The knight is the middle of the chain, so only the bishop can take it:
    // a white knight can never capture a black one, and the rook is busy at
    // both ends of the line.
    fen: '8/8/8/1p2p3/2n5/8/B7/1R6 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 3,
  },
];
