/* MentalRotationGame — 10-round spatial rotation task.
 * Two shapes shown side by side. User decides: same shape rotated, or
 * different shapes? Trains parietal attention + spatial working memory.
 */
import { useEffect, useRef, useState } from 'react';
import type { GameProps, GameResult } from './games.types';
import { ACCENT, HELP_HIGHLIGHT_BOX_SHADOW } from './games.types';

const TOTAL_ROUNDS = 10;
const FEEDBACK_MS = 300;
const HELP_MS = 1500;
const MAX_HELPS = 2;

// All shapes are asymmetric so mirroring them produces a visibly different
// chiral orientation. Every round uses the SAME base shape on both sides —
// the "different" condition is a mirror reflection, not a different shape.
const BASE_SHAPES: { id: string; path: string }[] = [
  { id: 'L',        path: 'M 20 10 L 20 70 L 55 70 L 55 55 L 35 55 L 35 10 Z' },
  { id: 'F',        path: 'M 15 10 L 15 70 L 30 70 L 30 45 L 50 45 L 50 32 L 30 32 L 30 10 Z' },
  { id: 'S',        path: 'M 10 10 L 50 10 L 50 40 L 70 40 L 70 70 L 30 70 L 30 40 L 10 40 Z' },
  { id: 'T-offset', path: 'M 10 10 L 70 10 L 70 28 L 50 28 L 50 70 L 35 70 L 35 28 L 10 28 Z' },
  { id: 'hook',     path: 'M 15 10 L 15 70 L 60 70 L 60 50 L 40 50 L 40 35 L 60 35 L 60 10 Z' },
  { id: 'stairs',   path: 'M 10 60 L 10 45 L 30 45 L 30 30 L 50 30 L 50 15 L 70 15 L 70 30 L 65 30 L 65 45 L 45 45 L 45 60 Z' },
];

interface RotationRound {
  shapeA: { path: string; rotation: number };
  shapeB: { path: string; rotation: number; mirrored: boolean };
  isSame: boolean;
}

// Pre-generates a balanced 10-round list: 5 same + 5 mirrored, shuffled.
// Avoids RNG bias that could leave a session with e.g. 8 mirrors and 2 sames.
function generateRounds(difficulty: number, count: number): RotationRound[] {
  const half = Math.floor(count / 2);
  const plan: boolean[] = [
    ...Array(half).fill(true),
    ...Array(count - half).fill(false),
  ];
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [plan[i]!, plan[j]!] = [plan[j]!, plan[i]!];
  }
  // Also avoid the same shape appearing in consecutive rounds.
  const rounds: RotationRound[] = [];
  let prevShapeId: string | null = null;
  for (const isSameRound of plan) {
    const shape = pickShape(prevShapeId);
    rounds.push(generateRoundFromShape(shape, isSameRound, difficulty));
    prevShapeId = shape.id;
  }
  return rounds;
}

