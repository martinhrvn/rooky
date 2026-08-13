/**
 * The Escape world — her king is in check and has to stop being.
 *
 * There are three answers to a check in real chess: move the king, take the
 * checker, or put something in the way. **This app can only teach the first
 * two, and the third is deliberately a trap here.**
 *
 * That is not an oversight. To block a line her piece has to stand *on* it,
 * which is by definition a square the checking piece attacks — so the blocker
 * is taken, and getting taken rewinds. Chess calls that a trade and weighs it;
 * Rooky has no notion of trading, only of losing a piece. So interposing always
 * loses, `escape-t2-02` shows exactly that, and no level here presents blocking
 * as an answer. Giving blocks a fair hearing would mean teaching the engine
 * about defended pieces and trades, which is a much larger change than it
 * looks.
 *
 * Every level runs under `danger: 'allPieces'`, so moving something else and
 * leaving the king in check plays out as the king being taken, rather than as a
 * move that quietly fails to win.
 *
 * These positions are our own; see ASSETS.md.
 */

import type { LevelData } from '../../game/types';

export const escapeLevels: readonly LevelData[] = [
  {
    id: 'escape-t2-01',
    world: 'escape',
    tier: 2,
    teaches: 'Her king is on the bishop’s diagonal — one step off it and the check is over',
    fen: '8/8/8/b7/8/8/8/4K3 w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'escape-t2-02',
    world: 'escape',
    tier: 2,
    teaches: 'Stepping the rook into the way hands it over — the king has four squares of his own',
    // The invalid block. Ra4-e4 does stop the check, and the black rook takes
    // it where it stands. In tier 2 e4 is painted red before she tries it; in
    // tier 3 she finds out.
    fen: '4r3/8/8/8/R7/8/8/4K3 w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'escape-t2-03',
    world: 'escape',
    tier: 2,
    teaches: 'Both squares beside him are covered, so the only way out is to take the rook itself',
    // The bishop holds g1 and the knight holds g2, which leaves exactly one
    // legal answer. This is the level that says a check has more than one kind
    // of answer.
    fen: '8/b7/8/8/5n2/8/7r/7K w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
];
