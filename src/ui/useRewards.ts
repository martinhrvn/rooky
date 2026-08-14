/**
 * Binds a level being played to the reward loop.
 *
 * `LevelPlayer` knows nothing about the store — it emits what happened and
 * the screen decides. This hook is that decision, in one place, so the
 * campaign, Endless and Mix cannot drift apart on what a move is worth.
 */

import { useCallback, useMemo } from 'react';

import {
  HINTS,
  LEVELS,
  MIX_ROUNDS,
  ENDLESS_ROUNDS,
  type MoveEvent,
  STARS,
  STRANDED,
  TAKEN,
  TRIES,
  countersFor,
} from '../progress/achievements';
import { type Settlement, useProgress } from '../progress/store';
import { xpForResult } from '../progress/xp';

export type PlayMode = 'campaign' | 'endless' | 'mix';

export interface Rewards {
  onMove: (event: MoveEvent) => void;
  onLost: () => void;
  onStranded: () => void;
  onHint: () => void;
  /**
   * Call when a level is won, *after* its result has been recorded — the XP
   * depends on whether this was the first clear.
   */
  settleWin: (args: { stars: 1 | 2 | 3; isFirstClear: boolean }) => Settlement;
}

export function useRewards(mode: PlayMode): Rewards {
  const bump = useProgress((s) => s.bump);
  const extendStreak = useProgress((s) => s.extendStreak);
  const resetStreak = useProgress((s) => s.resetStreak);
  const settle = useProgress((s) => s.settle);

  const onMove = useCallback((event: MoveEvent) => bump(countersFor(event)), [bump]);

  const onLost = useCallback(() => {
    bump([TAKEN]);
    extendStreak(TRIES);
  }, [bump, extendStreak]);

  const onStranded = useCallback(() => bump([STRANDED]), [bump]);
  const onHint = useCallback(() => bump([HINTS]), [bump]);

  const settleWin = useCallback(
    ({ stars, isFirstClear }: { stars: 1 | 2 | 3; isFirstClear: boolean }) => {
      const counters = [
        // Endless is never recorded as a level result, so it does not count as
        // a level cleared either — it has a tally of its own instead.
        ...(mode === 'endless' ? [ENDLESS_ROUNDS] : [LEVELS]),
        ...(mode === 'mix' ? [MIX_ROUNDS] : []),
        // One per star she earned, so the tally counts stars and not levels.
        ...Array<string>(stars).fill(STARS),
      ];
      bump(counters);

      // Settle *before* resetting the run of failures, or "Never give up" —
      // which is earned by a run of five and reset by the win that ends it —
      // would be evaluated against a streak of zero and never granted at all.
      //
      // Endless goes through the same table as a replay: its levels are
      // generated, so there is nothing to be first at, and the replay rate is
      // the one that does not reward grinding.
      const settlement = settle(
        xpForResult({ stars, isFirstClear: mode === 'endless' ? false : isFirstClear }),
      );
      resetStreak(TRIES);

      return settlement;
    },
    [bump, mode, resetStreak, settle],
  );

  return useMemo(
    () => ({ onMove, onLost, onStranded, onHint, settleWin }),
    [onMove, onLost, onStranded, onHint, settleWin],
  );
}
