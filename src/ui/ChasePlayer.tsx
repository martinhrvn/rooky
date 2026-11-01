import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { dangerFrom, attackMap } from '../chess/attacks';
import { type Board as BoardModel, findPieces, pieceAt } from '../chess/board';
import type { Color, PieceType, Square } from '../chess/types';
import {
  type ChaseMove,
  type ChaseSide,
  ROUNDS,
  isRoundOpen,
  play,
  startBoard,
  targetsFrom,
  winner,
} from '../game/chase';
import { chooseMove } from '../game/opponent';
import { makeRng } from '../game/random';
import { useXp } from '../progress/store';
import { Board } from './Board';
import { BloomWave } from './BoardBloom';
import { BoardFrame, frameWidthFor } from './BoardFrame';
import { Halo } from './GoalBadge';
import { IconButton } from './IconButton';
import { pieceArt } from './pieces';
import { strings } from './strings';
import { colors, elevation, layout } from './theme';
import { WinDialog } from './WinDialog';

/**
 * How long the computer "thinks" before it moves. The search takes a few
 * milliseconds; the pause is so she sees her own move land first and then
 * watches its answer, rather than the two arriving as one jump.
 */
const THINK_MS = 650;
/** A beat to look at the finished board before a card covers it. */
const END_DELAY_MS = 900;

/**
 * The win's ripple: it starts as the winning piece leaves the ground and
 * reaches the far corner, seven rings out, just as the card arrives.
 */
const RIPPLE_START_MS = 150;
const RIPPLE_STEP_MS = 45;
const ALL_SQUARES: readonly Square[] = Array.from({ length: 64 }, (_, sq) => sq);
/** How many rings of squares lie between two squares: a king's distance. */
const ringsFrom = (a: Square, b: Square) =>
  Math.max(Math.abs((a % 8) - (b % 8)), Math.abs(Math.floor(a / 8) - Math.floor(b / 8)));

const buzz = (style: Haptics.ImpactFeedbackStyle) => {
  Haptics.impactAsync(style).catch(() => {});
};

type Phase = 'hers' | 'theirs' | 'won' | 'lost';

interface Game {
  readonly board: BoardModel;
  readonly phase: Phase;
  readonly selected: Square | null;
  readonly lastMove: ChaseMove | null;
}

export interface ChasePlayerProps {
  side: ChaseSide;
  round: number;
  /** Rounds of this side she has won, for the row along the top. */
  won: number;
  onExit: () => void;
  onPickRound: (round: number) => void;
  /** Fires once, the moment she wins. */
  onWin: () => void;
  /** What the win card offers. */
  wonActions?: ReactNode;
  /** What the card after a loss offers. */
  lostActions?: ReactNode;
}

/**
 * The chase board: her side against the computer's, one move each.
 *
 * Built beside `LevelPlayer` rather than inside it, because the two disagree
 * about the thing `LevelPlayer` is built around: there, being taken rewinds
 * and the move never counted. Here losing a pawn is part of the game — the
 * piece hunting them is *supposed* to catch some — so nothing rewinds and the
 * board is always the game as it really stands.
 *
 * The danger overlay is always on. It is the whole lesson of both sides —
 * which squares the hunter covers, which squares a pawn takes on — and the
 * computer's strength, not the absence of help, is what the ladder turns up.
 *
 * Word-free like every board screen: the round row is pieces and pips, and the
 * only words are on the cards at the end, where an adult is most likely to be
 * looking.
 */
