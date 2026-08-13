import { describe, expect, it } from 'vitest';

import { attackMap, attackers, dangerFrom, dangerMap, isAttacked } from './attacks';
import { findPieces, movePiece, parseFen, pieceAt, setPiece, toFen } from './board';
import { attackedFrom, destinations } from './moves';
import { parseSquare, parseSquares, squareName, type SquareName } from './types';

/** Loads a FEN and returns the board, for terse tests. */
const boardOf = (fen: string) => parseFen(fen).board;

/** destinations() as sorted square names, so expectations read like a chess book. */
const movesFrom = (fen: string, from: SquareName): SquareName[] =>
  destinations(boardOf(fen), parseSquare(from)).map(squareName).sort();

const attacksFrom = (fen: string, from: SquareName): SquareName[] =>
  attackedFrom(boardOf(fen), parseSquare(from)).map(squareName).sort();

const sorted = (names: SquareName[]) => [...names].sort();

describe('square naming', () => {
  it('maps a1 to 0 and h8 to 63', () => {
    expect(parseSquare('a1')).toBe(0);
    expect(parseSquare('h8')).toBe(63);
    expect(squareName(0)).toBe('a1');
    expect(squareName(63)).toBe('h8');
  });

  it('round-trips every square', () => {
    for (let sq = 0; sq < 64; sq++) {
      expect(parseSquare(squareName(sq))).toBe(sq);
    }
  });

  it('parses both the string and array forms used by level data', () => {
    expect(parseSquares('a4 g3 g4')).toEqual([parseSquare('a4'), parseSquare('g3'), parseSquare('g4')]);
    expect(parseSquares(['a4', 'g3'])).toEqual([parseSquare('a4'), parseSquare('g3')]);
    expect(parseSquares('')).toEqual([]);
  });

  it('rejects nonsense square names', () => {
    expect(() => parseSquare('j9')).toThrow();
    expect(() => parseSquare('e')).toThrow();
  });
});

describe('FEN', () => {
  it('loads a kingless position, which real chess libraries reject', () => {
    const { board, turn } = parseFen('8/8/8/8/8/8/4R3/8 w - -');
    expect(turn).toBe('w');
    expect(pieceAt(board, parseSquare('e2'))).toMatchObject({ color: 'w', type: 'r' });
    expect(findPieces(board)).toHaveLength(1);
  });

  it('places pieces on the right ranks (rank 8 comes first in FEN)', () => {
    const board = boardOf('r7/8/8/8/8/8/8/7R w - -');
    expect(pieceAt(board, parseSquare('a8'))).toMatchObject({ color: 'b', type: 'r' });
    expect(pieceAt(board, parseSquare('h1'))).toMatchObject({ color: 'w', type: 'r' });
  });

  it('round-trips through toFen', () => {
    for (const fen of [
      '8/8/8/8/8/8/4R3/8 w - -',
      '8/2p2p2/8/8/8/2R5/8/8 w - -',
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - -',
    ]) {
      expect(toFen(parseFen(fen))).toBe(fen);
    }
  });

  it('rejects malformed placements', () => {
    expect(() => parseFen('8/8/8/8/8/8/8 w - -')).toThrow(/8 ranks/);
    expect(() => parseFen('9/8/8/8/8/8/8/8 w - -')).toThrow();
    expect(() => parseFen('8/8/8/8/8/8/8/RRRRRRRRR w - -')).toThrow(/overflows/);
    expect(() => parseFen('8/8/8/8/8/8/8/XXXXXXXX w - -')).toThrow(/Invalid FEN piece/);
  });
});

describe('rook', () => {
  it('sweeps the full rank and file from an empty board', () => {
    expect(movesFrom('8/8/8/8/8/8/8/R7 w - -', 'a1')).toEqual(
      sorted(['b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8']),
    );
  });

  it('stops before a friendly piece and on top of an enemy one', () => {
    // White rook a1, white pawn a3 (blocks), black pawn d1 (capturable).
    const moves = movesFrom('8/8/8/8/8/P7/8/R2p4 w - -', 'a1');
    expect(moves).toContain('a2');
    expect(moves).not.toContain('a3'); // own pawn
    expect(moves).not.toContain('a4'); // and nothing beyond it
    expect(moves).toContain('d1'); // captures the black pawn
    expect(moves).not.toContain('e1'); // but does not pass through it
  });
});

