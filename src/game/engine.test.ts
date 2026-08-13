import { describe, expect, it } from 'vitest';

import { findPieces, pieceAt } from '../chess/board';
import { parseSquare, squareName } from '../chess/types';
import { applyMove, legalTargets, rate, restart, startLevel, tap, toLevel } from './engine';
import type { GameState, LevelData } from './types';

const sq = parseSquare;

const level = (over: Partial<LevelData> = {}) =>
  toLevel({
    id: 'test',
    world: 'rook',
    tier: 1,
    fen: '8/8/8/8/8/8/8/4R3 w - -',
    stars: 'e5',
    goal: 'collectAllStars',
    par: 1,
    ...over,
  });

/** Plays a sequence of 'e1e5'-style moves through the reducer. */
function play(state: GameState, ...moves: string[]): GameState {
  return moves.reduce((s, m) => applyMove(s, sq(m.slice(0, 2)), sq(m.slice(2, 4))), state);
}

describe('starting a level', () => {
  it('loads the position and the full star set', () => {
    const state = startLevel(level({ stars: 'e5 a1' }));
    expect(state.phase).toBe('playing');
    expect(state.moves).toBe(0);
    expect(state.stars.map(squareName).sort()).toEqual(['a1', 'e5']);
    expect(pieceAt(state.board, sq('e1'))).toMatchObject({ color: 'w', type: 'r' });
  });
});

describe('selection', () => {
  it('selects your own piece and offers its moves', () => {
    const state = tap(startLevel(level()), sq('e1'));
    expect(state.selected).toBe(sq('e1'));
    expect(legalTargets(state).map(squareName)).toContain('e5');
  });

  it('offers nothing while unselected', () => {
    expect(legalTargets(startLevel(level()))).toEqual([]);
  });

  it('deselects when the same piece is tapped twice', () => {
    let state = tap(startLevel(level()), sq('e1'));
    state = tap(state, sq('e1'));
    expect(state.selected).toBeNull();
  });

  it('costs no move when tapping somewhere the piece cannot go', () => {
    let state = tap(startLevel(level()), sq('e1'));
    state = tap(state, sq('a8'));
    expect(state.selected).toBeNull();
    expect(state.moves).toBe(0);
  });

  it('switches selection between your own pieces without moving', () => {
    let state = tap(startLevel(level({ fen: '8/8/8/8/8/8/8/R6R w - -' })), sq('a1'));
    state = tap(state, sq('h1'));
    expect(state.selected).toBe(sq('h1'));
    expect(state.moves).toBe(0);
  });
});

describe('collecting stars', () => {
  it('collects only the star you land on, never ones you slide over', () => {
    // The rook passes over e3 on its way to e5. Sliding must not sweep it up,
    // or every multi-star level would collapse to a single move.
    const state = play(startLevel(level({ stars: 'e3 e5', par: 2 })), 'e1e5');
    expect(state.stars.map(squareName)).toEqual(['e3']);
    expect(state.phase).toBe('playing');
  });

  it('wins once the last star is taken', () => {
    const state = play(startLevel(level()), 'e1e5');
    expect(state.phase).toBe('won');
    expect(state.moves).toBe(1);
  });

  it('counts every move, including ones that collect nothing', () => {
    const state = play(startLevel(level({ stars: 'a5', par: 2 })), 'e1a1', 'a1a5');
    expect(state.moves).toBe(2);
    expect(state.phase).toBe('won');
  });
});

describe('capture goals', () => {
  const captureLevel = level({
    fen: '8/2p2p2/8/8/8/2R5/8/8 w - -',
    stars: undefined,
    goal: 'captureAll',
    par: 2,
  });

  it('wins when the last enemy piece is taken', () => {
    const state = play(startLevel(captureLevel), 'c3c7', 'c7f7');
    expect(findPieces(state.board, 'b')).toEqual([]);
    expect(state.phase).toBe('won');
  });

  it('is still playing while an enemy remains', () => {
    expect(play(startLevel(captureLevel), 'c3c7').phase).toBe('playing');
  });
});

describe('danger', () => {
  it('loses when you land where an enemy covers, and names the punisher', () => {
    // Black rook on a8 covers the whole a-file; stepping onto a5 gets taken.
    const state = play(
      startLevel(level({ fen: 'r7/8/8/8/8/8/8/4R3 w - -', stars: 'a5 h1', tier: 2, par: 2 })),
      'e1a1',
      'a1a5',
    );
    expect(state.phase).toBe('lost');
    expect(state.punisher).toEqual({ from: sq('a8'), to: sq('a5') });
  });

  it('still takes you when the winning move lands in danger', () => {
    // The last star sits on a square the black rook covers. If the goal were
    // checked before the threat, the final move would be immune to danger and
    // tier 2 would have a loophole on every level's last move.
    const state = play(
      startLevel(level({ fen: 'r7/8/8/8/8/8/8/4R3 w - -', stars: 'a5', tier: 2, par: 2 })),
      'e1a1',
      'a1a5',
    );
    expect(state.stars).toHaveLength(0);
    expect(state.phase).toBe('lost');
  });

  it('does not punish a piece that was already under attack before it moved', () => {
    // The rook starts on the a-file with a black rook bearing down on it, and
    // moving away must not count as walking into danger.
    const state = play(
      startLevel(level({ fen: 'r7/8/8/8/8/8/8/R7 w - -', stars: 'h1', tier: 2, par: 1 })),
      'a1h1',
    );
    expect(state.phase).toBe('won');
  });

  it('lets you take the piece that was attacking the square', () => {
    // Capturing the black rook removes the threat, so landing on a8 is safe.
    const state = play(
      startLevel(level({ fen: 'r7/8/8/8/8/8/8/R7 w - -', stars: undefined, goal: 'captureAll', tier: 2, par: 1 })),
      'a1a8',
    );
    expect(state.phase).toBe('won');
  });

  it('ignores squares the enemy pawn only moves through, not attacks', () => {
    // A black pawn on e7 attacks d6 and f6 but not e6 — the one square in
    // front of it is safe, and the overlay has to agree.
    const base = level({ fen: '8/4p3/8/8/8/8/8/4R3 w - -', stars: 'e6', tier: 2, par: 1 });
    expect(play(startLevel(base), 'e1e6').phase).toBe('won');

    const intoDanger = level({ fen: '8/4p3/8/8/8/8/8/3R4 w - -', stars: 'd6', tier: 2, par: 1 });
    expect(play(startLevel(intoDanger), 'd1d6').phase).toBe('lost');
  });

  it('freezes the level once it is over', () => {
    const won = play(startLevel(level()), 'e1e5');
    expect(tap(won, sq('e5'))).toBe(won);
  });
});

describe('star rating', () => {
  it('gives three stars at or under par, and never fails for being slow', () => {
    expect(rate(3, 3)).toBe(3);
    expect(rate(2, 3)).toBe(3);
    expect(rate(4, 3)).toBe(2);
    expect(rate(5, 3)).toBe(2);
    expect(rate(6, 3)).toBe(1);
    expect(rate(40, 3)).toBe(1);
  });
});

describe('restart', () => {
  it('puts everything back, including collected stars', () => {
    const state = restart(play(startLevel(level({ stars: 'e3 e5', par: 2 })), 'e1e3'));
    expect(state.moves).toBe(0);
    expect(state.stars).toHaveLength(2);
    expect(state.phase).toBe('playing');
    expect(pieceAt(state.board, sq('e1'))).toMatchObject({ color: 'w', type: 'r' });
  });
});
