import { describe } from 'vitest';

import type { LevelData } from '../../game/types';
import { expectWorldLevels } from './validate';

/**
 * The gate, checked against itself.
 *
 * Every other world's test file feeds `expectWorldLevels` real content. This
 * one feeds it the smallest well-formed level of each *new* kind, so the new
 * branches are exercised before any of them has content to guard — and so an
 * author starting a theme world has a worked example of each shape that is
 * known to pass rather than a guess.
 *
 * `world: 'mixed'` keeps these out of the shipped catalogue; they are fixtures,
 * not levels, and nothing imports them.
 */
const FIXTURES: readonly LevelData[] = [
  {
    id: 'mixed-protect',
    world: 'mixed',
    tier: 2,
    teaches: 'One rook attacked by another: step off the line, or take the thing attacking you',
    fen: 'r7/8/8/8/8/8/8/R7 w - -',
    goal: 'protect',
    par: 1,
  },
  {
    id: 'mixed-escape',
    world: 'mixed',
    tier: 2,
    teaches: 'Check down an open file, with four squares off it and one fatal one along it',
    fen: '4r3/8/8/8/8/8/8/4K3 w - -',
    goal: 'escapeCheck',
    par: 1,
  },
  {
    id: 'mixed-check',
    world: 'mixed',
    tier: 2,
    teaches: 'Reaching a lone king with a rook — two ways in, and neither is next to him',
    fen: '4k3/8/8/8/8/8/8/R7 w - -',
    goal: 'check',
    par: 1,
  },
  {
    id: 'mixed-mate',
    world: 'mixed',
    tier: 2,
    teaches: 'The back rank: his own pawns are the wall, and the rook only has to arrive',
    fen: '6k1/5ppp/8/8/8/8/8/R7 w - -',
    goal: 'mateInOne',
    par: 1,
  },
  {
    id: 'mixed-discovery',
    world: 'mixed',
    tier: 2,
    // The bishop on a4 masks the black rook's line to a1 and is itself attacked
    // because of it. Moving it anywhere hands over the rook behind; the knight
    // taking on a8 answers both threats at once.
    teaches: 'Moving the piece in the way is what loses — take the rook instead of stepping aside',
    fen: 'r7/8/1N6/8/B7/8/8/R7 w - -',
    goal: 'captureAll',
    danger: 'allPieces',
    par: 1,
  },
];

describe('the gate accepts a minimal level of every kind', () => {
  expectWorldLevels('fixtures', FIXTURES);
});