function pickShape(prevShapeId: string | null): { id: string; path: string } {
  const pool = prevShapeId ? BASE_SHAPES.filter((s) => s.id !== prevShapeId) : BASE_SHAPES;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function generateRoundFromShape(
  shape: { id: string; path: string },
  isSame: boolean,
  difficulty: number,
): RotationRound {
  // Exclude 0° so both shapes always look rotated — real cognitive work.
  const angles = difficulty < 50
    ? [45, 90, 135, 180, 225, 270]
    : [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  const rotationA = angles[Math.floor(Math.random() * angles.length)]!;
  let rotationB: number;
  do { rotationB = angles[Math.floor(Math.random() * angles.length)]!; } while (rotationB === rotationA);

  return {
    shapeA: { path: shape.path, rotation: rotationA },
    shapeB: { path: shape.path, rotation: rotationB, mirrored: !isSame },
    isSame,
  };
}

function roundScore(ms: number, correct: boolean): number {
  if (!correct) return 0;
  if (ms < 1500) return 12;
  if (ms < 3000) return 10;
  if (ms < 5000) return 8;
  return 6;
}

const TEXT = {
  en: { name: 'Mental Rotation', question: 'Same or mirrored?', same: 'Same', different: 'Mirror', help: 'Help', score: 'Score', round: 'Round', start: 'Start', instr: 'Are the two shapes the same, or is one a mirror image?', complete: 'Complete', accuracy: 'Accuracy', avgTime: 'Avg response', playAgain: 'Play again' },
  ar: { name: 'الدوران الذهنيّ', question: 'الشكل نفسه أم معكوس؟', same: 'متطابق', different: 'معكوس', help: 'مساعدة', score: 'النتيجة', round: 'الجولة', start: 'ابدأ', instr: 'هل الشكلان متطابقان، أم أنّ أحدهما صورة مرآة للآخر؟', complete: 'اكتمل', accuracy: 'الدقّة', avgTime: 'معدّل الزمن', playAgain: 'اِلعب مجدّدًا' },
} as const;

export default function MentalRotationGame({ language, cognitiveRating, onComplete }: GameProps) {
  const t = TEXT[language];
  const difficulty = cognitiveRating ?? 50;
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [roundIdx, setRoundIdx] = useState(0);
  // Pre-generate all 10 rounds so same/mirror distribution is exactly 5/5.
  const [roundList, setRoundList] = useState<RotationRound[]>(() => generateRounds(difficulty, TOTAL_ROUNDS));
  const round = roundList[roundIdx]!;
  const [totalPoints, setTotalPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ picked: 'same' | 'different'; correct: boolean } | null>(null);
  const [helpHighlight, setHelpHighlight] = useState(false);
  const [helpsUsed, setHelpsUsed] = useState(0);

  const startedAt = useRef(Date.now());
  const roundStartedAt = useRef(Date.now());
  const responseTimes = useRef<number[]>([]);
  const finished = useRef(false);
  const helpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (helpTimer.current) clearTimeout(helpTimer.current); }, []);

  function handleAnswer(answer: 'same' | 'different') {
    if (feedback) return;
    const elapsed = Date.now() - roundStartedAt.current;
    responseTimes.current.push(elapsed);
    const correct = (answer === 'same') === round.isSame;
    if (correct) {
      setCorrectCount((c) => c + 1);
      setTotalPoints((p) => p + roundScore(elapsed, true));
    }
    setFeedback({ picked: answer, correct });
    setHelpHighlight(false);
    setTimeout(nextRound, FEEDBACK_MS);
  }

  function nextRound() {
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        const helpMult = helpsUsed === 0 ? 1 : helpsUsed === 1 ? 0.85 : 0.7;
        const raw = Math.min(100, Math.round((totalPoints / (TOTAL_ROUNDS * 12)) * 100 * helpMult));
        const rts = responseTimes.current;
        const avg = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
        setPhase('done');
        onComplete({
          gameType: 'mentalrotation',
          score: Math.max(0, raw),
          correct: correctCount,
          total: TOTAL_ROUNDS,
          durationMs: Date.now() - startedAt.current,
          stats: { correctAnswers: correctCount, totalRounds: TOTAL_ROUNDS, avgResponseSec: +(avg / 1000).toFixed(1) },
        } as GameResult);
      }
      return;
    }
    setRoundIdx((i) => i + 1);
    setFeedback(null);
    roundStartedAt.current = Date.now();
  }

  function triggerHelp() {
    if (feedback || helpsUsed >= MAX_HELPS) return;
    setHelpsUsed((h) => h + 1);
    setHelpHighlight(true);
    if (helpTimer.current) clearTimeout(helpTimer.current);
    helpTimer.current = setTimeout(() => setHelpHighlight(false), HELP_MS);
  }

  // Correct answer for the help highlight
  const correctAnswer = round.isSame ? 'same' : 'different';

  // ---------- Done ----------
  if (phase === 'done') {
    const rts = responseTimes.current;
    const avg = rts.length ? (rts.reduce((a, b) => a + b, 0) / rts.length / 1000).toFixed(1) : '—';
    const helpMult = helpsUsed === 0 ? 1 : helpsUsed === 1 ? 0.85 : 0.7;
    const finalScore = Math.max(0, Math.min(100, Math.round((totalPoints / (TOTAL_ROUNDS * 12)) * 100 * helpMult)));
    return (
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} style={{ background: 'transparent', padding: '4px 0', maxWidth: 860, margin: '0 auto', width: '100%', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--color-ash)', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 8px' }}>{t.complete}</p>
        <p style={{ fontSize: 48, fontWeight: 700, color: ACCENT.primary, margin: '0 0 12px', fontFeatureSettings: '"tnum"' }}>{finalScore}</p>
        <p style={{ fontSize: 13, color: 'var(--color-ash)', margin: '0 0 4px' }}>{t.accuracy}: {correctCount}/{TOTAL_ROUNDS}</p>
        <p style={{ fontSize: 13, color: 'var(--color-ash)', margin: '0 0 20px' }}>{t.avgTime}: {avg}s</p>
        <button type="button" onClick={() => { finished.current = false; setRoundIdx(0); setTotalPoints(0); setCorrectCount(0); setHelpsUsed(0); responseTimes.current = []; setFeedback(null); setRoundList(generateRounds(difficulty, TOTAL_ROUNDS)); startedAt.current = Date.now(); roundStartedAt.current = Date.now(); setPhase('playing'); }} style={{ border: '1px solid var(--color-cream-3)', background: 'var(--color-cream)', color: 'var(--color-ink)', borderRadius: 999, padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{t.playAgain}</button>
      </div>
    );
  }

  // ---------- Playing ----------
  const runningScore = Math.min(100, Math.round((totalPoints / (TOTAL_ROUNDS * 12)) * 100));

  function buttonStyle(answer: 'same' | 'different') {
    let border = '2px solid var(--color-cream-3)';
    const isCorrectAnswer = (answer === 'same') === round.isSame;
    if (feedback) {
      if (feedback.picked === answer && feedback.correct) border = '2px solid #4CAF50';
      else if (feedback.picked === answer && !feedback.correct) border = '2px solid #F44336';
      else if (isCorrectAnswer) border = '2px solid #4CAF50';
    }
    const isHelpHighlighted = helpHighlight && answer === correctAnswer && !feedback;
    return {
      flex: 1 as const,
      padding: '16px 0',
      fontSize: 16,
      fontWeight: 600 as const,
      background: 'var(--color-cream)',
      color: 'var(--color-ink)',
      border,
      borderRadius: 12,
      cursor: feedback ? ('default' as const) : ('pointer' as const),
      transition: 'border-color 0.15s, box-shadow 0.15s',
      boxShadow: isHelpHighlighted ? HELP_HIGHLIGHT_BOX_SHADOW : undefined,
      minHeight: 52,
      width: '100%',
    };
  }

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} style={{ background: 'transparent', padding: '4px 0', maxWidth: 860, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 6, flexDirection: 'row', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: 'var(--color-ash)' }}>{t.round} {roundIdx + 1} / {TOTAL_ROUNDS}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: ACCENT.primary, fontFeatureSettings: '"tnum"' }}>{t.score}: {runningScore}</span>
        <button type="button" onClick={triggerHelp} disabled={!!feedback || helpsUsed >= MAX_HELPS} style={{ border: '1px solid var(--color-cream-3)', background: 'var(--color-cream)', color: 'var(--color-ink)', borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: helpsUsed >= MAX_HELPS ? 'not-allowed' : 'pointer', opacity: helpsUsed >= MAX_HELPS ? 0.4 : 1, minHeight: 44 }}>? {t.help} ({MAX_HELPS - helpsUsed})</button>
      </div>

      {/* Shapes side by side */}
      <div className="mr-shapes" style={{ background: 'var(--color-cream-2)', borderRadius: 12, padding: '28px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, width: 'clamp(110px, 32vw, 140px)', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 1 auto' }}>
          <svg viewBox="-10 -10 100 100" width="72%" height="72%" style={{ transform: `rotate(${round.shapeA.rotation}deg)` }}>
            <path d={round.shapeA.path} fill={ACCENT.primary} />
          </svg>
        </div>
        <span style={{ fontSize: 15, color: 'var(--color-ash)', fontWeight: 500 }}>vs</span>
        <div style={{ background: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, width: 'clamp(110px, 32vw, 140px)', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 1 auto' }}>
          <svg
            viewBox="-10 -10 100 100"
            width="72%"
            height="72%"
            style={{
              transform: round.shapeB.mirrored
                ? `rotate(${round.shapeB.rotation}deg) scaleX(-1)`
                : `rotate(${round.shapeB.rotation}deg)`,
            }}
          >
            <path d={round.shapeB.path} fill={ACCENT.primary} />
          </svg>
        </div>
      </div>

      {/* Question */}
      <p style={{ fontSize: 15, color: 'var(--color-ash)', textAlign: 'center', margin: '0 0 12px' }}>{t.question}</p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={() => handleAnswer('same')} disabled={!!feedback} style={buttonStyle('same')}>{t.same}</button>
        <button type="button" onClick={() => handleAnswer('different')} disabled={!!feedback} style={buttonStyle('different')}>{t.different}</button>
      </div>
    </div>
  );
}
