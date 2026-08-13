import type { Board } from '../chess/board';
import type { Square, SquareName } from '../chess/types';

/**
 * 1 — stars only, empty board.
 * 2 — real enemy pieces, attacked squares tinted red.
 * 3 — the same, with the red overlay switched off.
 */
export type Tier = 1 | 2 | 3;

export type WorldKey = 'rook' | 'bishop' | 'queen' | 'king' | 'knight' | 'pawn' | 'mixed';

export type GoalKind = 'collectAllStars' | 'captureAll' | 'collectAndCapture';

/**
 * Authoring shape for a level: pure, serialisable data with no functions.
 *
 * Lichess stores per-level `success`/`failure` closures; we deliberately don't,
 * because data-only levels can be fed to the BFS solver in `solver.ts` — which
 * is what proves every level is winnable and that its `par` is truthful.
 */
export interface LevelData {
  readonly id: string;
  readonly world: WorldKey;
  readonly tier: Tier;
  /** The player is always white. */
  readonly fen: string;
  readonly stars?: string | readonly SquareName[];
  readonly goal: GoalKind;
  /**
   * Optimal move count. Drives the move-dot row in the UI, and is asserted
   * against the solver in tests — never hand-tune it to make a level "feel"
   * easier, change the position instead.
   */
  readonly par: number;
  /** Arrows shown after a few failed attempts. */
  readonly hint?: readonly (readonly [SquareName, SquareName])[];
}

/** A level with its squares resolved to indices. */
export interface Level extends Omit<LevelData, 'stars' | 'hint'> {
  readonly stars: readonly Square[];
  readonly hint: readonly { from: Square; to: Square }[];
}

export type Phase = 'playing' | 'won' | 'lost';

export interface Move {
  readonly from: Square;
  readonly to: Square;
}

export interface GameState {
  readonly level: Level;
  readonly board: Board;
  /** Stars not yet collected. */
  readonly stars: readonly Square[];
  readonly moves: number;
  readonly selected: Square | null;
  readonly phase: Phase;
  readonly lastMove: Move | null;
  /**
   * Set when the player moved into danger: the enemy move that punishes it.
   * The UI plays this out rather than flashing an error — seeing the capture
   * happen is the entire lesson of tier 2.
   */
  readonly punisher: Move | null;
  /**
   * Where `rewind` goes back to. Written only when a move loses.
   *
   * Being taken steps the board back one move rather than restarting the
   * level: she still sees the consequence, but doesn't have to redo the moves
   * she already got right.
   */
  readonly undo: Snapshot | null;
}

/** The parts of a turn that a rewind puts back. */
export type Snapshot = Pick<
  GameState,
  'board' | 'stars' | 'moves' | 'selected' | 'lastMove'
>;
