import { describe, expect, it } from 'vitest';

import { movePiece, parseFen } from './board';
import { hasLegalMove, isInCheck, isMate, isStalemate, kingSquare } from './check';
import { parseSquare, squareName } from './types';

const sq = parseSquare;
const board = (fen: string) => parseFen(fen).board;

describe('kingSquare', () => {
  it('finds the king', () => {
    expect(squareName(kingSquare(board('4r3/8/8/8/8/8/8/4K3 w - -'), 'w')!)).toBe('e1');
  });

  it('is null in a kingless position, which is most of the app', () => {
    expect(kingSquare(board('8/8/8/8/8/8/8/4R3 w - -'), 'w')).toBeNull();
  });
});

describe('isInCheck', () => {
  it('sees a rook down an open file', () => {
    expect(isInCheck(board('4r3/8/8/8/8/8/8/4K3 w - -'), 'w')).toBe(true);
  });

  it('does not see one through a blocker', () => {
    expect(isInCheck(board('4r3/8/8/8/8/8/4P3/4K3 w - -'), 'w')).toBe(false);
  });

  it('is false without a king rather than throwing', () => {
    // Every tier 1-3 level is kingless. This has to be a quiet no, because it
    // is called from the goal check on positions that have no king at all.
    expect(isInCheck(board('8/8/8/8/8/8/8/4R3 w - -'), 'w')).toBe(false);
  });
});

describe('legality', () => {
  it('refuses a king move that only opens the line it is checked on', () => {
    // The rook stops at the king, so e3 looks untouched until he steps off e4
    // and lets the line through. This is the one case a naive attack map gets
    // wrong.
    const position = board('4r3/8/8/8/4K3/8/8/8 w - -');
    expect(isInCheck(position, 'w')).toBe(true);
    expect(isInCheck(movePiece(position, sq('e4'), sq('e3')), 'w')).toBe(true);
    expect(isInCheck(movePiece(position, sq('e4'), sq('d4')), 'w')).toBe(false);
    expect(hasLegalMove(position, 'w')).toBe(true);
  });
});

describe('mate and stalemate', () => {
  /** Back rank: the rook arrives and the king's own pawns shut the door. */
  const BACK_RANK = 'R6k/6pp/8/8/8/8/8/8 w - -';

  it('calls a back-rank mate a mate', () => {
    expect(isMate(board(BACK_RANK), 'b')).toBe(true);
    expect(isStalemate(board(BACK_RANK), 'b')).toBe(false);
  });

  it('does not call an escapable check a mate', () => {
    const position = board('4r3/8/8/8/8/8/8/4K3 w - -');
    expect(isInCheck(position, 'w')).toBe(true);
    expect(isMate(position, 'w')).toBe(false);
  });

  it('keeps stalemate separate from mate', () => {
    // Not in check, and every square the king can reach is covered. A level
    // that accepted this as a win would be teaching the wrong ending.
    const position = board('7k/5Q2/8/8/8/8/8/K7 b - -');
    expect(isInCheck(position, 'b')).toBe(false);
    expect(hasLegalMove(position, 'b')).toBe(false);
    expect(isStalemate(position, 'b')).toBe(true);
    expect(isMate(position, 'b')).toBe(false);
  });

  it('is neither when the side has simply been cleared off the board', () => {
    // How every capture level ends. "No legal move" must not read as a result.
    const swept = board('8/8/8/8/8/8/8/4R3 w - -');
    expect(hasLegalMove(swept, 'b')).toBe(false);
    expect(isMate(swept, 'b')).toBe(false);
    expect(isStalemate(swept, 'b')).toBe(false);
  });
});
