import { expect, it } from 'vitest';

import { dangerMap } from '../../chess/attacks';
import { findPieces, parseFen, toFen } from '../../chess/board';
import { destinations } from '../../chess/moves';
import { squareName } from '../../chess/types';
import { applyMove, startLevel, toLevel } from '../../game/engine';
import { solve } from '../../game/solver';
import type { LevelData } from '../../game/types';

/**
 * The content gate, callable per world.
 *
 * Each world owns a one-line test file that calls this, so an agent authoring
 * the knight can run `npx vitest run src/content/levels/knight` and see only
 * its own work — rather than every world's, which is what happens when the
 * suite iterates ALL_LEVELS and one file is mid-edit.
 *
 * These checks are the reason authoring is safe to delegate at all: the solver
 * answers "winnable, and in how few moves" objectively, so a level either
 * passes or says exactly how it is broken.
 */
export function expectWorldLevels(worldName: string, data: readonly LevelData[]) {
  it(`${worldName}: has levels`, () => {
    expect(data.length).toBeGreaterThan(0);
  });

  it(`${worldName}: ids are unique and match the world`, () => {
    const ids = data.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const level of data) {
      expect(level.id, `${level.id} should start with its world key`).toMatch(
        new RegExp(`^${level.world}-`),
      );
    }
  });

  it(`${worldName}: every level says what it teaches`, () => {
    for (const level of data) {
      expect(level.teaches.trim().length, `${level.id} has no 'teaches' note`).toBeGreaterThan(0);
    }
  });

  it(`${worldName}: no two levels are the same puzzle`, () => {
    // Distinct puzzles and distinct intents. Cheap to violate when levels are
    // written in a batch, and invisible until a child plays the same thing
    // twice in a row and loses interest.
    //
    // A puzzle is the position *and* its targets: the same pawn on e2 with one
    // star and with two is deliberately the same setup asking a new question.
    const puzzles = data.map((l) => `${l.fen}|${l.goal}|${JSON.stringify(l.stars ?? '')}`);
    expect(new Set(puzzles).size, 'duplicate puzzles').toBe(puzzles.length);

    const intents = data.map((l) => l.teaches.trim().toLowerCase());
    expect(new Set(intents).size, 'duplicate "teaches" notes').toBe(intents.length);
  });

  it(`${worldName}: levels run in tier order`, () => {
    const tiers = data.map((l) => l.tier);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });

  for (const raw of data) {
    const level = toLevel(raw);

    it(`${level.id}: is winnable, and its par is the true optimum`, () => {
      const solution = solve(level);
      expect(solution, `${level.id} has no winning line`).not.toBeNull();

      const line = solution!.moves
        .map((m) => `${squareName(m.from)}${squareName(m.to)}${m.promoteTo ?? ''}`)
        .join(' ');
      expect(solution!.length, `declared par ${level.par}, solver found: ${line}`).toBe(level.par);
    });

    it(`${level.id}: goal and pieces agree`, () => {
      const board = parseFen(level.fen).board;
      expect(findPieces(board, 'w').length, 'needs a piece to play with').toBeGreaterThan(0);

      if (level.goal === 'captureAll') {
        expect(level.stars, 'capture levels have no stars').toHaveLength(0);
        expect(findPieces(board, 'b').length, 'needs enemies to take').toBeGreaterThan(0);
      } else {
        expect(level.stars.length, 'star goals need stars').toBeGreaterThan(0);
        for (const star of level.stars) {
          expect(board[star], `${squareName(star)} has a piece standing on it`).toBeNull();
        }
      }
    });

    it(`${level.id}: warns about exactly the squares that punish her`, () => {
      // The overlay's contract: red means you get taken there, and no red
      // means you don't. Under-warning is the worse failure, so this walks the
      // whole reachable state space rather than just the opening position.
      if (level.tier < 2) return;

      const seen = new Set<string>();
      let frontier = [startLevel(level)];

      for (let depth = 0; depth < level.par && frontier.length > 0; depth++) {
        const next: typeof frontier = [];
        for (const state of frontier) {
          const warned = dangerMap(state.board);
          for (const from of findPieces(state.board, 'w')) {
            for (const to of destinations(state.board, from)) {
              const after = applyMove(state, from, to);
              expect(
                warned.has(to),
                `${level.id}: ${squareName(from)}${squareName(to)} ${
                  after.phase === 'lost' ? 'loses but is not marked' : 'is marked but is safe'
                }`,
              ).toBe(after.phase === 'lost');

              if (after.phase !== 'playing') continue;
              const key = toFen({ board: after.board, turn: 'w' });
              if (seen.has(key)) continue;
              seen.add(key);
              next.push(after);
            }
          }
        }
        frontier = next;
      }
    });
  }
}
