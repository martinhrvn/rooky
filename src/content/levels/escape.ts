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
 * looks: not "will it be taken" but "is taking it worth it", which is a static
 * exchange evaluation. Until there is one, blocking levels stay unauthored
 * rather than approximated — a rule that says "the enemy leaves defended pieces
 * alone" would be wrong everywhere else in the app.
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
  {
    id: 'escape-t2-04',
    world: 'escape',
    tier: 2,
    teaches: 'Backing straight down the line the rook is checking on is no escape',
    // The commonest beginner's move in the whole app: away from the enemy, and
    // still on its line. Four of the king's five squares are right, and the one
    // that feels safest is the one that loses.
    fen: '4r3/8/8/8/8/8/8/4K3 w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'escape-t2-05',
    world: 'escape',
    tier: 2,
    teaches: 'The rook is right beside him, but the bishop holds it and he may not take it',
    // `capturersOf` in the one place other than mate that needs it: a king
    // cannot capture a defended piece, so the checker standing next to him is
    // not the answer here.
    fen: '8/8/8/8/8/b7/8/2rK4 w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'escape-t2-06',
    world: 'escape',
    tier: 2,
    teaches: 'Every square round him is covered, so the bishop has to go — and only the rook can',
    // The pair of escape-t2-03, where the king took the checker himself. Here
    // he cannot reach it and something else has to.
    fen: '6r1/8/8/3b4/8/8/r7/3R3K w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'escape-t2-07',
    world: 'escape',
    tier: 2,
    teaches: 'A knight’s check can never be got in the way of — move him, or take it',
    // Worth having explicitly, because it is the one check where the third
    // answer is not merely a trap but does not exist at all.
    fen: '8/8/8/8/8/5n2/8/4KR2 w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'escape-t2-08',
    world: 'escape',
    tier: 2,
    teaches: 'Two enemies checking at once — taking one of them still leaves the other',
    // Her knight can take the bishop, which is exactly the move to make her
    // watch the rook take the king anyway. Only moving him answers both.
    fen: '8/8/8/8/7b/8/6N1/r3K3 w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'escape-t2-09',
    world: 'escape',
    tier: 2,
    teaches: 'The pawn takes to the side, so the square beside him is not the way out either',
    // Two wrong answers and one right one: along the rook's file is still
    // check, and the square that looks clear is the one square a pawn covers.
    fen: '7r/8/8/8/8/5p2/8/7K w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
  {
    id: 'escape-t2-10',
    world: 'escape',
    tier: 2,
    teaches: 'The queen and the knight between them cover everything except one square',
    fen: '8/8/8/8/7q/5n2/8/7K w - -',
    goal: 'escapeCheck',
    danger: 'allPieces',
    par: 1,
  },
];
