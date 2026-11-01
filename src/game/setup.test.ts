import { describe, expect, it } from 'vitest';

import { findPieces, parseFen } from '../chess/board';
import { parseSquare } from '../chess/types';
import { makeRng } from './random';
import {
  LAST_STAGE,
  STAGES,
  demoOf,
  hintOf,
  homeSquares,
  isComplete,
  isStageOpen,
  openingStage,
  place,
  squareAtPoint,
  squareCentre,
  squaresFor,
  startStage,
  startingPieceOn,
  type SetupState,
} from './setup';

/** Places every piece in the queue on the first square it may go on. */
function solve(state: SetupState): SetupState {
  let s = state;
  while (!isComplete(s)) {
    const next = place(s, squaresFor(s.board, s.queue[0])[0]);
    expect(next).not.toBe(s);
    s = next;
  }
  return s;
}

const START = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1').board;

const sameAsStart = (s: SetupState) =>
  s.board.every((p, sq) =>
    START[sq] ? p?.color === START[sq]!.color && p?.type === START[sq]!.type : p === null,
  );

describe('the starting position', () => {
  it('agrees with a real board on every square', () => {
    for (let sq = 0; sq < 64; sq++) {
      const real = START[sq];
      expect(startingPieceOn(sq), `square ${sq}`).toEqual(
        real ? { color: real.color, type: real.type } : null,
      );
    }
  });

  it('puts the queen on her own colour', () => {
    expect(homeSquares('w', 'q')).toEqual([parseSquare('d1')]);
    expect(homeSquares('b', 'q')).toEqual([parseSquare('d8')]);
  });
});

