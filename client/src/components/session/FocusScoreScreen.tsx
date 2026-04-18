/* FocusScoreScreen — final score after the warm-up gauntlet + check-in.
 * Replaces the old Phase 5 launch screen.
 *
 * Three honest tiers:
 *   ≥ 80  → Ready (purple, big confetti)
 *   50–79 → Almost (amber, small confetti)
 *   < 50  → Not ready (red, no confetti)
 *
 * "Try again" restarts only the WARM-UP (gauntlet), not from Declare.
 * "Start anyway" is always present as an escape hatch on the lower tiers.
 *
 * If the user said "nervous" in the check-in, an extra acknowledgement
 * sentence is appended below the tier message.
 */
import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import type { GameType } from '../games/games.types';
import { ACCENT, GAME_META } from '../games/games.types';

type ReadinessLevel = 'ready' | 'almost' | 'notReady';

interface FocusScoreScreenProps {
  finalScore: number;
  gameScores: Partial<Record<GameType, number>>;
  taskName: string;
  language: 'ar' | 'en';
  tookBreath: boolean;            // true if user picked "nervous" → did the breathe
  onRetry: () => void;
  onStartTask: () => void;
}

const TIER_COLORS = {
  ready:    ACCENT.primary,
  almost:   '#FF9800',
  notReady: '#F44336',
} as const;

const TEXT = {
  en: {
    label: 'Focus Score',
    breathBonus: 'You took a moment to breathe. That matters.',
    startOver: 'Return to home →',
    ready: {
      title: 'Your brain is primed.',
      sub: (task: string) => `Go tackle that ${task}.`,
    },
    almost: {
      title: "You're warming up.",
      sub: 'One more round will sharpen you.',
    },
    notReady: {
      title: 'Your brain needs more warm-up.',
      sub: (task: string) => `Try again before starting ${task}.`,
    },
  },
  ar: {
    label: 'درجة التركيز',
    breathBonus: 'منحت نفسك لحظةً للتنفّس. هذا أمرٌ مهمّ.',
    startOver: 'العودة إلى الصفحة الرئيسيّة ←',
    ready: {
      title: 'دماغك مهيَّأ.',
      sub: (task: string) => `باشِر ${task}.`,
    },
    almost: {
      title: 'أوشكت على الوصول.',
      sub: 'جولةٌ إضافيّة واحدة كفيلة بصقلك.',
    },
    notReady: {
      title: 'يحتاج دماغك إلى مزيد من الإحماء.',
      sub: (task: string) => `حاول مجدّدًا قبل أن تبدأ ${task}.`,
    },
  },
} as const;

function getReadiness(score: number): ReadinessLevel {
  if (score >= 80) return 'ready';
  if (score >= 50) return 'almost';
  return 'notReady';
}

function fireConfetti(level: ReadinessLevel) {
  if (level === 'ready') {
    confetti({
      particleCount: 120,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: 0.6 },
      colors: ['#534AB7', '#E91E8C', '#FF9800', '#4CAF50', '#2196F3'],
    });
    confetti({
      particleCount: 120,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: 0.6 },
      colors: ['#534AB7', '#E91E8C', '#FF9800', '#4CAF50', '#2196F3'],
    });
  } else if (level === 'almost') {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#534AB7', '#FF9800'],
    });
  }
}

// Animate the displayed score from 0 → finalScore over ~900ms.
function useCountUp(target: number, durationMs = 900): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setN(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return n;
}

export default function FocusScoreScreen({
  finalScore,
  gameScores,
  taskName,
  language,
  tookBreath,
  onRetry: _onRetry,
  onStartTask,
}: FocusScoreScreenProps) {
  const readiness = useMemo(() => getReadiness(finalScore), [finalScore]);
  const tierColor = TIER_COLORS[readiness];
  const animatedScore = useCountUp(finalScore);
  const t = TEXT[language];

  useEffect(() => {
    const timer = setTimeout(() => fireConfetti(readiness), 400);
    return () => clearTimeout(timer);
  }, [readiness]);

  const entries = (Object.entries(gameScores) as [GameType, number][])
    .filter(([, s]) => typeof s === 'number');

  const SERIF = 'Fraunces, "Instrument Serif", Georgia, serif';

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{
        background: 'transparent',
        padding: '16px 0 28px',
        textAlign: 'center',
        color: '#111111',
        maxWidth: 860,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: '#888888',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          margin: '0 0 14px',
        }}
      >
        {t.label}
      </p>

      <p
        style={{
          fontSize: 'clamp(60px, 18vw, 88px)',
          fontWeight: 600,
          color: tierColor,
          margin: '0 0 14px',
          fontFeatureSettings: '"tnum"',
          lineHeight: 1,
          fontFamily: SERIF,
        }}
      >
        {animatedScore}
      </p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <p style={{ fontSize: 'clamp(16px, 4.5vw, 18px)', fontStyle: 'italic', margin: '0 0 4px', fontFamily: SERIF }}>
          {t[readiness].title}
        </p>
        <p style={{ fontSize: 14, color: '#888888', margin: '0 0 8px', padding: '0 8px' }}>
          {readiness === 'almost'
            ? t.almost.sub
            : (t[readiness].sub as (task: string) => string)(taskName)}
        </p>
        {tookBreath && (
          <p
            style={{
              fontSize: 13,
              color: ACCENT.primary,
              margin: '0 0 20px',
              fontStyle: 'italic',
              fontFamily: SERIF,
            }}
          >
            {t.breathBonus}
          </p>
        )}
      </motion.div>

      {/* Thin divider */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', margin: '24px 0' }} />

      {/* Game score breakdown — bar rows */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          marginBottom: 28,
          textAlign: 'left',
        }}
      >
        {entries.map(([game, score]) => {
          const meta = GAME_META[game][language];
          const color = score >= 70 ? '#4CAF50' : score >= 50 ? '#D97706' : '#DC2626';
          return (
            <div key={game}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 6,
                  flexDirection: 'row',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: '#888888',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}
                >
                  {meta.name}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color,
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  {score}
                </span>
              </div>
              <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(2, score)}%`,
                    background: color,
                    borderRadius: 2,
                    transition: 'width 0.8s ease-out',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onStartTask}
        style={{
          width: '100%',
          background: '#111111',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 24,
          padding: '16px 20px',
          fontSize: 16,
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: 10,
          fontFamily: SERIF,
          minHeight: 52,
        }}
      >
        {t.startOver}
      </button>
    </div>
  );
}
