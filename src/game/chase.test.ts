import { describe, expect, it } from 'vitest';

import { type Board, findPieces, parseFen, pieceAt } from '../chess/board';
import { type Color, opposite, parseSquare } from '../chess/types';
import {
  type ChaseRound,
  type ChaseSide,
  ROUNDS,
  SIDES,
  type Strength,
  isRoundOpen,
  movesFor,
  openingRound,
  pawnColor,
  play,
  startBoard,
  targetsFrom,
  winner,
} from './chase';
import { chooseMove, scoreMoves } from './opponent';
import { makeRng } from './random';

const board = (placement: string): Board => parseFen(`${placement} w - -`).board;
const sq = parseSquare;

/** Plays a round out, her side at `her` strength, and says who won and in how many plies. */
function playOut(r: ChaseRound, her: Strength, seed: number) {
  let b = startBoard(r);
  let toMove: Color = 'w';
  const rng = makeRng(seed);
  for (let ply = 0; ply < 400; ply++) {
    const won = winner(b, r.side, toMove);
    if (won) return { won, ply };
    const move = chooseMove(b, r.side, toMove, toMove === 'w' ? her : r.strength, rng);
    expect(move).not.toBeNull();
    b = play(b, move!);
    toMove = opposite(toMove);
  }
  throw new Error('game never ended');
}

describe('the rounds', () => {
  it('has the ladders asked for: four pieces to race, then two, four and eight pawns to hunt', () => {
    expect(ROUNDS.race.map((r) => r.opponent)).toEqual(['n', 'b', 'r', 'q']);
    expect(ROUNDS.hunt.map((r) => r.pawnCount)).toEqual([2, 4, 8]);
  });

  for (const side of SIDES) {
    ROUNDS[side].forEach((r, i) => {
      it(`${side} ${i + 1} starts with her pawns or her queen, and its piece or pawns, and nothing else`, () => {
        const b = startBoard(r);
        const pawns = pawnColor(side);
        const theirs = findPieces(b, opposite(pawns));
        expect(findPieces(b, pawns).every((s) => pieceAt(b, s)!.type === 'p')).toBe(true);
        expect(findPieces(b, pawns)).toHaveLength(r.pawnCount);
        expect(theirs).toHaveLength(1);
        expect(pieceAt(b, theirs[0])!.type).toBe(side === 'race' ? r.opponent : 'q');
        // White always opens, and it is always hers.
        expect(parseFen(r.fen).turn).toBe('w');
        expect(movesFor(b, 'w').length).toBeGreaterThan(0);
      });

      // The fairness gate: a round she cannot win is a round that should not
      // ship. A player who looks three moves ahead stands in for her with
      // the danger overlay on, and must win most games.
      it(`${side} ${i + 1} can be won`, () => {
        const seeds = [1, 2, 3, 4, 5, 6];
        const wins = seeds.filter((s) => playOut(r, { depth: 3, slack: 0 }, s).won === 'w').length;
        expect(wins).toBeGreaterThanOrEqual(5);
      });
    });
  }

  it('gets harder along each ladder', () => {
    // A middling player against each round: the first must be easier than the last.
    const her: Strength = { depth: 1, slack: 60 };
    const rate = (side: ChaseSide, i: number) =>
      [1, 2, 3, 4, 5, 6, 7, 8].filter((s) => playOut(ROUNDS[side][i], her, s).won === 'w').length;
    for (const side of SIDES) {
      expect(rate(side, 0)).toBeGreaterThan(rate(side, ROUNDS[side].length - 1));
    }
  });
});

