import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import SessionFlow from '../components/session/SessionFlow';
import { getGamesForCategory } from '../components/session/GameGauntlet';
import type { GameType } from '../components/games/games.types';

// Mirrors server/src/services/ScoringService.ts PHASE2_MIN_MS — Phase 2
// must be at least this long before the session counts as complete.
const PHASE2_MIN_MS = 30_000;

export default function Session() {
  const t = useStore((s) => s.t);
  const lang = useStore((s) => s.language);
  const current = useStore((s) => s.current);
  const startError = useStore((s) => s.startError);
  const stagePhase = useStore((s) => s.stagePhase);
  const finishSession = useStore((s) => s.finishSession);
  const nav = useNavigate();
  const startedAt = useRef<number>(Date.now());
  const [completing, setCompleting] = useState(false);

  useEffect(() => { startedAt.current = Date.now(); }, []);

  if (!current) return <Navigate to="/declare" replace />;

  // Wait for /api/session/start to return content before showing the flow.
  if (!current.content) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <div className="flex-1 grid place-items-center px-6">
          <div className="text-center">
            {startError ? (
              <>
                <div className="text-[12px] uppercase tracking-[0.2em] text-[#d23a2a] mb-3">{t.session.error}</div>
                <div className="font-serif-i text-[18px] text-ink/70 max-w-[40ch] mb-6">{startError}</div>
                <button onClick={() => nav('/declare', { replace: true })} className="btn-outline">{t.session.retry}</button>
              </>
            ) : (
              <>
                <div className="font-display text-[44px] tracking-[-0.02em] mb-3">{t.session.generating}</div>
                <div className="flex gap-1.5 justify-center">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full bg-ink"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function quit() {
    nav('/');
  }

  // Called by SessionFlow as soon as the gauntlet finishes — BEFORE the
  // FocusScore screen shows. This ensures the session is persisted to the DB
  // even if the user clicks Exit or closes the tab on the score screen.
  async function handleSave(
    finalScore: number,
    gameScores: Partial<Record<GameType, number>>,
  ) {
    if (completing) return;
    setCompleting(true);
    const elapsed = Math.max(Date.now() - startedAt.current, PHASE2_MIN_MS);
    const gamesPlayed = current ? getGamesForCategory(current.taskCategory) : [];
    stagePhase({
      gameScore: finalScore,
      phase2DurationMs: elapsed,
      gamesPlayed,
      gameScores,
      finalScore,
    });
    try {
      await finishSession();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[session/complete]', e);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F0E8' }}>
      <header className="px-5 md:px-10 pt-5 md:pt-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0" style={{ color: '#111111' }}>
            <Bolt />
            <span className="font-display text-[18px] md:text-[20px] leading-none">spark</span>
          </div>
          <button
            onClick={quit}
            style={{ fontSize: 11, letterSpacing: '2px', color: '#888888', textTransform: 'uppercase', background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 4px' }}
          >
            {t.session.exit}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-stretch px-4 md:px-6 pt-6 md:pt-8 pb-10 md:pb-12" style={{ background: '#F5F0E8' }}>
        <div style={{ maxWidth: 860, width: '100%', margin: '0 auto', minWidth: 0 }}>
          <SessionFlow
            language={lang}
            taskName={current.taskText}
            taskCategory={current.taskCategory}
            cognitiveRating={1500}
            onSave={handleSave}
            onComplete={quit}
          />
        </div>
      </main>
    </div>
  );
}

function Bolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-ink">
      <path d="M14 2 4 14h7l-2 8 11-13h-8z" />
    </svg>
  );
}