describe('bishop', () => {
  it('moves only on its own colour diagonals', () => {
    expect(movesFrom('8/8/8/8/8/8/8/B7 w - -', 'a1')).toEqual(
      sorted(['b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8']),
    );
  });
});

describe('queen', () => {
  it('covers exactly the union of rook and bishop moves', () => {
    const fen = '8/8/8/3Q4/8/8/8/8 w - -';
    const rookFen = '8/8/8/3R4/8/8/8/8 w - -';
    const bishopFen = '8/8/8/3B4/8/8/8/8 w - -';
    const union = new Set([...movesFrom(rookFen, 'd5'), ...movesFrom(bishopFen, 'd5')]);
    expect(movesFrom(fen, 'd5')).toEqual(sorted([...union]));
  });
});

describe('knight', () => {
  it('has all eight hops from the centre', () => {
    expect(movesFrom('8/8/8/3N4/8/8/8/8 w - -', 'd5')).toEqual(
      sorted(['c7', 'e7', 'b6', 'f6', 'b4', 'f4', 'c3', 'e3']),
    );
  });

  it('does not wrap around the board edge (the classic mailbox bug)', () => {
    // From a1 only two hops exist; a naive index-offset generator invents
    // moves on the g- and h-files here.
    expect(movesFrom('8/8/8/8/8/8/8/N7 w - -', 'a1')).toEqual(sorted(['b3', 'c2']));
    expect(movesFrom('8/8/8/8/8/8/8/7N w - -', 'h1')).toEqual(sorted(['g3', 'f2']));
    expect(movesFrom('N7/8/8/8/8/8/8/8 w - -', 'a8')).toEqual(sorted(['b6', 'c7']));
    expect(movesFrom('7N/8/8/8/8/8/8/8 w - -', 'h8')).toEqual(sorted(['g6', 'f7']));
  });

  it('jumps over pieces in the way', () => {
    // Knight b1 surrounded by its own pawns still reaches a3 and c3.
    expect(movesFrom('8/8/8/8/8/8/PPP5/1N6 w - -', 'b1')).toEqual(sorted(['a3', 'c3', 'd2']));
  });
});

describe('king', () => {
  it('steps one square in every direction', () => {
    expect(movesFrom('8/8/8/3K4/8/8/8/8 w - -', 'd5')).toEqual(
      sorted(['c4', 'd4', 'e4', 'c5', 'e5', 'c6', 'd6', 'e6']),
    );
  });

  it('is limited by the corner', () => {
    expect(movesFrom('8/8/8/8/8/8/8/K7 w - -', 'a1')).toEqual(sorted(['a2', 'b1', 'b2']));
  });
});

describe('pawn', () => {
  it('pushes one square, or two from its home rank', () => {
    expect(movesFrom('8/8/8/8/8/8/4P3/8 w - -', 'e2')).toEqual(sorted(['e3', 'e4']));
    expect(movesFrom('8/8/8/8/8/4P3/8/8 w - -', 'e3')).toEqual(['e4']);
  });

  it('cannot push onto or through an occupied square', () => {
    expect(movesFrom('8/8/8/8/8/4p3/4P3/8 w - -', 'e2')).toEqual([]);
    expect(movesFrom('8/8/8/8/4p3/8/4P3/8 w - -', 'e2')).toEqual(['e3']);
  });

  it('captures diagonally but never straight ahead', () => {
    // Black pawns on d3 and f3, black pawn directly ahead on e3.
    const moves = movesFrom('8/8/8/8/8/3ppp2/4P3/8 w - -', 'e2');
    expect(moves).toEqual(sorted(['d3', 'f3']));
    expect(moves).not.toContain('e3');
  });

  it('attacks the diagonals even when they are empty, and never the square ahead', () => {
    // This asymmetry is what keeps the danger overlay honest: the square in
    // front of a pawn is the one square it cannot take you on.
    expect(attacksFrom('8/8/8/8/8/8/4P3/8 w - -', 'e2')).toEqual(sorted(['d3', 'f3']));
    expect(attacksFrom('8/8/8/8/8/8/4P3/8 w - -', 'e2')).not.toContain('e3');
  });

  it('attacks only inward from the a- and h-files', () => {
    expect(attacksFrom('8/8/8/8/8/8/P7/8 w - -', 'a2')).toEqual(['b3']);
    expect(attacksFrom('8/8/8/8/8/8/7P/8 w - -', 'h2')).toEqual(['g3']);
  });

  it('moves and attacks downward when black', () => {
    expect(movesFrom('8/4p3/8/8/8/8/8/8 b - -', 'e7')).toEqual(sorted(['e6', 'e5']));
    expect(attacksFrom('8/4p3/8/8/8/8/8/8 b - -', 'e7')).toEqual(sorted(['d6', 'f6']));
  });
});

