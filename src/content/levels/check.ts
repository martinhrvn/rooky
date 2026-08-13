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
];
