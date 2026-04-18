/* SpeedMathGame — 10-round arithmetic sprint.
 *
 * cognitiveRating is 800–2000 in this system (NOT the 0–100 the spec used).
 * Mapped difficulty bands to match SchulteGame's convention:
 *   <= 1200        → add/sub only,          numbers 1–10
 *   1201–1600      → + multiplication,      numbers 1–12
 *   > 1600         → + division,            numbers 1–20
 *
 * Score per round: 12 if correct and fast (<2s), 8 if correct and slow (2–5s),
 * 0 if wrong or no response. Final = min(100, round(total / 120 * 100)).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from './games.types';
import { ACCENT, FEEDBACK, HELP_HIGHLIGHT_BOX_SHADOW } from './games.types';

const TOTAL_ROUNDS = 10;
const POINTS_FAST = 12;
const POINTS_SLOW = 8;
const MAX_POINTS = TOTAL_ROUNDS * POINTS_FAST;
const FEEDBACK_PAUSE_MS = 500;
const HELP_HIGHLIGHT_MS = 1500;

type Op = '+' | '−' | '×' | '÷';

interface Round {
  a: number;
  b: number;
  op: Op;
  answer: number;
  options: number[]; // length 3, shuffled
}

interface Difficulty {
  ops: Op[];
  max: number;
  roundSec: number;   // per-round time limit
  fastMs: number;     // under this = fast correct (12pts)
}

function difficultyFor(rating: number): Difficulty {
  // cognitiveRating is a 0–100 scale in the current Spark session flow.
  // <40 → low, 40–70 → medium, >70 → high. Maps the spec's taskComplexity
  // tiers onto rating without adding a second prop.
  if (rating < 40) return { ops: ['+', '−'], max: 5, roundSec: 4, fastMs: 2000 };
  if (rating <= 70) return { ops: ['+', '−', '×'], max: 12, roundSec: 3, fastMs: 1500 };
  return { ops: ['+', '−', '×', '÷'], max: 20, roundSec: 2.5, fastMs: 1250 };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(xs: T[]): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i]!, out[j]!] = [out[j]!, out[i]!];
  }
  return out;
}

function makeRound(diff: Difficulty): Round {
  const op = diff.ops[randInt(0, diff.ops.length - 1)]!;
  let a: number;
  let b: number;
  let answer: number;

  switch (op) {
    case '+': {
      a = randInt(1, diff.max);
      b = randInt(1, diff.max);
      answer = a + b;
      break;
    }
    case '−': {
      // Generate two numbers, always put the larger first so the result
      // is never negative (answer ≥ 1 since we require a > b).
      const x = randInt(2, diff.max);
      const y = randInt(1, x - 1);
      a = x;
      b = y;
      answer = a - b;
      break;
    }
    case '×': {
      a = randInt(1, Math.min(diff.max, 12));
      b = randInt(1, Math.min(diff.max, 12));
      answer = a * b;
      break;
    }
    case '÷': {
      // Build it as b × answer = a so that division is clean
      b = randInt(2, Math.min(diff.max, 12));
      answer = randInt(1, Math.min(diff.max, 12));
      a = b * answer;
      break;
    }
  }

  // Build 2 plausible distractors that are close to the answer but distinct
  const distractors = new Set<number>();
  let guard = 0;
  while (distractors.size < 2 && guard < 40) {
    guard += 1;
    const delta = randInt(1, 5) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate >= 0 && candidate !== answer) distractors.add(candidate);
  }
  // Fallback if loop didn't fill (answer is 0 or 1)
  let fallback = answer + 1;
  while (distractors.size < 2) {
    if (fallback !== answer && fallback >= 0) distractors.add(fallback);
    fallback += 1;
  }

  const options = shuffle([answer, ...distractors]);
  return { a, b, op, answer, options };
}

// Math equations always use universal Western/Latin numerals.
function formatNumber(n: number): string {
  return String(n);
}

// ---------- i18n ----------
const TEXT = {
  en: {
    round: (i: number, n: number) => `Round ${i} of ${n}`,
    score: (s: number) => `Score: ${s}`,
    help: 'Help',
    complete: 'Complete',
    correct: 'Correct',
    finalScore: 'Score',
  },
  ar: {
    round: (i: number, n: number) => `الجولة ${i} من ${n}`,
    score: (s: number) => `النتيجة: ${s}`,
    help: 'مساعدة',
    complete: 'اكتمل',
    correct: 'الإجابات الصحيحة',
    finalScore: 'النتيجة',
  },
} as const;

type RoundState = 'asking' | 'feedback-ok' | 'feedback-bad';

export default function SpeedMathGame({ language, cognitiveRating, onComplete }: GameProps) {
  const t = TEXT[language];
  const difficulty = useMemo(() => difficultyFor(cognitiveRating), [cognitiveRating]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<Round>(() => makeRound(difficulty));
  const [secondsLeft, setSecondsLeft] = useState(difficulty.roundSec);
  const [totalPoints, setTotalPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [state, setState] = useState<RoundState>('asking');
  const [picked, setPicked] = useState<number | null>(null);
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [helpHighlighted, setHelpHighlighted] = useState(false);

  const startedAt = useRef<number>(Date.now());
  const roundStartedAt = useRef<number>(Date.now());
  const responseTimes = useRef<number[]>([]);
  const finished = useRef(false);
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

  // Clear highlight when leaving asking state (round changes)
  useEffect(() => {
    if (state !== 'asking' && helpHighlighted) {
      setHelpHighlighted(false);
      if (helpTimer.current) clearTimeout(helpTimer.current);
    }
  }, [state, helpHighlighted]);

  // Per-round countdown. Ticks every 100ms for smooth bar.
  useEffect(() => {
    if (phase !== 'playing' || state !== 'asking') return;
    if (secondsLeft <= 0) {
      // Time's up — no response = wrong, 0 points
      setState('feedback-bad');
      setPicked(null);
      setTimeout(nextRound, FEEDBACK_PAUSE_MS);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => +(s - 0.1).toFixed(1)), 100);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state, secondsLeft]);

  function nextRound() {
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        const score = Math.min(100, Math.round((totalPoints / MAX_POINTS) * 100));
        setPhase('done');
        const rts = responseTimes.current;
        const avg = rts.length ? +(rts.reduce((a, b) => a + b, 0) / rts.length).toFixed(1) : 0;
        const fastest = rts.length ? +Math.min(...rts).toFixed(1) : 0;
        onComplete({
          gameType: 'speedmath',
          score,
          durationMs: Date.now() - startedAt.current,
          correct: correctCount,
          total: TOTAL_ROUNDS,
          stats: {
            correctAnswers: correctCount,
            totalRounds: TOTAL_ROUNDS,
            avgResponseSec: avg,
            fastestSec: fastest,
          },
        });
      }
      return;
    }
    setRoundIdx((i) => i + 1);
    setRound(makeRound(difficulty));
    setState('asking');
    setPicked(null);
    setSecondsLeft(difficulty.roundSec);
    roundStartedAt.current = Date.now();
  }

  function handleAnswer(option: number) {
    if (state !== 'asking') return;
    const elapsed = Date.now() - roundStartedAt.current;
    responseTimes.current.push(elapsed / 1000);
    setPicked(option);
    if (option === round.answer) {
      const gained = elapsed < difficulty.fastMs ? POINTS_FAST : POINTS_SLOW;
      setTotalPoints((p) => p + gained);
      setCorrectCount((c) => c + 1);
      setState('feedback-ok');
    } else {
      setState('feedback-bad');
    }
    setTimeout(nextRound, FEEDBACK_PAUSE_MS);
  }

  if (phase === 'done') {
    const finalScore = Math.min(100, Math.round((totalPoints / MAX_POINTS) * 100));
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
        <p style={{ fontSize: 60, fontWeight: 600, margin: '4px 0', fontFeatureSettings: '"tnum"' }}>
          {formatNumber(finalScore)}
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
          <div style={{ height: '100%', width: `${finalScore}%`, background: ACCENT.primary, borderRadius: 2 }} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-ash)' }}>
          {t.correct}: <strong style={{ color: 'var(--color-ink)' }}>
            {formatNumber(correctCount)} / {formatNumber(TOTAL_ROUNDS)}
          </strong>
        </p>
      </div>
    );
  }

  const timeProgress = (secondsLeft / difficulty.roundSec) * 100;
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
          marginBottom: 24,
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

      {/* Equation */}
      <div
        style={{
          background: 'var(--color-cream-2)',
          borderRadius: 12,
          padding: '36px 12px',
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 'clamp(42px, 13vw, 64px)',
            fontWeight: 600,
            color: 'var(--color-ink)',
            fontFeatureSettings: '"tnum"',
            letterSpacing: '-0.02em',
            direction: 'ltr',
          }}
        >
          {formatNumber(round.a)} {round.op} {formatNumber(round.b)} = ?
        </div>
      </div>

      {/* Answer buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {round.options.map((opt, i) => {
          const isPickedOpt = picked === opt;
          const isCorrectOpt = opt === round.answer;
          let bg = 'var(--color-cream)';
          let color = 'var(--color-ink)';
          let border = '1px solid var(--color-cream-3)';

          if (state !== 'asking' && isPickedOpt) {
            if (isCorrectOpt) {
              bg = FEEDBACK.ok;
              color = '#fff';
              border = `1px solid ${FEEDBACK.ok}`;
            } else {
              bg = FEEDBACK.bad;
              color = '#fff';
              border = `1px solid ${FEEDBACK.bad}`;
            }
          } else if (state === 'feedback-bad' && isCorrectOpt) {
            // Reveal the correct answer on a wrong pick
            bg = FEEDBACK.okBg;
            color = FEEDBACK.okText;
            border = `1px solid ${FEEDBACK.ok}`;
          }

          const isHelpHighlighted = helpHighlighted && isCorrectOpt && state === 'asking';

          return (
            <button
              key={`${roundIdx}-${i}-${opt}`}
              type="button"
              onClick={() => handleAnswer(opt)}
              disabled={state !== 'asking'}
              style={{
                background: bg,
                color,
                border,
                borderRadius: 12,
                padding: '18px 16px',
                fontSize: 24,
                fontWeight: 500,
                fontFeatureSettings: '"tnum"',
                cursor: state !== 'asking' ? 'default' : 'pointer',
                transition: 'background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s',
                direction: 'ltr',
                boxShadow: isHelpHighlighted ? HELP_HIGHLIGHT_BOX_SHADOW : undefined,
                minHeight: 52,
                width: '100%',
              }}
            >
              {formatNumber(opt)}
            </button>
          );
        })}
      </div>
    </div>
    </div>
  );
}
