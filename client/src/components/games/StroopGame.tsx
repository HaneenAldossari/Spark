/* StroopGame — 12 rounds of classic color-word Stroop interference.
 *
 * Word appears in an ink color. User must tap the INK color, not the word.
 * Every round is incongruent (word ≠ ink) — congruent rounds were removed
 * because they don't create the cognitive interference the game relies on.
 * No repeat of the same word+ink combo back-to-back.
 *
 * Scoring: correct <1.5s = 12pt, correct <3s = 8pt, else 0.
 * Final = min(100, round(total / 144 * 100)).
 *
 * Conforms to the shared GameProps / GameResult interface used by GameShell.
 * cognitiveRating is accepted but unused — the interference task is
 * inherently calibrated and doesn't benefit from difficulty scaling here.
 */
import { useEffect, useRef, useState } from 'react';
import type { GameProps } from './games.types';
import { ACCENT, FEEDBACK, HELP_HIGHLIGHT_BOX_SHADOW } from './games.types';

const TOTAL_ROUNDS = 12;
const ROUND_SECONDS = 3;
const FAST_THRESHOLD_MS = 1500;
const POINTS_FAST = 12;
const POINTS_SLOW = 8;
const MAX_POINTS = TOTAL_ROUNDS * POINTS_FAST;
const FEEDBACK_PAUSE_MS = 600;
const HELP_HIGHLIGHT_MS = 1500;

interface ColorDef {
  id: 'red' | 'blue' | 'green' | 'orange';
  name_en: string;
  name_ar: string;
  hex: string;
}

const COLORS: ColorDef[] = [
  { id: 'red',    name_en: 'RED',    name_ar: 'أحمر',  hex: '#F44336' },
  { id: 'blue',   name_en: 'BLUE',   name_ar: 'أزرق',  hex: '#2196F3' },
  { id: 'green',  name_en: 'GREEN',  name_ar: 'أخضر',  hex: '#4CAF50' },
  { id: 'orange', name_en: 'ORANGE', name_ar: 'برتقالي', hex: '#FF9800' },
];

interface Round {
  word: ColorDef;   // the written color name
  ink: ColorDef;    // the color the word is rendered in — this is the answer
}

function randItem<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!;
}

const CONGRUENT_RATE = 0.4;

function makeRound(prev: Round | null): Round {
  // ~60% incongruent (word ≠ ink) for cognitive interference, ~40% congruent
  // (word = ink) so users can't just tap the word color and trust it.
  // The ink color (the correct answer) must also differ from the previous
  // round's ink so the user can't tap the same button twice in a row.
  const wantCongruent = Math.random() < CONGRUENT_RATE;
  for (let i = 0; i < 30; i++) {
    const word = randItem(COLORS);
    const ink = wantCongruent
      ? word
      : randItem(COLORS.filter((c) => c.id !== word.id));
    if (prev && prev.ink.id === ink.id) continue;
    if (prev && prev.word.id === word.id && prev.ink.id === ink.id) continue;
    return { word, ink };
  }
  // Fallback: guaranteed different ink from prev
  const fallbackInk = prev
    ? COLORS.find((c) => c.id !== prev.ink.id && c.id !== COLORS[0]!.id) ?? COLORS[1]!
    : COLORS[1]!;
  return { word: COLORS[0]!, ink: fallbackInk };
}

type RoundState = 'asking' | 'feedback';

const TEXT = {
  en: {
    round: (i: number, n: number) => `Round ${i} of ${n}`,
    score: (s: number) => `Score: ${s}`,
    help: 'Help',
    complete: 'Complete',
    accuracy: 'Accuracy',
    sharpest: 'Sharpest round',
    playAgain: 'Play again',
    colorName: (c: ColorDef) => c.name_en,
    ms: (n: number) => `${n} ms`,
  },
  ar: {
    round: (i: number, n: number) => `الجولة ${i} من ${n}`,
    score: (s: number) => `النتيجة: ${s}`,
    help: 'مساعدة',
    complete: 'اكتمل',
    accuracy: 'الدقّة',
    sharpest: 'أسرع جولة',
    playAgain: 'اِلعب مجدّدًا',
    colorName: (c: ColorDef) => c.name_ar,
    ms: (n: number) => `${n} م.ث`,
  },
} as const;