export function ChasePlayer({
  side,
  round,
  won,
  onExit,
  onPickRound,
  onWin,
  wonActions,
  lostActions,
}: ChasePlayerProps) {
  const { width, height } = useWindowDimensions();
  const spec = ROUNDS[side][round];
  const xp = useXp();
  const xpBefore = useRef(xp);

  const [game, setGame] = useState<Game>(() => ({
    board: startBoard(spec),
    phase: 'hers',
    selected: null,
    lastMove: null,
  }));
  const [ended, setEnded] = useState(false);
  const [nudge, setNudge] = useState<{ square: Square; tick: number } | null>(null);

  // Seeded per game, so a game is reproducible in principle but two games in
  // a row do not open the same way.
  const rng = useRef(makeRng(Date.now() >>> 0));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  /** Applies a move and works out whose turn it is, or who has won. */
  const after = useCallback(
    (board: BoardModel, move: ChaseMove, mover: Color): Game => {
      const next = play(board, move);
      const toMove: Color = mover === 'w' ? 'b' : 'w';
      const result = winner(next, side, toMove);
      const phase: Phase = result === 'w' ? 'won' : result === 'b' ? 'lost' : toMove === 'w' ? 'hers' : 'theirs';
      return {
        board: next,
        phase,
        // Her piece stays picked up after it moves, as everywhere in the app —
        // unless the computer has just taken it.
        selected: mover === 'w' ? move.to : null,
        lastMove: move,
      };
    },
    [side],
  );

  // The end of a game: a beat, then the card. Guarded, so a re-run of the
  // effect can never pay the win twice.
  const reported = useRef(false);
  useEffect(() => {
    if (game.phase !== 'won' && game.phase !== 'lost') return;
    if (reported.current) return;
    reported.current = true;
    if (game.phase === 'won') onWin();
    buzz(game.phase === 'won' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    later(() => setEnded(true), END_DELAY_MS);
    // Once per game: the phase only ever becomes won or lost once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  // The computer's turn.
  useEffect(() => {
    if (game.phase !== 'theirs') return;
    later(() => {
      setGame((g) => {
        if (g.phase !== 'theirs') return g;
        const move = chooseMove(g.board, side, 'b', spec.strength, rng.current);
        // `winner` has already called a side with no move a loss, so this
        // cannot be reached with a null — but a stuck board would be worse.
        if (!move) return { ...g, phase: 'won' };
        const next = after(g.board, move, 'b');
        const keep = g.selected !== null && pieceAt(next.board, g.selected)?.color === 'w';
        return { ...next, selected: keep ? g.selected : null };
      });
    }, THINK_MS);
  }, [after, game.phase, later, side, spec.strength]);

  const onTapSquare = useCallback(
    (sq: Square) => {
      if (game.phase !== 'hers') return;
      const piece = pieceAt(game.board, sq);
      if (piece?.color === 'w') {
        setGame((g) => ({ ...g, selected: g.selected === sq ? null : sq }));
        return;
      }
      if (game.selected === null) return;
      if (!targetsFrom(game.board, game.selected).includes(sq)) {
        setNudge((n) => ({ square: sq, tick: (n?.tick ?? 0) + 1 }));
        setGame((g) => ({ ...g, selected: null }));
        return;
      }
      buzz(Haptics.ImpactFeedbackStyle.Light);
      setGame((g) => after(g.board, { from: g.selected!, to: sq }, 'w'));
    },
    [after, game],
  );

  const targets = useMemo(
    () => (game.phase === 'hers' ? targetsFrom(game.board, game.selected) : []),
    [game],
  );

  // What the other side covers. With a piece of hers picked up, lifted off
  // first — `dangerFrom`, not the whole-side map, so a square her moving
  // piece is shielding does not read as safe.
  const danger = useMemo(() => {
    if (game.phase === 'won' || game.phase === 'lost') return null;
    return game.selected !== null ? dangerFrom(game.board, game.selected) : attackMap(game.board, 'b');
  }, [game]);

  // Her pieces that could be taken where they stand: the ring, not the wash.
  const threatened = useMemo(() => {
    if (game.phase === 'won' || game.phase === 'lost') return null;
    const covered = attackMap(game.board, 'b');
    return new Set(findPieces(game.board, 'w').filter((sq) => covered.has(sq)));
  }, [game]);

  // Same arithmetic as `LevelPlayer`, with a little room for the round row.
  const available = Math.min(width - layout.boardPadding * 2, height * 0.62);
  const cell = Math.floor((available - frameWidthFor(available) * 2) / 8);
  const boardSize = cell * 8;
  const winSquare = game.phase === 'won' ? (game.lastMove?.to ?? null) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton name="back" onPress={onExit} accessibilityLabel={strings.play.back} />
      </View>

      <RoundRow side={side} round={round} won={won} onPick={onPickRound} />

      <View style={styles.boardWrap}>
        <BoardFrame size={boardSize}>
          <View style={{ width: boardSize, height: boardSize }}>
            <Board
              board={game.board}
              stars={[]}
              selected={game.phase === 'hers' ? game.selected : null}
              targets={targets}
              danger={danger}
              threatened={threatened}
              // Where it was lost: the pawn that got past her, or the last of
              // hers to be caught. Red at the one square that says why.
              doomed={game.phase === 'lost' ? (game.lastMove?.to ?? null) : null}
              lastMove={game.lastMove}
              size={boardSize}
              nudge={nudge}
              // The piece that won it hops, and the board answers from there.
              cheer={winSquare}
              onTapSquare={onTapSquare}
            />
            {winSquare !== null ? (
              <BloomWave
                squares={ALL_SQUARES}
                cell={cell}
                // Out in rings from the winning square, so the whole board
                // is saying where it was won.
                delayOf={(sq) => RIPPLE_START_MS + ringsFrom(winSquare, sq) * RIPPLE_STEP_MS}
                strength={0.4}
              />
            ) : null}
          </View>
        </BoardFrame>
      </View>

      {ended && game.phase === 'won' ? (
        <WinDialog earned={3} xpBefore={xpBefore.current} xpAfter={xp} size={boardSize}>
          {wonActions}
        </WinDialog>
      ) : null}
      {ended && game.phase === 'lost' ? <LostCard>{lostActions}</LostCard> : null}
    </SafeAreaView>
  );
}

/**
 * After a loss: the board through a thin scrim, and the way to go again.
 *
 * No stars, no cross, no red beyond the one square on the board that says
 * where — losing a game to the computer is a game, not a mistake, and the
 * only thing worth putting in front of her is "again".
 */
function LostCard({ children }: { children?: ReactNode }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.scrim} />
      <View style={styles.centre} pointerEvents="box-none">
        <View style={styles.card}>{children}</View>
      </View>
    </View>
  );
}

