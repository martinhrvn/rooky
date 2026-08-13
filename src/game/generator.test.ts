import { describe, expect, it } from 'vitest';

import { attackers } from '../chess/attacks';
import { findPieces, parseFen } from '../chess/board';
import { type PieceType, squareName } from '../chess/types';
import { applyMove, startLevel } from './engine';
import { generateLevel, generateLevelOrEasier } from './generator';
import { hashString, makeRng, sample } from './random';
import { solve } from './solver';

const gen = (piece: PieceType, difficulty: number, seed: number) =>
  generateLevelOrEasier({
    world: 'rook',
    piece,
    tier: 1,
    difficulty,
    rng: makeRng(seed),
    index: 0,
  });

describe('seeded rng', () => {
  it('is reproducible from a seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces different streams for different seeds', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });

  it('stays inside [0, 1)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 500; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('samples distinct items and never over-draws a small pool', () => {
    const picked = sample(makeRng(3), [1, 2, 3], 10);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });

  it('hashes same-length strings apart', () => {
    // 'rook', 'king' and 'pawn' are all four characters, so seeding off the
    // length alone would give three worlds the same level stream.
    const seeds = ['rook', 'king', 'pawn'].map(hashString);
    expect(new Set(seeds).size).toBe(3);
  });
});

describe('generateLevel', () => {
  // Every piece that has a world, so a future Endless button can't ship
  // pointing at a piece the generator silently can't fill.
  const pieces: PieceType[] = ['r', 'b', 'q', 'k', 'n', 'p'];

  it.each(pieces)('produces a winnable level for %s', (piece) => {
    const level = gen(piece, 2, 11);
    expect(level, `no level generated for ${piece}`).not.toBeNull();
    expect(solve(level!)).not.toBeNull();
  });

  it.each(pieces)('reports a truthful par for %s', (piece) => {
    const level = gen(piece, 2, 23)!;
    expect(solve(level)!.length).toBe(level.par);
  });

  it('places the requested number of stars, none of them under a piece', () => {
    const level = gen('r', 4, 5)!;
    const { board } = parseFen(level.fen);
    expect(level.stars.length).toBeGreaterThanOrEqual(2);
    for (const star of level.stars) {
      expect(board[star]).toBeNull();
    }
  });

  it('uses a single piece, which is what keeps generation cheap', () => {
    expect(findPieces(parseFen(gen('r', 8, 9)!.fen).board, 'w')).toHaveLength(1);
  });

  it('gives more stars as difficulty rises, up to a cap', () => {
    expect(gen('r', 0, 4)!.stars.length).toBeLessThan(gen('r', 8, 4)!.stars.length);
    expect(gen('r', 40, 4)!.stars.length).toBe(6);
  });

  it.each(pieces)('declares par equal to its star count for %s', (piece) => {
    // The whole point of building by random walk: each star needs its own
    // landing, so par can never beat the star count, and the walk achieves it.
    // This is the property that lets the runtime skip the solver entirely.
    for (let seed = 0; seed < 12; seed++) {
      const level = gen(piece, 3, seed);
      if (!level) continue;
      expect(level.par).toBe(level.stars.length);
      expect(solve(level)!.length).toBe(level.par);
    }
  });

  it('is reproducible from the same seed', () => {
    expect(gen('r', 3, 99)!.fen).toBe(gen('r', 3, 99)!.fen);
  });

  it('gives different levels for different seeds', () => {
    const fens = new Set(Array.from({ length: 12 }, (_, i) => gen('r', 3, i)?.fen));
    expect(fens.size).toBeGreaterThan(6);
  });

  it('never puts a pawn on the first or last rank', () => {
    // The walk needs room ahead of the pawn, but a pawn on rank 1 is a
    // position that cannot occur in chess and would teach the wrong thing.
    for (let seed = 0; seed < 20; seed++) {
      const level = gen('p', 8, seed);
      if (!level) continue;
      const { board } = parseFen(level.fen);
      const square = findPieces(board, 'w')[0];
      expect(square >> 3).toBeGreaterThanOrEqual(1);
      expect(square >> 3).toBeLessThanOrEqual(6);
    }
  });

  it('always finds something to play, for every piece at every difficulty', () => {
    for (const piece of pieces) {
      for (const difficulty of [0, 2, 4, 6, 8, 20]) {
        const level = generateLevel({
          world: 'rook',
          piece,
          tier: 1,
          difficulty,
          rng: makeRng(difficulty * 13 + piece.charCodeAt(0)),
          index: 0,
        });
        expect(level, `${piece} at difficulty ${difficulty}`).not.toBeNull();
      }
    }
  });

});