describe('empty squares', () => {
  it('generate no moves and no attacks', () => {
    expect(movesFrom('8/8/8/8/8/8/8/8 w - -', 'd4')).toEqual([]);
    expect(attacksFrom('8/8/8/8/8/8/8/8 w - -', 'd4')).toEqual([]);
  });
});

describe('coverage versus legal moves', () => {
  it('covers a square its own side occupies, but cannot move there', () => {
    // Black knight d5 is defended by the black rook d8. The rook cannot move
    // onto its own knight, but it does defend it — and that defended square is
    // exactly what tier 2 has to tint red.
    const fen = '3r4/8/8/3n4/8/8/8/8 w - -';
    expect(attacksFrom(fen, 'd8')).toContain('d5');
    expect(movesFrom(fen, 'd8')).not.toContain('d5');
  });

  it('does not see past the piece it is defending', () => {
    const fen = '3r4/8/8/3n4/8/8/8/8 w - -';
    expect(attacksFrom(fen, 'd8')).not.toContain('d4');
  });

  it('covers a defended piece with a knight too', () => {
    // Knight f4 defends the pawn on d5 — the guard shape used across tier 2.
    expect(attacksFrom('8/8/8/3p4/5n2/8/8/8 w - -', 'f4')).toContain('d5');
  });

  it('agrees with destinations when nothing friendly is in the way', () => {
    const fen = '8/8/8/3R4/8/8/8/8 w - -';
    expect(attacksFrom(fen, 'd5')).toEqual(movesFrom(fen, 'd5'));
  });
});

