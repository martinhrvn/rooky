import { describe, expect, it } from 'vitest';

import { findPieces, parseFen, pieceAt } from '../chess/board';
import { parseSquare, parseSquares, squareName } from '../chess/types';
import { toLevel } from '../game/engine';
import { solve } from '../game/solver';
import type { LevelData } from '../game/types';
import { WORLDS, tierLevels } from './index';
import { mirrorFen, mirrorLevel, mirrorSquare } from './mirror';

const sample: LevelData = {
  id: 'sample',
  world: 'rook',
  tier: 2,
  teaches: 'test fixture',
  fen: '8/8/8/3p4/5n2/8/8/3R4 w - -',
  goal: 'captureAll',
  par: 4,
  hint: [
    ['d1', 'd4'],
    ['d4', 'f4'],
  ],
};

describe('mirrorSquare', () => {
  it('flips files and leaves ranks alone', () => {
    expect(squareName(mirrorSquare(parseSquare('a1')))).toBe('h1');
    expect(squareName(mirrorSquare(parseSquare('h8')))).toBe('a8');
    expect(squareName(mirrorSquare(parseSquare('c6')))).toBe('f6');
  });

  it('is its own inverse', () => {
    for (let sq = 0; sq < 64; sq++) {
      expect(mirrorSquare(mirrorSquare(sq))).toBe(sq);
    }
  });
});

describe('mirrorFen', () => {
  it('moves every piece to the mirrored square, keeping its colour and type', () => {
    const board = parseFen(mirrorFen(sample.fen)).board;
    expect(pieceAt(board, parseSquare('e1'))).toMatchObject({ color: 'w', type: 'r' });
    expect(pieceAt(board, parseSquare('e5'))).toMatchObject({ color: 'b', type: 'p' });
    expect(pieceAt(board, parseSquare('c4'))).toMatchObject({ color: 'b', type: 'n' });
    expect(findPieces(board)).toHaveLength(3);
  });

  it('round-trips', () => {
    expect(mirrorFen(mirrorFen(sample.fen))).toBe(sample.fen);
  });
});

describe('mirrorLevel', () => {
  const mirrored = mirrorLevel(sample, 3, 'sample-t3');

  it('takes the new id and tier', () => {
    expect(mirrored.id).toBe('sample-t3');
    expect(mirrored.tier).toBe(3);
  });

  it('mirrors the hint along with the position', () => {
    expect(mirrored.hint).toEqual([
      ['e1', 'e4'],
      ['e4', 'c4'],
    ]);
  });

  it('mirrors stars', () => {
    const withStars = mirrorLevel({ ...sample, stars: 'a1 c6' }, 3, 'x');
    expect(parseSquares(withStars.stars!).map(squareName).sort()).toEqual(['f6', 'h1']);
  });

  it('keeps par, because a mirrored position is the same puzzle', () => {
    expect(solve(toLevel(mirrored))!.length).toBe(sample.par);
  });

  it('leaves the goal and everything else untouched', () => {
    expect(mirrored.goal).toBe(sample.goal);
    expect(mirrored.world).toBe(sample.world);
  });
});

describe('derived tier 3', () => {
  const rook = WORLDS.find((w) => w.key === 'rook')!;

  it('produces one tier-3 level per tier-2 level', () => {
    expect(tierLevels(rook, 3)).toHaveLength(tierLevels(rook, 2).length);
  });

  it('is genuinely a different board, so she cannot replay from memory', () => {
    const tier2 = tierLevels(rook, 2);
    const tier3 = tierLevels(rook, 3);
    tier2.forEach((level, i) => {
      expect(tier3[i].fen).not.toBe(level.fen);
      expect(tier3[i].par).toBe(level.par);
    });
  });
});
