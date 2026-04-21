import { useEffect, useRef } from 'react';
import type { GameProps, GameResult, GameType } from './games.types';
import { ACCENT } from './games.types';
import NBackGame from './NBackGame';
import RuleSwitchGame from './RuleSwitchGame';
import DualTaskGame from './DualTaskGame';
import DotConnectGameV2 from './DotConnectGameV2';
import SchulteGame from './SchulteGame';
import SpeedMathGame from './SpeedMathGame';
import ReflexTapGame from './ReflexTapGame';
import StroopGame from './StroopGame';
import NavonGame from './NavonGame';
import MentalRotationGame from './MentalRotationGame';

interface GameShellProps extends GameProps {
  gameType: GameType;
  // gameNumber/totalGames kept for caller compat — no longer rendered.
  gameNumber?: number;
  totalGames?: number;
}

const HARD_TIMEOUT_MS = 90_000;

// Score awarded when the user explicitly skips a game. Zero is the clearest
// "this affected the result" signal — no fake partial credit.
const SKIP_SCORE = 0;

const SHELL_TEXT = {
  en: {
    skip: 'Skip',
    skipTitle: 'Skip this game?',
    skipBody: 'You will get 0 points for this game. The session will continue to the next game.',
    cancel: 'Cancel',
    confirmSkip: 'Skip game',
    skipArrow: '→',
  },
  ar: {
    skip: 'تخطّي',
    skipTitle: 'هل تريد تخطّي هذه اللعبة؟',
    skipBody: 'ستحصل على ٠ نقطة في هذه اللعبة. ستواصل الجلسة إلى اللعبة التالية.',
    cancel: 'إلغاء',
    confirmSkip: 'تخطّي اللعبة',
    skipArrow: '←',
  },
} as const;

export default function GameShell({ gameType, language, taskCategory, cognitiveRating, onComplete }: GameShellProps) {
  const startedAt = useRef<number>(Date.now());
  const finished = useRef(false);
  const t = SHELL_TEXT[language];

  // 90s hard ceiling — starts as soon as the game mounts. No state update
  // every tick, so the game tree below doesn't re-render 5×/sec.
  useEffect(() => {
    startedAt.current = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= HARD_TIMEOUT_MS && !finished.current) {
        finished.current = true;
        clearInterval(id);
        onComplete({
          gameType,
          score: 50,
          durationMs: elapsed,
          correct: 0,
          total: 0,
        });
      }
    }, 500);
    return () => clearInterval(id);
  }, [gameType, onComplete]);

  function handleComplete(result: GameResult) {
    if (finished.current) return;
    finished.current = true;
    onComplete(result);
  }

  function handleSkip() {
    if (finished.current) return;
    finished.current = true;
    onComplete({
      gameType,
      score: SKIP_SCORE,
      durationMs: Date.now() - startedAt.current,
      correct: 0,
      total: 0,
    });
  }

  // Wrap each game render in a try/catch boundary at the call site.
  // If a game crashes mid-mount, return a neutral score so the session
  // never blocks.
  try {
    return (
      <div
        className="w-full relative"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        style={{
          background: 'transparent',
          padding: '4px 0',
        }}
      >
        {/* Shell control row — Skip only. Each game owns its own Help button. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginBottom: 8,
            flexDirection: 'row',
            position: 'relative',
            zIndex: 5,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            aria-label={t.skip}
            style={{
              border: '0.5px solid rgba(0,0,0,0.15)',
              background: 'transparent',
              color: '#888888',
              borderRadius: 20,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: '0.5px',
              minHeight: 44,
              position: 'relative',
              zIndex: 5,
            }}
          >
            {t.skip} {t.skipArrow}
          </button>
        </div>

        <ProgressBar startedAtRef={startedAt} />

        {gameType === 'nback' && (
          <NBackGame language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
        {gameType === 'ruleswitch' && (
          <RuleSwitchGame language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
        {gameType === 'dualtask' && (
          <DualTaskGame language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
        {gameType === 'dotconnect' && (
          <DotConnectGameV2 language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
        {gameType === 'schulte' && (
          <SchulteGame language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
        {gameType === 'speedmath' && (
          <SpeedMathGame language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
        {gameType === 'reflex' && (
          <ReflexTapGame language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
        {gameType === 'stroop' && (
          <StroopGame language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
        {gameType === 'navon' && (
          <NavonGame language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
        {gameType === 'mentalrotation' && (
          <MentalRotationGame language={language} taskCategory={taskCategory} cognitiveRating={cognitiveRating} onComplete={handleComplete} />
        )}
      </div>
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[GameShell] crash:', e);
    if (!finished.current) {
      finished.current = true;
      onComplete({ gameType, score: 50, durationMs: 0, correct: 0, total: 0 });
    }
    return null;
  }
}

// Isolated progress bar — owns its own RAF loop and writes width directly
// to the DOM, so the expensive game tree above doesn't re-render each tick.
function ProgressBar({ startedAtRef }: { startedAtRef: React.MutableRefObject<number> }) {
  const fillRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      const pct = Math.min(100, (elapsed / HARD_TIMEOUT_MS) * 100);
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAtRef]);
  return (
    <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 24 }}>
      <div
        ref={fillRef}
        style={{
          height: '100%',
          background: ACCENT.primary,
          width: '0%',
          willChange: 'width',
        }}
      />
    </div>
  );
}

