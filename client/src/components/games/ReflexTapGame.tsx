/* ReflexTapGame — 12 rounds measuring reaction time.
 *
 * A circle appears at a random position after a 600–1200ms delay, user taps
 * it as fast as possible. Miss = 2500ms penalty. Final score is the average
 * of all per-round scores (see reactionToScore thresholds below).
 *
 * Shared GameResult shape is honored — avgReactionMs is shown on the done
 * screen but not passed to onComplete (the system type doesn't carry it).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from './games.types';
import { ACCENT } from './games.types';

const TOTAL_ROUNDS = 12;
const MIN_DELAY_MS = 600;
const MAX_DELAY_MS = 1200;
const MISS_MS = 2500;
const CIRCLE_SIZE = 64;
const EDGE_PADDING_PCT = 0.15;
const TAP_OUT_MS = 150;

const CIRCLE_COLORS = ['#534AB7', '#E91E8C', '#FF9800', '#2196F3', '#4CAF50'] as const;

function reactionToScore(ms: number): number {
  if (ms < 250) return 100;
  if (ms < 400) return 85;
  if (ms < 600) return 70;
  if (ms < 900) return 50;
  if (ms < 1500) return 30;
  return 0;
}

type Phase = 'waiting' | 'active' | 'tapped' | 'done';

const TEXT = {
  round: (i: number, n: number) => `Round ${i} of ${n}`,
  avg: 'Avg reaction',
  waiting: 'Get ready…',
  tapHere: 'Tap the circle',
  complete: 'Complete',
  finalScore: 'Score',
  bestAvg: 'Average reaction time',
};

export default function ReflexTapGame({ onComplete }: GameProps) {
  const t = TEXT;
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [pos, setPos] = useState<{ xPct: number; yPct: number }>({ xPct: 50, yPct: 50 });
  const [scale, setScale] = useState(1);
  const [reactions, setReactions] = useState<number[]>([]);

  const startedAt = useRef<number>(Date.now());
  const shownAt = useRef<number>(0);
  const scheduled = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);

  const clearTimers = useCallback(() => {
    if (scheduled.current) {
      clearTimeout(scheduled.current);
      scheduled.current = null;
    }
    if (missTimer.current) {
      clearTimeout(missTimer.current);
      missTimer.current = null;
    }
  }, []);

  const advance = useCallback(
    (nextReactions: number[]) => {
      if (roundIdx + 1 >= TOTAL_ROUNDS) {
        if (!finished.current) {
          finished.current = true;
          const roundScores = nextReactions.map(reactionToScore);
          const finalScore = Math.round(
            roundScores.reduce((a, b) => a + b, 0) / (roundScores.length || 1),
          );
          const correct = nextReactions.filter((ms) => ms < MISS_MS).length;
          setPhase('done');
          onComplete({
            gameType: 'reflex',
            score: Math.min(100, Math.max(0, finalScore)),
            durationMs: Date.now() - startedAt.current,
            correct,
            total: TOTAL_ROUNDS,
          });
        }
        return;
      }
      setRoundIdx((i) => i + 1);
      setPhase('waiting');
      setScale(1);
    },
    [roundIdx, onComplete],
  );

  // Schedule appearance for the current round
  useEffect(() => {
    if (phase !== 'waiting') return;
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    const usable = 1 - EDGE_PADDING_PCT * 2;
    const xPct = EDGE_PADDING_PCT * 100 + Math.random() * usable * 100;
    const yPct = EDGE_PADDING_PCT * 100 + Math.random() * usable * 100;

    scheduled.current = setTimeout(() => {
      setPos({ xPct, yPct });
      setPhase('active');
      shownAt.current = Date.now();
      // Start miss timer
      missTimer.current = setTimeout(() => {
        setReactions((prev) => {
          const next = [...prev, MISS_MS];
          setTimeout(() => advance(next), 300);
          return next;
        });
        setPhase('tapped');
      }, MISS_MS);
    }, delay);

    return () => {
      if (scheduled.current) {
        clearTimeout(scheduled.current);
        scheduled.current = null;
      }
    };
  }, [phase, roundIdx, advance]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  function handleCircleTap() {
    if (phase !== 'active') return;
    if (missTimer.current) {
      clearTimeout(missTimer.current);
      missTimer.current = null;
    }
    const ms = Date.now() - shownAt.current;
    setReactions((prev) => {
      const next = [...prev, ms];
      setTimeout(() => advance(next), TAP_OUT_MS + 80);
      return next;
    });
    setScale(0.8);
    setPhase('tapped');
  }

  // ---------- Render ----------
  const hasReactions = reactions.length > 0;
  const avgMs = hasReactions
    ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)
    : 0;
  const color = CIRCLE_COLORS[roundIdx % CIRCLE_COLORS.length]!;

  if (phase === 'done') {
    const roundScores = reactions.map(reactionToScore);
    const finalScore = Math.round(
      roundScores.reduce((a, b) => a + b, 0) / (roundScores.length || 1),
    );
    return (
      <div
        style={{
          background: 'var(--color-cream)',
          border: '1px solid var(--color-cream-3)',
          borderRadius: 16,
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--color-ink)',
        }}
      >
        <p style={{ fontSize: 12, color: 'var(--color-ash)', letterSpacing: '0.18em', marginBottom: 10, textTransform: 'uppercase' }}>
          {t.complete}
        </p>
        <p style={{ fontSize: 60, fontWeight: 600, margin: '4px 0', fontFeatureSettings: '"tnum"' }}>
          {Math.min(100, Math.max(0, finalScore))}
        </p>
        <div
          style={{
            height: 4,
            background: 'var(--color-cream-2)',
            borderRadius: 2,
            margin: '16px auto 20px',
            maxWidth: 280,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, finalScore))}%`,
              background: ACCENT.primary,
              borderRadius: 2,
            }}
          />
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-ash)' }}>
          {t.bestAvg}: <strong style={{ color: 'var(--color-ink)' }}>{avgMs} ms</strong>
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--color-cream)',
        border: '1px solid var(--color-cream-3)',
        borderRadius: 16,
        padding: '1.25rem',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexDirection: 'row',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--color-ash)' }}>
          {t.round(roundIdx + 1, TOTAL_ROUNDS)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: ACCENT.primary, fontFeatureSettings: '"tnum"' }}>
          {t.avg}: {hasReactions ? `${avgMs} ms` : '—'}
        </span>
      </div>

      {/* Play area */}
      <div
        style={{
          position: 'relative',
          background: 'var(--color-cream-2)',
          borderRadius: 12,
          height: 420,
          overflow: 'hidden',
          touchAction: 'manipulation',
        }}
      >
        {phase === 'waiting' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--color-ash)',
              fontSize: 14,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {t.waiting}
          </div>
        )}
        {(phase === 'active' || phase === 'tapped') && (
          <button
            type="button"
            onPointerDown={handleCircleTap}
            aria-label={t.tapHere}
            style={{
              position: 'absolute',
              left: `calc(${pos.xPct}% - ${CIRCLE_SIZE / 2}px)`,
              top: `calc(${pos.yPct}% - ${CIRCLE_SIZE / 2}px)`,
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              borderRadius: '50%',
              background: color,
              border: 'none',
              padding: 0,
              cursor: phase === 'active' ? 'pointer' : 'default',
              transform: `scale(${scale})`,
              transition: 'transform 150ms ease-out',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}
          />
        )}
      </div>
    </div>
  );
}
