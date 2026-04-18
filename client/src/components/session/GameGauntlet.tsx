/* GameGauntlet — runs the 5 warm-up games in fixed order with a per-game
 * result card and 2-stage transition between them.
 *
 * Flow per game:  playing → result (3s) → transition (user clicks Start) → next game
 * Last game:      playing → result (3s) → onComplete (no transition needed)
 */
import { useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import GameShell from '../games/GameShell';
import GameResultCard from './GameResultCard';
import GameTransition from './GameTransition';
import type { GameResult, GameType } from '../games/games.types';

interface GameGauntletProps {
  language: 'ar' | 'en';
  taskCategory: string;
  cognitiveRating?: number;
  onComplete: (gameScores: Partial<Record<GameType, number>>) => void;
}

// Category-based game SELECTION — each category picks 5 games from a pool
// of 7. Array order is the play order for that session. The two games not
// listed are simply not played that session.
export const CATEGORY_GAMES: Record<string, GameType[]> = {
  studying:   ['nback', 'stroop', 'schulte', 'speedmath', 'navon'],
  coding:     ['nback', 'speedmath', 'mentalrotation', 'stroop', 'dotconnect'],
  writing:    ['stroop', 'navon', 'schulte', 'nback', 'dotconnect'],
  design:     ['mentalrotation', 'schulte', 'dotconnect', 'stroop', 'navon'],
  math:       ['speedmath', 'nback', 'mentalrotation', 'dotconnect', 'stroop'],
  reading:    ['navon', 'stroop', 'schulte', 'nback', 'speedmath'],
  presenting: ['stroop', 'schulte', 'nback', 'navon', 'speedmath'],
  other:      ['schulte', 'nback', 'stroop', 'speedmath', 'dotconnect'],
  // legacy alias — older TaskCategory value routes to the design list
  designing:  ['mentalrotation', 'schulte', 'dotconnect', 'stroop', 'navon'],
};

export function getGamesForCategory(category: string): GameType[] {
  return CATEGORY_GAMES[category.toLowerCase()] ?? CATEGORY_GAMES.other!;
}

// Older call site kept for compatibility.
export const orderForCategory = getGamesForCategory;

const MOTIVATIONS = {
  en: [
    { emoji: '🔥', text: 'Brain is firing!' },
    { emoji: '⚡', text: 'Keep that momentum!' },
    { emoji: '💡', text: "You're in the zone!" },
    { emoji: '🎯', text: 'Locked in. Stay sharp.' },
    { emoji: '🚀', text: 'Last one. Give it everything!' },
  ],
  ar: [
    { emoji: '🔥', text: 'دماغك بدأ يشتغل!' },
    { emoji: '⚡', text: 'كمّل على نفس الإيقاع!' },
    { emoji: '💡', text: 'أنت في الجو الصح!' },
    { emoji: '🎯', text: 'مركّز. كمّل كذا.' },
    { emoji: '🚀', text: 'الأخيرة. عطها كل شي!' },
  ],
};

const FINAL_INDEX = 4;

type Phase = 'playing' | 'result' | 'transition';

export default function GameGauntlet({
  language,
  taskCategory,
  cognitiveRating = 1500,
  onComplete,
}: GameGauntletProps) {
  const [phase, setPhase] = useState<Phase>('playing');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameScores, setGameScores] = useState<Partial<Record<GameType, number>>>({});
  const [usedMotivations, setUsedMotivations] = useState<number[]>([]);
  const [activeMotivation, setActiveMotivation] = useState<{ emoji: string; text: string } | null>(null);
  // Store the last game's result so the result card can display stats
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const completionLock = useRef(false);

  const gameOrder = getGamesForCategory(taskCategory);
  const currentGame = gameOrder[currentIndex]!;
  const isLastGame = currentIndex === gameOrder.length - 1;

  const pickMotivation = useCallback(
    (isFinalTransition: boolean) => {
      if (isFinalTransition) return MOTIVATIONS[language][FINAL_INDEX]!;
      const pool = MOTIVATIONS[language];
      const available = pool
        .map((_, i) => i)
        .filter((i) => i !== FINAL_INDEX && !usedMotivations.includes(i));
      const choices = available.length > 0
        ? available
        : pool.map((_, i) => i).filter((i) => i !== FINAL_INDEX);
      const pick = choices[Math.floor(Math.random() * choices.length)]!;
      setUsedMotivations((u) => (available.length > 0 ? [...u, pick] : [pick]));
      return pool[pick]!;
    },
    [language, usedMotivations],
  );

  // Game finishes → show result card
  const handleGameComplete = useCallback(
    (result: GameResult) => {
      if (completionLock.current) return;
      completionLock.current = true;
      const nextScores = { ...gameScores, [currentGame]: result.score };
      setGameScores(nextScores);
      setLastResult(result);
      setPhase('result');
    },
    [currentGame, gameScores],
  );

  // Result card auto-advances after 3s → show transition (or finish if last game)
  const handleResultDone = useCallback(() => {
    if (isLastGame) {
      const finalScores = { ...gameScores, [currentGame]: lastResult?.score ?? 0 };
      onComplete(finalScores);
      return;
    }
    const nextGameIsFinal = currentIndex + 1 === gameOrder.length - 1;
    const motivation = pickMotivation(nextGameIsFinal);
    setActiveMotivation(motivation);
    setPhase('transition');
  }, [isLastGame, currentGame, currentIndex, gameScores, lastResult, onComplete, pickMotivation]);

  // Transition done (user clicked Start) → next game
  const handleTransitionDone = useCallback(() => {
    setCurrentIndex((i) => i + 1);
    setPhase('playing');
    setActiveMotivation(null);
    setLastResult(null);
    completionLock.current = false;
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: 480 }}>
      {phase === 'playing' && (
        <GameShell
          key={`${currentIndex}-${currentGame}`}
          gameType={currentGame}
          gameNumber={currentIndex + 1}
          totalGames={gameOrder.length}
          language={language}
          taskCategory={taskCategory}
          cognitiveRating={cognitiveRating}
          onComplete={handleGameComplete}
        />
      )}

      {phase === 'result' && lastResult && (
        <GameResultCard
          gameType={currentGame}
          score={lastResult.score}
          stats={lastResult.stats}
          language={language}
          onDone={handleResultDone}
        />
      )}

      <AnimatePresence>
        {phase === 'transition' && activeMotivation && (
          <GameTransition
            key={`transition-${currentIndex}`}
            motivation={activeMotivation}
            nextGame={gameOrder[currentIndex + 1]!}
            language={language}
            onDone={handleTransitionDone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