describe('generated capture levels (tiers 2 and 3)', () => {
  const pieces: PieceType[] = ['r', 'b', 'q', 'k', 'n', 'p'];

  const capture = (piece: PieceType, difficulty: number, seed: number, tier: 2 | 3 = 2) =>
    generateLevelOrEasier({
      world: 'rook',
      piece,
      tier,
      difficulty,
      rng: makeRng(seed),
      index: 0,
    });

  it.each(pieces)('produces a winnable capture level for %s', (piece) => {
    const level = capture(piece, 2, 31);
    expect(level, `no capture level generated for ${piece}`).not.toBeNull();
    expect(level!.goal).toBe('captureAll');
    expect(level!.stars).toHaveLength(0);
    expect(solve(level!)).not.toBeNull();
  });

  it.each(pieces)('declares par equal to the number of enemies for %s', (piece) => {
    for (let seed = 0; seed < 8; seed++) {
      const level = capture(piece, 2, seed);
      if (!level) continue;
      const enemies = findPieces(parseFen(level.fen).board, 'b').length;
      expect(level.par).toBe(enemies);
      expect(solve(level)!.length).toBe(level.par);
    }
  });

  it('never lets a capture land on a square the remaining enemies cover', () => {
    // The property that is easiest to get subtly wrong: safety has to be
    // judged against the enemies still on the board at that moment, since
    // taking one removes its cover.
    for (let seed = 0; seed < 20; seed++) {
      const level = capture('r', 3, seed);
      if (!level) continue;

      let state = startLevel(level);
      for (const move of solve(level)!.moves) {
        state = applyMove(state, move.from, move.to);
        expect(state.phase, `level ${level.fen} lost on ${squareName(move.to)}`).not.toBe('lost');
      }
      expect(state.phase).toBe('won');
    }
  });

  it('never places a pawn on the first or last rank', () => {
    for (let seed = 0; seed < 20; seed++) {
      const level = capture('r', 4, seed);
      if (!level) continue;
      const board = parseFen(level.fen).board;
      for (const sq of findPieces(board, 'b')) {
        if (board[sq]!.type !== 'p') continue;
        expect(sq >> 3).toBeGreaterThanOrEqual(1);
        expect(sq >> 3).toBeLessThanOrEqual(6);
      }
    }
  });

  it('keeps capture levels shorter than star levels at the same difficulty', () => {
    // Each capture is a harder decision than each star, so the target count
    // ramps more slowly.
    expect(capture('r', 8, 3)!.par).toBeLessThan(gen('r', 8, 3)!.par);
  });

  it('usually gives one enemy a guard, so the level is a puzzle not a shopping list', () => {
    let guarded = 0;
    let total = 0;

    for (let seed = 0; seed < 30; seed++) {
      const level = capture('r', 3, seed);
      if (!level) continue;
      total += 1;
      const board = parseFen(level.fen).board;
      if (findPieces(board, 'b').some((sq) => attackers(board, sq, 'b').length > 0)) guarded += 1;
    }

    expect(total).toBeGreaterThan(0);
    expect(guarded / total).toBeGreaterThan(0.8);
  });

  it('never produces enemies that guard each other, which nobody could take', () => {
    // Two knights covering each other is a dead level. The walk excludes it by
    // construction -- it only accepts a capture that is safe when it happens,
    // and neither of a mutual pair ever is -- so this is a guard on that
    // reasoning rather than on a code path.
    for (let seed = 0; seed < 30; seed++) {
      const level = capture('r', 4, seed);
      if (!level) continue;
      const board = parseFen(level.fen).board;

      for (const a of findPieces(board, 'b')) {
        for (const b of attackers(board, a, 'b')) {
          expect(
            attackers(board, b, 'b').includes(a),
            `${level.fen}: ${squareName(a)} and ${squareName(b)} guard each other`,
          ).toBe(false);
        }
      }
    }
  });

  it('generates the same shape for tier 3, which is tier 2 without the overlay', () => {
    expect(capture('r', 2, 77, 3)!.goal).toBe('captureAll');
    expect(capture('r', 2, 77, 3)!.tier).toBe(3);
  });
});