export default function StroopGame({ language, onComplete }: GameProps) {
  const t = TEXT[language];
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<Round>(() => makeRound(null));
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [totalPoints, setTotalPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [state, setState] = useState<RoundState>('asking');
  const [picked, setPicked] = useState<ColorDef['id'] | null>(null);
  const [pickedWasCorrect, setPickedWasCorrect] = useState<boolean | null>(null);
  const [fastestMs, setFastestMs] = useState<number | null>(null);
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [restartKey, setRestartKey] = useState(0);
  const [helpHighlighted, setHelpHighlighted] = useState(false);

  const startedAt = useRef<number>(Date.now());
  const roundStartedAt = useRef<number>(Date.now());
  const responseTimes = useRef<number[]>([]);
  const finished = useRef(false);
  const prevRound = useRef<Round | null>(null);
  const helpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerHelp() {
    if (state !== 'asking') return;
    if (helpTimer.current) clearTimeout(helpTimer.current);
    setHelpHighlighted(true);
    helpTimer.current = setTimeout(() => setHelpHighlighted(false), HELP_HIGHLIGHT_MS);
  }

  useEffect(() => () => {
    if (helpTimer.current) clearTimeout(helpTimer.current);
  }, []);

  // Clear the highlight whenever we leave the asking state (round changes)
  useEffect(() => {
    if (state !== 'asking' && helpHighlighted) {
      setHelpHighlighted(false);
      if (helpTimer.current) clearTimeout(helpTimer.current);
    }
  }, [state, helpHighlighted]);

  // Reset everything on restart (Play Again)
  useEffect(() => {
    if (restartKey === 0) return;
    finished.current = false;
    prevRound.current = null;
    startedAt.current = Date.now();
    roundStartedAt.current = Date.now();
    setRoundIdx(0);
    setRound(makeRound(null));
    setSecondsLeft(ROUND_SECONDS);
    setTotalPoints(0);
    setCorrectCount(0);
    setState('asking');
    setPicked(null);
    setPickedWasCorrect(null);
    setFastestMs(null);
    setPhase('playing');
  }, [restartKey]);

  // Per-round countdown (100ms tick for smooth bar)
  useEffect(() => {
    if (phase !== 'playing' || state !== 'asking') return;
    if (secondsLeft <= 0) {
      // Time's up — treat as wrong
      setPicked(null);
      setPickedWasCorrect(false);
      setState('feedback');
      setTimeout(nextRound, FEEDBACK_PAUSE_MS);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => +(s - 0.1).toFixed(1)), 100);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state, secondsLeft]);

  function nextRound() {
    prevRound.current = round;
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        const score = Math.min(100, Math.round((totalPoints / MAX_POINTS) * 100));
        setPhase('done');
        const rts = responseTimes.current;
        const avg = rts.length ? +(rts.reduce((a, b) => a + b, 0) / rts.length).toFixed(1) : 0;
        const errors = TOTAL_ROUNDS - correctCount;
        onComplete({
          gameType: 'stroop',
          score,
          durationMs: Date.now() - startedAt.current,
          correct: correctCount,
          total: TOTAL_ROUNDS,
          stats: {
            stroopCorrect: correctCount,
            stroopTotal: TOTAL_ROUNDS,
            stroopAvgSec: avg,
            stroopErrors: errors,
          },
        });
      }
      return;
    }
    setRoundIdx((i) => i + 1);
    setRound(makeRound(prevRound.current));
    setState('asking');
    setPicked(null);
    setPickedWasCorrect(null);
    setSecondsLeft(ROUND_SECONDS);
    roundStartedAt.current = Date.now();
  }

  function handleAnswer(choice: ColorDef) {
    if (state !== 'asking') return;
    const elapsed = Date.now() - roundStartedAt.current;
    responseTimes.current.push(elapsed / 1000);
    setPicked(choice.id);
    if (choice.id === round.ink.id) {
      const gained = elapsed < FAST_THRESHOLD_MS ? POINTS_FAST : POINTS_SLOW;
      setTotalPoints((p) => p + gained);
      setCorrectCount((c) => c + 1);
      setPickedWasCorrect(true);
      setFastestMs((prev) => (prev === null || elapsed < prev ? elapsed : prev));
    } else {
      setPickedWasCorrect(false);
    }
    setState('feedback');
    setTimeout(nextRound, FEEDBACK_PAUSE_MS);
  }

  // ---------- Done screen ----------
  if (phase === 'done') {
    const finalScore = Math.min(100, Math.round((totalPoints / MAX_POINTS) * 100));
    const accuracy = Math.round((correctCount / TOTAL_ROUNDS) * 100);
    return (
      <div
        dir={language === 'ar' ? 'rtl' : 'ltr'}
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
        <p
          style={{
            fontSize: 60,
            fontWeight: 600,
            margin: '4px 0',
            fontFeatureSettings: '"tnum"',
            color: ACCENT.primary,
          }}
        >
          {finalScore}
        </p>
        <div
          style={{
            height: 4,
            background: 'var(--color-cream-2)',
            borderRadius: 2,
            margin: '16px auto 24px',
            maxWidth: 280,
            overflow: 'hidden',
          }}
        >
          <div style={{ height: '100%', width: `${finalScore}%`, background: ACCENT.primary, borderRadius: 2 }} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-ash)', marginBottom: 4 }}>
          {t.accuracy}: <strong style={{ color: 'var(--color-ink)' }}>{accuracy}%</strong>
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-ash)', marginBottom: 20 }}>
          {t.sharpest}:{' '}
          <strong style={{ color: 'var(--color-ink)' }}>
            {fastestMs !== null ? t.ms(fastestMs) : '—'}
          </strong>
        </p>
        <button
          type="button"
          onClick={() => setRestartKey((k) => k + 1)}
          style={{
            border: '1px solid var(--color-cream-3)',
            background: 'var(--color-cream)',
            color: 'var(--color-ink)',
            borderRadius: 20,
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {t.playAgain}
        </button>
      </div>
    );
  }

  // ---------- Playing ----------
  const timeProgress = (secondsLeft / ROUND_SECONDS) * 100;
  const runningScore = Math.min(100, Math.round((totalPoints / MAX_POINTS) * 100));

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} style={{ background: 'transparent', padding: '4px 0', maxWidth: 860, margin: '0 auto', width: '100%' }}>
    <div
      style={{
        background: 'transparent',
        border: 'none',
        borderRadius: 16,
        padding: 0,
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          gap: 8,
          flexDirection: 'row',
        }}
      >
        <span style={{ fontSize: 15, color: 'var(--color-ash)' }}>
          {t.round(roundIdx + 1, TOTAL_ROUNDS)}
        </span>
        <span style={{ fontSize: 15, fontWeight: 500, color: ACCENT.primary, fontFeatureSettings: '"tnum"' }}>
          {t.score(runningScore)}
        </span>
        <button
          type="button"
          onClick={triggerHelp}
          aria-label={t.help}
          disabled={state !== 'asking'}
          style={{
            border: '1px solid var(--color-cream-3)',
            background: 'var(--color-cream)',
            color: 'var(--color-ink)',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 500,
            cursor: state !== 'asking' ? 'not-allowed' : 'pointer',
            opacity: state !== 'asking' ? 0.5 : 1,
            minHeight: 44,
          }}
        >
          ? {t.help}
        </button>
      </div>

      {/* Timer bar */}
      <div
        style={{
          height: 4,
          background: 'var(--color-cream-2)',
          borderRadius: 2,
          marginBottom: 20,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${timeProgress}%`,
            background: ACCENT.primary,
            borderRadius: 2,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Word display area */}
      <div
        style={{
          background: 'var(--color-cream-2)',
          borderRadius: 12,
          padding: '48px 12px',
          textAlign: 'center',
          marginBottom: 16,
          minHeight: 140,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(40px, 13vw, 56px)',
            fontWeight: 700,
            color: round.ink.hex,
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
        >
          {t.colorName(round.word)}
        </div>
      </div>

      {/* 2×2 color buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        {COLORS.map((c) => {
          const isPicked = picked === c.id;
          const isTheCorrectAnswer = c.id === round.ink.id;
          const showingFeedback = state === 'feedback';

          // Border logic
          let border = '3px solid transparent';
          let content: React.ReactNode = t.colorName(c);

          if (showingFeedback) {
            if (isPicked && pickedWasCorrect) {
              border = '3px solid #fff';
              content = (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span aria-hidden="true">✓</span>
                  {t.colorName(c)}
                </span>
              );
            } else if (isPicked && !pickedWasCorrect) {
              border = `3px solid ${FEEDBACK.bad}`;
            } else if (!isPicked && isTheCorrectAnswer && pickedWasCorrect === false) {
              // Highlight the real answer briefly on a wrong pick or timeout
              border = '3px solid #fff';
            }
          }

          const isHelpHighlighted = helpHighlighted && isTheCorrectAnswer && state === 'asking';

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handleAnswer(c)}
              disabled={state !== 'asking'}
              style={{
                background: c.hex,
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                minHeight: 72,
                height: 72,
                borderRadius: 12,
                border,
                cursor: state !== 'asking' ? 'default' : 'pointer',
                transition: 'border-color 0.12s ease-out, box-shadow 0.15s',
                letterSpacing: '0.02em',
                boxSizing: 'border-box',
                boxShadow: isHelpHighlighted ? HELP_HIGHLIGHT_BOX_SHADOW : undefined,
                width: '100%',
              }}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
    </div>
  );
}