describe('winner', () => {
  it('goes to the pawns the moment one reaches the end', () => {
    expect(winner(board('P2q4/8/8/8/8/8/8/8'), 'race', 'b')).toBe('w');
    expect(winner(board('8/8/8/8/8/8/8/2Qp4'), 'hunt', 'w')).toBe('b');
  });

  it('goes to the piece once every pawn is caught', () => {
    expect(winner(board('3q4/8/8/8/8/8/8/8'), 'race', 'w')).toBe('b');
    expect(winner(board('8/8/8/8/8/8/8/3Q4'), 'hunt', 'b')).toBe('w');
  });

  it('goes to the pawns if one of them takes the piece', () => {
    expect(winner(board('8/8/8/8/8/8/PPP5/8'), 'race', 'b')).toBe('w');
  });

  it('goes to the piece when every pawn is stood blocked', () => {
    // One pawn, the queen in its face: nothing to do, so the board does not
    // simply stop answering.
    expect(winner(board('8/8/8/8/8/3q4/3P4/8'), 'race', 'w')).toBe('b');
  });

  it('is nobody while it goes on', () => {
    for (const side of SIDES) for (const r of ROUNDS[side]) expect(winner(startBoard(r), side, 'w')).toBeNull();
  });
});

describe('her moves', () => {
  it('offers the double step from the start, and nothing for a piece that is not hers', () => {
    const b = startBoard(ROUNDS.race[0]);
    expect(targetsFrom(b, sq('e2')).sort()).toEqual([sq('e3'), sq('e4')].sort());
    expect(targetsFrom(b, sq('d8'))).toEqual([]);
    expect(targetsFrom(b, null)).toEqual([]);
  });

  it('does not promote a pawn that arrives — arriving is the win', () => {
    const after = play(board('8/P7/8/8/8/8/8/7q'), { from: sq('a7'), to: sq('a8') });
    expect(pieceAt(after, sq('a8'))!.type).toBe('p');
  });
});

describe('the opponent', () => {
  it('always takes a win that is there', () => {
    // A queen can take the last pawn; even the gentlest computer does.
    const b = board('8/8/8/8/3P4/8/8/3q4');
    const gentle: Strength = { depth: 1, slack: 1000 };
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(chooseMove(b, 'race', 'b', gentle, makeRng(seed))).toEqual({ from: sq('d1'), to: sq('d4') });
    }
  });

  it('never steps where a pawn takes it, when it can see that far', () => {
    const b = board('8/8/8/8/8/8/3P4/7q');
    for (const { move, score } of scoreMoves(b, 'race', 'b', 2)) {
      if (move.to === sq('c3') || move.to === sq('e3')) expect(score).toBeLessThan(-50_000);
    }
  });

  it('catches a pawn that would run through, at full strength', () => {
    // The pawn on b6 is two pushes from the end with the rook to move. Every
    // reply but a few lets it through, and the computer must find one.
    let b = board('8/8/1P6/8/8/8/8/7r');
    let toMove: Color = 'b';
    const rng = makeRng(1);
    let won: Color | null = null;
    for (let ply = 0; ply < 20 && !won; ply++) {
      b = play(b, chooseMove(b, 'race', toMove, { depth: 3, slack: 0 }, rng)!);
      toMove = opposite(toMove);
      won = winner(b, 'race', toMove);
    }
    expect(won).toBe('b');
  });

  it('is the same move from the same seed', () => {
    const r = ROUNDS.race[1];
    const a = chooseMove(startBoard(r), 'race', 'w', r.strength, makeRng(7));
    const b = chooseMove(startBoard(r), 'race', 'w', r.strength, makeRng(7));
    expect(a).toEqual(b);
  });

  it('plays from a kingless board, which a real engine would refuse', () => {
    expect(chooseMove(startBoard(ROUNDS.hunt[2]), 'hunt', 'b', { depth: 2, slack: 0 }, makeRng(1))).not.toBeNull();
  });
});

describe('the ladder', () => {
  it('opens every round she has won and the next one', () => {
    expect(isRoundOpen(0, 0)).toBe(true);
    expect(isRoundOpen(1, 0)).toBe(false);
    expect(isRoundOpen(2, 2)).toBe(true);
  });

  it('opens on the round she is up to, and stays on the last once she has won them all', () => {
    expect(openingRound('race', 0)).toBe(0);
    expect(openingRound('race', 2)).toBe(2);
    expect(openingRound('hunt', 3)).toBe(2);
    expect(openingRound('hunt', 99)).toBe(2);
  });
});