describe('the stages', () => {
  const ALL = STAGES.findIndex((s) => s.key === 'all');

  it('asks for all of them from the two kings, then from one pawn', () => {
    const all = startStage(ALL);
    expect(findPieces(all.board)).toHaveLength(2);
    expect(all.queue).toHaveLength(30);

    const last = startStage(LAST_STAGE);
    expect(STAGES[LAST_STAGE].key).toBe('lone');
    expect(findPieces(last.board)).toHaveLength(1);
    expect(last.queue).toHaveLength(31);
  });

  it('opens every stage but the last with a piece of each colour standing', () => {
    // That is the whole of how she knows which side is whose, until the last
    // stage takes it away on purpose.
    STAGES.slice(0, LAST_STAGE).forEach((_, i) => {
      const s = startStage(i);
      expect(findPieces(s.board, 'w').length, `stage ${i}`).toBeGreaterThan(0);
      expect(findPieces(s.board, 'b').length, `stage ${i}`).toBeGreaterThan(0);
    });
  });

  it('stands the lone pawn on its own home rank, either colour, any file', () => {
    // Off its home rank a pawn would say nothing about which end is whose.
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const s = startStage(LAST_STAGE, makeRng(seed));
      const [sq] = findPieces(s.board);
      const pawn = s.board[sq]!;
      expect(pawn.type).toBe('p');
      expect(homeSquares(pawn.color, 'p')).toContain(sq);
      seen.add(`${pawn.color}${sq}`);
    }
    expect(seen.size).toBe(16);
  });

  it('builds a real starting position at the end of every stage', () => {
    // Each part stands on the ones before, so finishing the pawns *is* a full
    // board, and finishing either of the last two is too.
    expect(sameAsStart(solve(startStage(STAGES.findIndex((s) => s.key === 'p'))))).toBe(true);
    expect(sameAsStart(solve(startStage(ALL)))).toBe(true);
    for (let seed = 0; seed < 20; seed++) {
      expect(sameAsStart(solve(startStage(LAST_STAGE, makeRng(seed))))).toBe(true);
    }
  });

  it('only ever asks for the kind of piece the stage is about', () => {
    STAGES.forEach((stage, i) => {
      for (const piece of startStage(i).queue) expect(stage.pieces).toContain(piece.type);
    });
  });

  it('alternates colours, so every other piece goes to the far side', () => {
    const colours = startStage(STAGES.findIndex((s) => s.key === 'p')).queue.map((p) => p.color);
    colours.forEach((c, i) => expect(c).toBe(i % 2 === 0 ? 'w' : 'b'));
  });

  it('gives every piece an id of its own', () => {
    STAGES.forEach((_, i) => {
      const s = startStage(i);
      const ids = [...findPieces(s.board).map((sq) => s.board[sq]!.id), ...s.queue.map((p) => p.id)];
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});

describe('placing a piece', () => {
  it('accepts either corner for a rook', () => {
    const s = startStage(0);
    expect(s.queue[0]).toMatchObject({ color: 'w', type: 'r' });
    expect(squaresFor(s.board, s.queue[0])).toEqual([parseSquare('h1')]);
  });

  it('leaves the state untouched on a wrong square', () => {
    const s = startStage(0);
    expect(place(s, parseSquare('h8'))).toBe(s);
    expect(place(s, parseSquare('e4'))).toBe(s);
  });

  it('will not stack a piece on one already standing', () => {
    const s = startStage(0);
    expect(place(s, parseSquare('a1'))).toBe(s);
  });

  it('moves the queue on and remembers where it went', () => {
    const s = place(startStage(0), parseSquare('h1'));
    expect(s.board[parseSquare('h1')]).toMatchObject({ color: 'w', type: 'r' });
    expect(s.queue[0]).toMatchObject({ color: 'b', type: 'r' });
    expect(s.last).toBe(parseSquare('h1'));
  });

  it('does nothing once everything is placed', () => {
    const done = solve(startStage(0));
    expect(place(done, parseSquare('a2'))).toBe(done);
  });
});

describe('showing her', () => {
  it('shows every square the stage is about to fill', () => {
    const s = startStage(STAGES.findIndex((st) => st.key === 'n'));
    expect(demoOf(s).map((d) => d.square).sort((a, b) => a - b)).toEqual(
      ['b1', 'g1', 'b8', 'g8'].map(parseSquare).sort((a, b) => a - b),
    );
  });

  it('hints only at where the piece in her hand goes', () => {
    const s = startStage(STAGES.findIndex((st) => st.key === 'n'));
    expect(hintOf(s)).toEqual([
      { square: parseSquare('b1'), color: 'w', type: 'n' },
      { square: parseSquare('g1'), color: 'w', type: 'n' },
    ]);
  });
});

describe('which stage opens', () => {
  it('opens at the first unfinished stage, and stays on the last once done', () => {
    expect(openingStage(0)).toBe(0);
    expect(openingStage(3)).toBe(3);
    expect(openingStage(STAGES.length)).toBe(LAST_STAGE);
  });

  it('opens every stage up to the one she is on, and none past it', () => {
    expect(isStageOpen(0, 0)).toBe(true);
    expect(isStageOpen(1, 0)).toBe(false);
    expect(isStageOpen(2, 2)).toBe(true);
    expect(isStageOpen(LAST_STAGE, STAGES.length)).toBe(true);
  });
});

describe('where a drop lands', () => {
  const board = { x: 10, y: 100, width: 320, height: 320 };

  it('reads white at the bottom', () => {
    expect(squareAtPoint(15, 415, board)).toBe(parseSquare('a1'));
    expect(squareAtPoint(325, 105, board)).toBe(parseSquare('h8'));
  });

  it('says off the board, rather than guessing, past the edge', () => {
    expect(squareAtPoint(9, 200, board)).toBe(-1);
    expect(squareAtPoint(200, 420, board)).toBe(-1);
    expect(squareAtPoint(200, 200, null)).toBe(-1);
  });

  it('round-trips through a square centre', () => {
    for (let sq = 0; sq < 64; sq++) {
      const c = squareCentre(sq, board);
      expect(squareAtPoint(c.x, c.y, board)).toBe(sq);
    }
  });
});
