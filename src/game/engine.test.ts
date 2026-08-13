import { describe, expect, it } from 'vitest';

import { findPieces, pieceAt } from '../chess/board';
import { parseSquare, squareName } from '../chess/types';
import {
  applyMove,
  legalTargets,
  promote,
  rate,
  restart,
  rewind,
  startLevel,
  tap,
  toLevel,
} from './engine';
import { solve, solveFrom } from './solver';
import type { GameState, LevelData } from './types';

const sq = parseSquare;

const level = (over: Partial<LevelData> = {}) =>
  toLevel({
    id: 'test',
    world: 'rook',
    tier: 1,
    teaches: 'test fixture',
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

describe('staying picked up', () => {
  it('keeps the moved piece selected so the next tap can be the target', () => {
    const state = play(startLevel(level({ stars: 'e3 e5', par: 2 })), 'e1e3');
    expect(state.selected).toBe(sq('e3'));
    expect(legalTargets(state).map(squareName)).toContain('e5');
  });

  it('lets a whole level be played as target, target, target', () => {
    // Three taps for three moves, with no re-selecting in between.
    let state = startLevel(level({ stars: 'a5 e5 e1', fen: '8/8/8/8/8/8/8/R7 w - -', par: 3 }));
    state = tap(state, sq('a1')); // pick the rook up once
    for (const target of ['a5', 'e5', 'e1']) state = tap(state, sq(target));

    expect(state.moves).toBe(3);
    expect(state.phase).toBe('won');
  });

  it('still lets you switch to your other piece by tapping it', () => {
    let state = play(startLevel(level({ fen: '8/8/8/8/8/8/8/R6R w - -', stars: 'a5', par: 2 })), 'a1a3');
    expect(state.selected).toBe(sq('a3'));
    state = tap(state, sq('h1'));
    expect(state.selected).toBe(sq('h1'));
    expect(state.moves).toBe(1);
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
  /**
   * Black rook on h5 covers rank 5 and the h-file. a1 is deliberately safe, so
   * the staging move e1-a1 is not itself fatal and each test fails for the one
   * reason it is testing.
   */
  const THREAT = '8/8/8/7r/8/8/8/4R3 w - -';

  it('loses when you land where an enemy covers, and names the punisher', () => {
    const state = play(
      startLevel(level({ fen: THREAT, stars: 'a5 b1', tier: 2, par: 2 })),
      'e1a1',
      'a1a5',
    );
    expect(state.phase).toBe('lost');
    expect(state.punisher).toEqual({ from: sq('h5'), to: sq('a5') });
  });

  it('does not punish the safe staging move', () => {
    expect(play(startLevel(level({ fen: THREAT, stars: 'a5 b1', tier: 2 })), 'e1a1').phase).toBe(
      'playing',
    );
  });

  it('still takes you when the winning move lands in danger', () => {
    // The last star sits on a square the black rook covers. If the goal were
    // checked before the threat, the final move would be immune to danger and
    // tier 2 would have a loophole on every level's last move.
    const state = play(
      startLevel(level({ fen: THREAT, stars: 'a5', tier: 2, par: 2 })),
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

  it('rewinds the losing move without counting it', () => {
    const lost = play(
      startLevel(level({ fen: THREAT, stars: 'a5 b1', tier: 2, par: 2 })),
      'e1a1',
      'a1a5',
    );
    expect(lost.phase).toBe('lost');
    expect(lost.moves).toBe(2);

    const back = rewind(lost);
    expect(back.phase).toBe('playing');
    // The move never happened, so it costs her nothing on the counter.
    expect(back.moves).toBe(1);
    expect(pieceAt(back.board, sq('a1'))).toMatchObject({ color: 'w', type: 'r' });
    expect(pieceAt(back.board, sq('a5'))).toBeNull();
    expect(back.punisher).toBeNull();
  });

  it('leaves the piece selected after a rewind, so she can try another square', () => {
    const lost = play(
      startLevel(level({ fen: THREAT, stars: 'a5 b1', tier: 2, par: 2 })),
      'e1a1',
      'a1a5',
    );
    expect(rewind(lost).selected).toBe(sq('a1'));
  });

  it('puts collected stars back when the fatal move had taken one', () => {
    const lost = play(
      startLevel(level({ fen: THREAT, stars: 'a5 b1', tier: 2, par: 2 })),
      'e1a1',
      'a1a5',
    );
    expect(lost.stars).toHaveLength(1);
    expect(rewind(lost).stars).toHaveLength(2);
  });

  it('can still be won after several rewinds', () => {
    // Try the fatal square three times, then find the safe one.
    let state = startLevel(level({ fen: THREAT, stars: 'e6', tier: 2, par: 1 }));
    for (let i = 0; i < 3; i++) {
      state = rewind(play(state, 'e1e5'));
    }
    state = play(state, 'e1e6');
    expect(state.phase).toBe('won');
    expect(state.moves).toBe(1);
  });

  it('does nothing when there is nothing to take back', () => {
    const state = startLevel(level());
    expect(rewind(state)).toBe(state);
  });

  it('freezes the level once it is over', () => {
    const won = play(startLevel(level()), 'e1e5');
    expect(tap(won, sq('e5'))).toBe(won);
  });
});

describe('goals beyond stars and captures', () => {
  const puzzle = (fen: string, over: Partial<LevelData> = {}) =>
    level({ fen, stars: undefined, tier: 2, par: 1, ...over });

  describe('protect', () => {
    /** The rook on a1 is under fire from a8 and has to stop being so. */
    const HANGING = 'r7/8/8/8/8/8/8/R7 w - -';

    it('is met by walking out of the line', () => {
      expect(play(startLevel(puzzle(HANGING, { goal: 'protect' })), 'a1h1').phase).toBe('won');
    });

    it('is met by taking the attacker instead', () => {
      // Two answers to the same position, both correct — which is why these
      // levels cannot have a single authored solution line.
      expect(play(startLevel(puzzle(HANGING, { goal: 'protect' })), 'a1a8').phase).toBe('won');
    });

    it('is not met while something of hers is still attacked', () => {
      // The knight steps somewhere perfectly safe and achieves nothing: the
      // rook is still hanging, so the level is not over.
      const state = play(
        startLevel(puzzle('r7/8/8/8/8/8/8/R6N w - -', { goal: 'protect', par: 2 })),
        'h1g3',
      );
      expect(state.phase).toBe('playing');
    });
  });

  describe('escapeCheck', () => {
    it('is met by stepping off the line', () => {
      const state = play(
        startLevel(puzzle('4r3/8/8/8/8/8/8/4K3 w - -', { goal: 'escapeCheck' })),
        'e1d1',
      );
      expect(state.phase).toBe('won');
    });

    it('asks about the king only, unlike protect', () => {
      // The rook on a1 is still hanging and the level is still finished: the
      // question was where the king stands, not whether everything is tidy.
      const inCheck = 'r3r3/8/8/8/8/8/8/R3K3 w - -';
      expect(play(startLevel(puzzle(inCheck, { goal: 'escapeCheck' })), 'e1d1').phase).toBe('won');
      expect(play(startLevel(puzzle(inCheck, { goal: 'protect', par: 2 })), 'e1d1').phase).toBe(
        'playing',
      );
    });
  });

  describe('check', () => {
    const KING_ALONE = '4k3/8/8/8/8/8/8/R7 w - -';

    it('is met by attacking the black king', () => {
      expect(play(startLevel(puzzle(KING_ALONE, { goal: 'check' })), 'a1a8').phase).toBe('won');
    });

    it('is not met by a move that only looks busy', () => {
      expect(play(startLevel(puzzle(KING_ALONE, { goal: 'check', par: 2 })), 'a1a4').phase).toBe(
        'playing',
      );
    });

    it('does not count a check she gets taken for', () => {
      // d8 gives check and stands next to the king, so the king simply takes
      // her. Danger runs before the goal, which is what makes "while staying
      // safe" a rule rather than a hope.
      const state = play(startLevel(puzzle(KING_ALONE, { goal: 'check' })), 'a1d1', 'd1d8');
      expect(state.phase).toBe('lost');
      expect(state.punisher).toEqual({ from: sq('e8'), to: sq('d8') });
    });
  });

  describe('mateInOne', () => {
    it('is met by a back-rank mate', () => {
      const state = play(
        startLevel(puzzle('6k1/5ppp/8/8/8/8/8/R7 w - -', { goal: 'mateInOne' })),
        'a1a8',
      );
      expect(state.phase).toBe('won');
    });

    it('is not met by a check the king walks out of', () => {
      // Same mate, one pawn short: h7 is now a door.
      const state = play(
        startLevel(puzzle('6k1/5pp1/8/8/8/8/8/R7 w - -', { goal: 'mateInOne', par: 2 })),
        'a1a8',
      );
      expect(state.phase).toBe('playing');
    });

    it('is not met by a stalemate', () => {
      // No legal move, but no check either. Accepting this would teach that
      // trapping the king is the same as mating it.
      const state = play(
        startLevel(puzzle('7k/8/5Q2/8/8/8/8/8 w - -', { goal: 'mateInOne', par: 2 })),
        'f6f7',
      );
      expect(state.phase).toBe('playing');
    });
  });
});

describe('danger: allPieces', () => {
  const fight = (fen: string, over: Partial<LevelData> = {}) =>
    level({ fen, stars: undefined, goal: 'captureAll', tier: 2, par: 1, ...over });

  /**
   * The discovered attack, which is the whole reason this scope exists: the
   * bishop on a4 is the only thing standing between the black rook and the
   * white rook, and stepping off the file is what loses.
   *
   * Note the geometry, because it is not optional: to mask a line the bishop
   * has to *be* on it, which makes the bishop the first thing the black rook
   * sees — so a masking piece is always itself under attack. That is the
   * warning she gets to read. It also means this bare position is a fixture and
   * not a level: with no way to reach the black rook, every move here loses.
   * A real one has to offer an answer, which `LOOSE_END` below does.
   */
  const DISCOVERY = 'r7/8/8/8/B7/8/8/R7 w - -';

  /** The same masking bishop, plus a knight that can go and take the rook. */
  const LOOSE_END = 'r7/8/1N6/8/B7/8/8/R7 w - -';

  it('takes the piece the move exposed, not the piece that moved', () => {
    const state = play(startLevel(fight(DISCOVERY, { danger: 'allPieces' })), 'a4c6');
    expect(state.phase).toBe('lost');
    expect(state.punisher).toEqual({ from: sq('a8'), to: sq('a1') });
  });

  it('leaves the same move alone under the default scope', () => {
    // Same position, same move: the difference is the level's setting and
    // nothing else, which is what keeps the six piece worlds untouched.
    expect(play(startLevel(fight(DISCOVERY)), 'a4c6').phase).toBe('playing');
  });

  it('punishes a bystander that was already hanging', () => {
    // The rook on a1 is under attack from the first move onwards — moving
    // something else and hoping is exactly the habit these levels exist to
    // break. This is also the whole mechanic behind the protection levels.
    const hanging = fight('r7/8/8/8/8/8/8/R6N w - -', { danger: 'allPieces' });
    const state = play(startLevel(hanging), 'h1g3');
    expect(state.phase).toBe('lost');
    expect(state.punisher).toEqual({ from: sq('a8'), to: sq('a1') });

    expect(play(startLevel(fight('r7/8/8/8/8/8/8/R6N w - -')), 'h1g3').phase).toBe('playing');
  });

  it('takes the most valuable piece when several hang at once', () => {
    // Knight on a1 and queen on h1 both hang. The queen is the loss worth
    // watching, and picking by square order would have shown the knight.
    const state = play(
      startLevel(fight('r6r/8/8/8/8/8/3P4/N6Q w - -', { danger: 'allPieces' })),
      'd2d3',
    );
    expect(state.punisher).toEqual({ from: sq('h8'), to: sq('h1') });
  });

  it('settles ties on the lowest square, so a replay is identical', () => {
    // Two knights, nothing to choose between them. The solver walks these
    // positions move for move; an unstable punisher would make `par` unstable.
    const state = play(
      startLevel(fight('r6r/8/8/8/8/8/3P4/N6N w - -', { danger: 'allPieces' })),
      'd2d3',
    );
    expect(state.punisher).toEqual({ from: sq('a8'), to: sq('a1') });
  });

  it('blames the piece that moved before anything it left behind', () => {
    // The pawn walks onto a covered square while the knight on a1 is already
    // hanging. The knight is worth more, but "you moved into that" is the
    // lesson of the move she just played, so it wins.
    const state = play(
      startLevel(fight('r3r3/8/8/8/8/8/4P3/N7 w - -', { danger: 'allPieces' })),
      'e2e3',
    );
    expect(state.punisher).toEqual({ from: sq('e8'), to: sq('e3') });
  });

  it('rewinds an exposure the same way as a direct capture', () => {
    const lost = play(startLevel(fight(DISCOVERY, { danger: 'allPieces' })), 'a4c6');
    const back = rewind(lost);
    expect(back.phase).toBe('playing');
    expect(back.moves).toBe(0);
    expect(pieceAt(back.board, sq('a4'))).toMatchObject({ color: 'w', type: 'b' });
  });

  it('lets a move through once the piece doing the threatening is gone', () => {
    // Taking the rook answers the masked threat and the open threat at once,
    // which is the move order these levels are asking her to find.
    const state = play(startLevel(fight(LOOSE_END, { danger: 'allPieces' })), 'b6a8');
    expect(state.phase).toBe('won');
  });

  it('still punishes a move that leaves the loose end loose', () => {
    // The knight goes somewhere perfectly safe and the bishop it walked past is
    // taken anyway.
    const state = play(startLevel(fight(LOOSE_END, { danger: 'allPieces', par: 2 })), 'b6d7');
    expect(state.phase).toBe('lost');
    expect(state.punisher).toEqual({ from: sq('a8'), to: sq('a4') });
  });
});

describe('promotion', () => {
  const pawnLevel = (over: Partial<LevelData> = {}) =>
    level({ world: 'pawn', fen: '8/4P3/8/8/8/8/8/8 w - -', stars: 'e8', par: 1, ...over });

  it('asks what the pawn becomes instead of moving it', () => {
    let state = tap(startLevel(pawnLevel()), sq('e7'));
    state = tap(state, sq('e8'));

    expect(state.phase).toBe('promoting');
    expect(state.pending).toEqual({ from: sq('e7'), to: sq('e8') });
    // Nothing has happened yet — the pawn is still standing on e7.
    expect(state.moves).toBe(0);
    expect(pieceAt(state.board, sq('e7'))).toMatchObject({ type: 'p' });
  });

  it.each(['q', 'r', 'b', 'n'] as const)('promotes to a %s when chosen', (type) => {
    const asked = tap(tap(startLevel(pawnLevel()), sq('e7')), sq('e8'));
    const done = promote(asked, type);

    expect(pieceAt(done.board, sq('e8'))).toMatchObject({ color: 'w', type });
    expect(done.moves).toBe(1);
  });

  it('does not leave the pawn stuck on the last rank', () => {
    // Before promotion existed, a pawn that reached rank 8 had no legal move
    // at all and the level simply stopped responding.
    const done = promote(tap(tap(startLevel(pawnLevel({ stars: 'e8 a1', par: 2 })), sq('e7')), sq('e8')), 'q');
    expect(legalTargets({ ...done, selected: sq('e8') }).length).toBeGreaterThan(0);
  });

  it('ignores a promotion choice when nothing is pending', () => {
    const state = startLevel(pawnLevel());
    expect(promote(state, 'n')).toBe(state);
  });

  describe('the underpromotion puzzle', () => {
    // White pawn e7, black rook d6. Promote to a queen and every approach to
    // d6 runs into the rook's lines; promote to a knight and it takes on d6
    // next move.
    const underpromotion = level({
      world: 'pawn',
      teaches: 'Only a knight reaches the rook — a queen has no safe route',
      fen: '8/4P3/3r4/8/8/8/8/8 w - -',
      stars: undefined,
      goal: 'captureAll',
      tier: 2,
      par: 2,
    });

    it('is won in two moves by promoting to a knight', () => {
      let state = promote(tap(tap(startLevel(underpromotion), sq('e7')), sq('e8')), 'n');
      expect(state.phase).toBe('playing');
      state = applyMove(state, sq('e8'), sq('d6'));
      expect(state.phase).toBe('won');
      expect(state.moves).toBe(2);
    });

    it('costs the queen an extra move, which is what the star rating punishes', () => {
      // The queen is not stranded — she reaches d6 via e7 — but that is three
      // moves against the knight's two, so queening finishes the level with
      // two stars instead of three. Forgiving, and the lesson still lands.
      const queened = promote(tap(tap(startLevel(underpromotion), sq('e7')), sq('e8')), 'q');
      expect(solveFrom(queened)!.length).toBe(2);
      expect(rate(1 + 2, underpromotion.par)).toBe(2);
    });

    it('has par 2, which only the knight achieves', () => {
      const solution = solve(underpromotion);
      expect(solution!.length).toBe(2);
      expect(solution!.moves[0].promoteTo).toBe('n');
    });
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
