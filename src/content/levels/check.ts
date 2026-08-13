/**
 * The Check world — the enemy king, and how to reach him.
 *
 * The first of three, and the only one that is purely about aim: put him under
 * attack, from somewhere he cannot answer. Black never replies, so "check" is
 * simply a fact about the position after her move; staying safe while doing it
 * is the danger rule's job, not the goal's.
 *
 * The shape every level here is built on: the square right next to the king
 * usually gives check *and* loses the piece, because the king covers it. The
 * answer is nearly always further away.
 *
 * These positions are our own; see ASSETS.md.
 */

import type { LevelData } from '../../game/types';

export const checkLevels: readonly LevelData[] = [
  {
    id: 'check-t2-01',
    world: 'check',
    tier: 2,
    teaches: 'A lone king and a rook: check him from the far end of a line, well out of reach',
    fen: '4k3/8/8/8/8/8/8/R7 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'check-t2-02',
    world: 'check',
    tier: 2,
    teaches: 'The corner square looks like the answer but the knight covers it — check down the file',
    fen: '4k3/2n5/8/8/8/8/8/R7 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'check-t2-03',
    world: 'check',
    tier: 2,
    teaches: 'A bishop reaches him down the long diagonal — the square beside him is the trap',
    // f7 gives check too, and the king simply takes it. The whole point of the
    // level is that the tempting square and the right square both give check.
    fen: '4k3/8/8/8/8/1B6/8/8 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'check-t2-04',
    world: 'check',
    tier: 2,
    teaches: 'Two hops check him and his rook covers one of them',
    // A knight checking is never a square the king can answer — a knight's move
    // is never a step. So the only question is which of the two is safe.
    fen: '3r4/8/8/8/4k3/8/8/1N6 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'check-t2-05',
    world: 'check',
    tier: 2,
    teaches: 'A pawn checks him from right beside him, because the knight is holding it there',
    // The one piece that can only ever check from next to him, so it needs the
    // same rule the mate world is built on: he may not take what is defended.
    fen: '8/8/8/3k4/8/N1P5/8/8 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'check-t2-06',
    world: 'check',
    tier: 2,
    teaches: 'Her own pawn is in the way — moving it is what gives the check',
    // The rook never moves and still does the checking. It has to be the rank
    // rather than the file: a pawn walks straight, so it can never step off a
    // line it is standing on lengthways.
    fen: '8/8/8/8/R2P3k/8/8/8 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'check-t2-07',
    world: 'check',
    tier: 2,
    teaches: 'His own pawn blocks the file, so the check has to come along the top row',
    fen: '4k3/4p3/8/8/8/8/8/R7 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'check-t2-08',
    world: 'check',
    tier: 2,
    teaches: 'A bishop never leaves its own colour, so only one of the two can ever reach him',
    // The dark bishop has no move in the whole level that touches him, which is
    // a fact about bishops rather than about this position. The light one has
    // several, and the ones next to him are still traps.
    fen: '8/8/8/3k4/8/8/8/2B2B2 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'check-t2-09',
    world: 'check',
    tier: 2,
    teaches: 'The pawn in the way is the check — take it, and the line is already open',
    fen: '7k/8/8/7p/8/8/8/7R w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'check-t2-10',
    world: 'check',
    tier: 2,
    teaches: 'Four squares check him: the two beside him lose the queen, and so does the pawn’s',
    // The whole world in one position. The queen has more checks than anything
    // else and therefore more ways to be taken for nothing.
    fen: '8/8/6p1/4k3/8/8/8/7Q w - -',
    goal: 'check',
    par: 1,
  },
];
