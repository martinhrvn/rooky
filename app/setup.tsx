import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { LAST_STAGE, STAGES, openingStage } from '../src/game/setup';
import { useProgress, useSetupFinished } from '../src/progress/store';
import { xpForResult } from '../src/progress/xp';
import { Button } from '../src/ui/Button';
import { SetupPlayer, StageGlyph } from '../src/ui/SetupPlayer';
import { strings } from '../src/ui/strings';

/**
 * Board setup: a tutorial in parts, from the home shelf.
 *
 * Opens on the stage she is up to, so leaving halfway through the course and
 * coming back next week picks up where she was rather than at the rooks
 * again. Earlier stages stay open from the row along the top.
 *
 * Finishing a stage pays XP like a level does — the stars table at three
 * stars, because there is nothing to do badly here: a wrong square costs her
 * the piece's trip home and nothing else. The first time through a stage pays
 * the first-clear rate and a replay pays the replay rate, so going round the
 * rooks forty times is not a way to fill the bar.
 */
export default function SetupScreen() {
  const router = useRouter();
  const finished = useSetupFinished();
  const finishStage = useProgress((s) => s.finishSetupStage);
  const settle = useProgress((s) => s.settle);

  const [stage, setStage] = useState(() => openingStage(finished));
  /** Bumped by "do it again", so the same stage remounts from the start. */
  const [round, setRound] = useState(0);

  const onComplete = useCallback(() => {
    // Read before `finishStage` moves it on.
    const isFirstClear = stage >= finished;
    finishStage(stage);
    settle(xpForResult({ stars: 3, isFirstClear }));
  }, [finishStage, finished, settle, stage]);

  const next = stage < LAST_STAGE ? STAGES[stage + 1] : null;

  return (
    <SetupPlayer
      key={`${stage}-${round}`}
      stage={stage}
      finished={finished}
      onExit={() => router.back()}
      onPickStage={setStage}
      onComplete={onComplete}
      wonActions={
        <>
          {/* The next stage's piece on the button, so what comes next is
              said without the word. */}
          {next ? (
            <Button
              icon="next"
              iconNode={<StageGlyph stage={next.key} size={34} />}
              label={strings.setup.next}
              kind="go"
              onPress={() => setStage(stage + 1)}
            />
          ) : null}
          <Button
            icon="retry"
            label={strings.setup.again}
            kind="again"
            onPress={() => setRound((r) => r + 1)}
          />
          {next ? null : (
            <Button icon="home" label={strings.setup.home} onPress={() => router.back()} />
          )}
        </>
      }
    />
  );
}