describe('attack maps', () => {
  it('marks a defended enemy as dangerous, so the warning matches the rule', () => {
    // The engine punishes capturing a defended piece. If the map disagreed,
    // tier 2 would punish a danger it never showed — which is worse than
    // showing nothing at all.
    const board = boardOf('3r4/8/8/3n4/8/8/8/8 w - -');
    expect(attackMap(board, 'b').has(parseSquare('d5'))).toBe(true);
    expect(isAttacked(board, parseSquare('d5'), 'b')).toBe(true);
  });

  it('leaves an undefended enemy unmarked, so it reads as safe to take', () => {
    const board = boardOf('8/8/8/3n4/8/8/8/8 w - -');
    expect(attackMap(board, 'b').has(parseSquare('d5'))).toBe(false);
  });

  it('warns about squares her own piece is currently screening', () => {
    // Black rook a8, her rook standing on a5 in the way. a3 looks safe only
    // because she is the blocker -- move her down the file and the rook is
    // suddenly looking straight at her. The raw map misses this; the overlay
    // must not, or it warns about a danger only after it has happened.
    const board = boardOf('r7/8/8/R7/8/8/8/8 w - -');
    expect(attackMap(board, 'b').has(parseSquare('a3'))).toBe(false);
    expect(dangerMap(board).has(parseSquare('a3'))).toBe(true);
  });

  it('does not invent danger where the enemy genuinely cannot reach', () => {
    const board = boardOf('r7/8/8/R7/8/8/8/8 w - -');
    expect(dangerMap(board).has(parseSquare('h3'))).toBe(false);
  });

  it('keeps a piece that is staying put as a blocker, when asked about one mover', () => {
    // Black rook a8, her bishop on a5 blocking the file, her knight on h1. Ask
    // about the knight and a3 is safe -- the bishop is not going anywhere.
    // `dangerMap` lifts both pieces off and so paints a3 red for a move that
    // could not possibly expose it, which is over-warning rather than caution:
    // a red square she can safely stand on teaches her to ignore red.
    const board = boardOf('r7/8/8/B7/8/8/8/7N w - -');
    expect(dangerMap(board).has(parseSquare('a3'))).toBe(true);
    expect(dangerFrom(board, parseSquare('h1')).has(parseSquare('a3'))).toBe(false);
    // Ask about the bishop itself and the warning comes back, because moving it
    // is precisely what opens the file.
    expect(dangerFrom(board, parseSquare('a5')).has(parseSquare('a3'))).toBe(true);
  });

  it('agrees with dangerMap while she has a single piece', () => {
    // Which is every level in the six piece worlds, so switching the overlay
    // over changes nothing she can see.
    const board = boardOf('r7/8/8/R7/8/8/8/8 w - -');
    expect([...dangerFrom(board, parseSquare('a5'))].sort()).toEqual([...dangerMap(board)].sort());
  });

  it('marks every square a lone black rook covers', () => {
    const map = attackMap(boardOf('8/8/8/3r4/8/8/8/8 w - -'), 'b');
    expect(map.has(parseSquare('d1'))).toBe(true);
    expect(map.has(parseSquare('a5'))).toBe(true);
    expect(map.has(parseSquare('e4'))).toBe(false); // not on the rook's lines
    expect(map.has(parseSquare('d5'))).toBe(false); // its own square
    expect(map.size).toBe(14);
  });

  it('ignores the moving side entirely', () => {
    const board = boardOf('8/8/8/3r4/8/8/8/R7 w - -');
    expect(attackMap(board, 'b').has(parseSquare('a1'))).toBe(false);
    expect(attackMap(board, 'w').has(parseSquare('a8'))).toBe(true);
  });

  it('shows danger squares opening up once a defender is captured', () => {
    // Black rook h8 is screened from a8 by a black knight on d8. Take the
    // knight and the a8 square becomes dangerous — the exact pattern tier 2
    // is meant to teach.
    const before = boardOf('3n3r/8/8/8/8/8/8/8 w - -');
    expect(isAttacked(before, parseSquare('a8'), 'b')).toBe(false);

    const captured = setPiece(before, parseSquare('d8'), null);
    expect(isAttacked(captured, parseSquare('a8'), 'b')).toBe(true);
  });

  it('lists which enemy pieces cover a square', () => {
    // Rook a1 covers a3 up the file; bishop c1 covers it via b2.
    const board = boardOf('8/8/8/8/8/8/8/R1B5 w - -');
    expect(attackers(board, parseSquare('a3'), 'w').map(squareName).sort()).toEqual(
      sorted(['a1', 'c1']),
    );
  });

  it('is empty for a side with no pieces', () => {
    expect(attackMap(boardOf('8/8/8/8/8/8/4R3/8 w - -'), 'b').size).toBe(0);
  });
});

describe('movePiece', () => {
  it('moves the piece and leaves the source empty, without mutating the original', () => {
    const before = boardOf('8/8/8/8/8/8/4R3/8 w - -');
    const after = movePiece(before, parseSquare('e2'), parseSquare('e7'));

    expect(pieceAt(after, parseSquare('e7'))).toMatchObject({ color: 'w', type: 'r' });
    expect(pieceAt(after, parseSquare('e2'))).toBeNull();
    expect(pieceAt(before, parseSquare('e2'))).toMatchObject({ color: 'w', type: 'r' });
  });

  it('carries the piece id along, so the UI can animate one piece sliding', () => {
    const before = boardOf('8/8/8/8/8/8/4R3/8 w - -');
    const id = pieceAt(before, parseSquare('e2'))!.id;
    const after = movePiece(before, parseSquare('e2'), parseSquare('e7'));
    expect(pieceAt(after, parseSquare('e7'))!.id).toBe(id);
  });

  it('gives every piece in a position a distinct id', () => {
    const board = boardOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - -');
    const ids = findPieces(board).map((sq) => pieceAt(board, sq)!.id);
    expect(new Set(ids).size).toBe(32);
  });

  it('replaces the occupant when capturing', () => {
    const board = movePiece(
      boardOf('8/2p5/8/8/8/2R5/8/8 w - -'),
      parseSquare('c3'),
      parseSquare('c7'),
    );
    expect(pieceAt(board, parseSquare('c7'))).toMatchObject({ color: 'w', type: 'r' });
    expect(findPieces(board, 'b')).toEqual([]);
  });
});
