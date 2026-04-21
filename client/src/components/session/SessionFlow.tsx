/* SessionFlow — the entire post-declare experience.
 *
 * Sequence:
 *   prime → warmup → checkin → [breathe?] → focusScore
 *
 * The legacy 5-phase orchestration (Ignition / Battle / Verdict / Launch)
 * is gone. This is the only post-declare flow.
 */
import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PrimeScreen from './PrimeScreen';
import GameGauntlet, { getGamesForCategory } from './GameGauntlet';
import GamePreviewScreen from './GamePreviewScreen';
import GameTransition from './GameTransition';
import CheckInScreen, { type CheckInResponse } from './CheckInScreen';
import BreatheScreen from './BreatheScreen';
import FocusScoreScreen from './FocusScoreScreen';
import type { GameType } from '../games/games.types';

interface SessionFlowProps {
  language: 'ar' | 'en';
  taskName: string;
  taskCategory: string;
  cognitiveRating?: number;
  /**
   * Called as soon as the gauntlet finishes (BEFORE the FocusScore screen
   * shows) so the session is saved to the DB even if the user clicks Exit
   * or closes the tab on the score screen.
   */
  onSave: (finalScore: number, gameScores: Partial<Record<GameType, number>>) => void;
  /**
   * Called when the user clicks "Start your task" / "Start anyway" to
   * navigate away from the session.
   */
  onComplete: () => void;
}

type Step = 'preview' | 'prime' | 'firstGameIntro' | 'warmup' | 'checkin' | 'breathe' | 'focusScore';

function average(scores: Partial<Record<GameType, number>>): number {
  const values = Object.values(scores).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default function SessionFlow({
  language,
  taskName,
  taskCategory,
  cognitiveRating = 50,
  onSave,
  onComplete,
}: SessionFlowProps) {
  const [step, setStep] = useState<Step>('preview');
  const [gameScores, setGameScores] = useState<Partial<Record<GameType, number>>>({});
  const [checkin, setCheckin] = useState<CheckInResponse | null>(null);
  // Bumping the warmupKey re-mounts the gauntlet for a fresh "Try again".
  const [warmupKey, setWarmupKey] = useState(0);

  const previewGames = getGamesForCategory(taskCategory);

  const handlePreviewDone = useCallback(() => setStep('prime'), []);
  const handlePrimeDone = useCallback(() => setStep('firstGameIntro'), []);
  const handleFirstIntroDone = useCallback(() => setStep('warmup'), []);

  const handleGauntletDone = useCallback(
    (scores: Partial<Record<GameType, number>>) => {
      setGameScores(scores);
      // Save to DB immediately so the session is persisted even if the user
      // leaves before clicking "Start your task" on the FocusScore screen.
      onSave(average(scores), scores);
      setStep('checkin');
    },
    [onSave],
  );

  const handleCheckInAnswer = useCallback((answer: CheckInResponse) => {
    setCheckin(answer);
    if (answer === 'nervous') {
      setStep('breathe');
    } else {
      setStep('focusScore');
    }
  }, []);

  const handleBreatheDone = useCallback(() => setStep('focusScore'), []);

  const handleRetry = useCallback(() => {
    setGameScores({});
    setCheckin(null);
    setWarmupKey((k) => k + 1);
    setStep('warmup');
  }, []);

  const handleStartTask = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <AnimatePresence mode="wait">
        {step === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <GamePreviewScreen
              language={language}
              games={previewGames}
              taskCategory={taskCategory}
              onStart={handlePreviewDone}
            />
          </motion.div>
        )}

        {step === 'prime' && (
          <motion.div
            key="prime"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <PrimeScreen
              taskName={taskName}
              taskCategory={taskCategory}
              language={language}
              onDone={handlePrimeDone}
            />
          </motion.div>
        )}

        {step === 'firstGameIntro' && previewGames[0] && (
          <motion.div
            key="firstGameIntro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ position: 'relative', minHeight: 480 }}
          >
            <GameTransition
              motivation={{ emoji: '', text: '' }}
              nextGame={previewGames[0]}
              language={language}
              onDone={handleFirstIntroDone}
              skipMotivation
            />
          </motion.div>
        )}

        {step === 'warmup' && (
          <motion.div
            key={`warmup-${warmupKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <GameGauntlet
              language={language}
              taskCategory={taskCategory}
              cognitiveRating={cognitiveRating}
              onComplete={handleGauntletDone}
            />
          </motion.div>
        )}

        {step === 'checkin' && (
          <motion.div
            key="checkin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <CheckInScreen
              taskName={taskName}
              language={language}
              onAnswer={handleCheckInAnswer}
            />
          </motion.div>
        )}

        {step === 'breathe' && (
          <motion.div
            key="breathe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <BreatheScreen language={language} onDone={handleBreatheDone} />
          </motion.div>
        )}

        {step === 'focusScore' && (
          <motion.div
            key="focusScore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <FocusScoreScreen
              finalScore={average(gameScores)}
              gameScores={gameScores}
              taskName={taskName}
              language={language}
              tookBreath={checkin === 'nervous'}
              onRetry={handleRetry}
              onStartTask={handleStartTask}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
