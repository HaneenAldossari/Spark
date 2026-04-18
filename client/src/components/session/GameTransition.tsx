/* GameTransition — 2-stage interstitial between games.
 *
 * Stage 1 (motivation, 2000ms): full-screen emoji + motivational text.
 *                               Auto-advances to stage 2 when the timer
 *                               elapses.
 * Stage 2 (next game info):     name + 1-line rule + a "Start" button.
 *                               Waits for the user to click the button —
 *                               no auto-advance, so the user can read the
 *                               rule and start the next game whenever they
 *                               feel ready.
 *
 * The two moments NEVER show at the same time — stage 1 fades out
 * completely before stage 2 fades in.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameType } from '../games/games.types';
import { ACCENT, GAME_META } from '../games/games.types';

interface GameTransitionProps {
  motivation: { emoji: string; text: string };
  nextGame: GameType;
  language: 'ar' | 'en';
  onDone: () => void;
  // When true, skip the motivation emoji and go straight to stage 2.
  // Used for the first game in a session (there's no previous game to
  // celebrate, so a motivational line would make no sense).
  skipMotivation?: boolean;
}

const STAGE_1_MS = 2000;

const TEXT = {
  en: { upNext: 'Up Next', start: 'Start' },
  ar: { upNext: 'اللعبة التالية', start: 'لنبدأ' },
} as const;

export default function GameTransition({
  motivation,
  nextGame,
  language,
  onDone,
  skipMotivation = false,
}: GameTransitionProps) {
  const [stage, setStage] = useState<1 | 2>(skipMotivation ? 2 : 1);
  const meta = GAME_META[nextGame][language];
  const t = TEXT[language];

  // Auto-advance only from stage 1 → stage 2. Stage 2 waits for the user
  // to click Start.
  useEffect(() => {
    if (skipMotivation) return;
    const id = setTimeout(() => setStage(2), STAGE_1_MS);
    return () => clearTimeout(id);
  }, [skipMotivation]);

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#F5F0E8',
        display: 'grid',
        placeItems: 'center',
        zIndex: 50,
        padding: '20px',
      }}
    >
      <AnimatePresence mode="wait">
        {stage === 1 ? (
          <motion.div
            key="stage1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ textAlign: 'center', maxWidth: 360, margin: '0 auto', width: '100%' }}
          >
            <div
              aria-hidden
              style={{
                fontSize: 64,
                lineHeight: 1,
                marginBottom: 22,
              }}
            >
              {motivation.emoji}
            </div>
            <p
              style={{
                fontSize: 'clamp(20px, 5.5vw, 24px)',
                fontWeight: 600,
                color: ACCENT.primary,
                margin: 0,
                lineHeight: 1.3,
                maxWidth: 300,
                marginInline: 'auto',
                fontFamily: 'Fraunces, "Instrument Serif", Georgia, serif',
                fontStyle: 'italic',
              }}
            >
              {motivation.text}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="stage2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto', width: '100%' }}
          >
            <p style={{ fontSize: 13, color: '#888888', margin: '0 0 14px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              {t.upNext}
            </p>
            <p
              style={{
                fontSize: 'clamp(36px, 11vw, 56px)',
                fontWeight: 600,
                color: '#111111',
                margin: '0 0 14px',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                fontFamily: 'Fraunces, "Instrument Serif", Georgia, serif',
              }}
            >
              {meta.name}
            </p>
            <p
              style={{
                fontSize: 'clamp(16px, 4.5vw, 20px)',
                color: '#534AB7',
                margin: '0 0 18px',
                lineHeight: 1.35,
                fontWeight: 500,
                fontStyle: 'italic',
                fontFamily: 'Fraunces, "Instrument Serif", Georgia, serif',
              }}
            >
              {meta.rule}
            </p>
            <p
              style={{
                fontSize: 'clamp(15px, 4vw, 17px)',
                color: '#444444',
                margin: '0 0 28px',
                lineHeight: 1.6,
                maxWidth: 480,
                marginInline: 'auto',
              }}
            >
              {meta.explainer}
            </p>
            <button
              type="button"
              onClick={onDone}
              autoFocus
              className="gt-start-btn"
              style={{
                background: '#111111',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 24,
                padding: '16px 48px',
                fontSize: 17,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Fraunces, "Instrument Serif", Georgia, serif',
                minHeight: 52,
              }}
            >
              {t.start}
            </button>
            <style>{`
              @media (max-width: 480px) {
                .gt-start-btn { width: 100%; padding: 16px 24px !important; }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