/**
 * The rounds along the top. A race round is the piece it is against; a hunt
 * round is its pawns, as pips — a count she reads at a glance without reading.
 * Lit is open, dim is still to come, the ring is the one she is on, and a
 * jade wash is won: the same reading as the board-setup row and the path.
 */
function RoundRow({
  side,
  round,
  won,
  onPick,
}: {
  side: ChaseSide;
  round: number;
  won: number;
  onPick: (round: number) => void;
}) {
  return (
    <View style={styles.rounds}>
      {ROUNDS[side].map((r, i) => {
        const open = isRoundOpen(i, won);
        const done = i < won;
        const label = [
          strings.chase.roundName(side, r.opponent, r.pawnCount),
          done ? strings.chase.done : open ? '' : strings.chase.locked,
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !open, selected: i === round }}
            disabled={!open || i === round}
            onPress={() => onPick(i)}
            hitSlop={4}
            style={[
              styles.round,
              done && styles.roundDone,
              i === round && styles.roundCurrent,
              !open && styles.roundLocked,
            ]}
          >
            <RoundGlyph side={side} opponent={r.opponent} pawns={r.pawnCount} size={34} id={`round-${i}`} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** A round's mark: the piece it is against, or that many pawn pips. */
export function RoundGlyph({
  side,
  opponent,
  pawns,
  size,
  id,
  color = colors.text,
}: {
  side: ChaseSide;
  opponent: PieceType;
  pawns: number;
  size: number;
  id: string;
  /** For the pips. Dark on a coloured button, as every label there is. */
  color?: string;
}) {
  if (side === 'race') {
    // Black, because it is theirs — on its halo, because the Cburnett black
    // set is black on black and vanishes on the plum.
    const Art = pieceArt('b', opponent);
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Halo size={size * 1.25} id={id} />
        <Art width={size * 0.9} height={size * 0.9} />
      </View>
    );
  }
  return <Pips count={pawns} size={size} color={color} />;
}

/** Up to four to a row, so eight is two rows of four and reads as "lots" before it is counted. */
function Pips({ count, size, color }: { count: number; size: number; color: string }) {
  const perRow = Math.min(4, count);
  const dot = Math.floor(size / 5);
  const rows = Math.ceil(count / perRow);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: dot * 0.5 }}>
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', gap: dot * 0.5 }}>
          {Array.from({ length: Math.min(perRow, count - row * perRow) }, (_, i) => (
            <View
              key={i}
              style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const ROUND_SIZE = 46;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.boardPadding,
    paddingVertical: 8,
  },
  rounds: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: layout.boardPadding,
    paddingBottom: 4,
  },
  round: {
    width: ROUND_SIZE,
    height: ROUND_SIZE,
    borderRadius: ROUND_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roundDone: { backgroundColor: colors.greenSoft },
  // Cream, the app's one ring for "this one".
  roundCurrent: { borderColor: colors.text },
  roundLocked: { opacity: 0.3 },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 8, 16, 0.55)' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 340,
    gap: 10,
    padding: 22,
    alignItems: 'center',
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surface,
    ...elevation('raised'),
  },
});
