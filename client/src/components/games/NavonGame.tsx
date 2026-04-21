/* NavonGame — 12-round Navon letter task.
 * A large letter shape is made of small repeated letters. User must
 * identify the SMALL letter, ignoring the global shape. Trains
 * inhibitory control via local-focus visual processing (Navon 1977).
 */
import { useEffect, useRef, useState } from 'react';
import type { GameProps, GameResult } from './games.types';
import { ACCENT, HELP_HIGHLIGHT_BOX_SHADOW } from './games.types';

const TOTAL_ROUNDS = 12;
const FEEDBACK_MS = 300;
const HELP_MS = 1500;
const MAX_HELPS = 2;
const LETTERS = ['H', 'E', 'S', 'F', 'Z', 'L', 'T', 'U'];

const LETTER_PATTERNS: Record<string, [number, number][]> = {
  H: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[3,1],[3,2],[3,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4]],
  E: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[4,0],[5,0],[6,0],[6,1],[6,2],[6,3],[6,4]],
  S: [[0,1],[0,2],[0,3],[0,4],[1,0],[2,0],[2,1],[2,2],[2,3],[3,4],[4,4],[5,4],[6,0],[6,1],[6,2],[6,3]],
  F: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[2,0],[2,1],[2,2],[2,3],[3,0],[4,0],[5,0],[6,0]],
  Z: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,3],[2,2],[3,2],[4,2],[5,1],[6,0],[6,1],[6,2],[6,3],[6,4]],
  L: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[6,1],[6,2],[6,3],[6,4]],
  T: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2]],
  U: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,1],[6,2],[6,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4]],
};

interface NavonRound {
  bigLetter: string;
  smallLetter: string;
  options: string[];
}

function generateRound(prev: NavonRound | null): NavonRound {
  for (let i = 0; i < 20; i++) {
    const bigLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)]!;
    let smallLetter: string;
    do {
      smallLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)]!;
    } while (smallLetter === bigLetter);
    if (prev && prev.bigLetter === bigLetter && prev.smallLetter === smallLetter) continue;
    // The big letter is ALWAYS included as an option — it's the Navon
    // interference trap. User must resist the global shape to pick the
    // correct small letter.
    const otherDistractors = LETTERS
      .filter((l) => l !== bigLetter && l !== smallLetter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 1);
    const options = [smallLetter, bigLetter, ...otherDistractors].sort(() => Math.random() - 0.5);
    return { bigLetter, smallLetter, options };
  }
  return { bigLetter: 'H', smallLetter: 'E', options: ['E', 'H', 'S'].sort(() => Math.random() - 0.5) };
}

function roundScore(responseMs: number, correct: boolean): number {
  if (!correct) return 0;
  if (responseMs < 1000) return 12;
  if (responseMs < 2000) return 10;
  if (responseMs < 3000) return 8;
  return 6;
}

const TEXT = {
  en: { name: 'Navon Letters', instr: 'Tap the SMALL letter that makes up the big shape.', question: 'What is the small letter?', help: 'Help', score: 'Score', round: 'Round', start: 'Start', complete: 'Complete', accuracy: 'Accuracy', avgTime: 'Avg response', playAgain: 'Play again' },
  ar: { name: 'حروف نافون', instr: 'اضغط الحرف الصغير، لا الكبير.', question: 'ما الحرف الصغير؟', help: 'مساعدة', score: 'النتيجة', round: 'الجولة', start: 'هيّا', complete: 'اكتمل', accuracy: 'الدقّة', avgTime: 'متوسّط الزمن', playAgain: 'اِلعب مجدّدًا' },
} as const;

export default function NavonGame({ language, onComplete }: GameProps) {
  const t = TEXT[language];
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<NavonRound>(() => generateRound(null));
  const [totalPoints, setTotalPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ picked: string; correct: boolean } | null>(null);
  const [helpHighlight, setHelpHighlight] = useState(false);
  const [helpsUsed, setHelpsUsed] = useState(0);

  const startedAt = useRef(Date.now());
  const roundStartedAt = useRef(Date.now());
  const responseTimes = useRef<number[]>([]);
  const finished = useRef(false);
  const helpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRound = useRef<NavonRound | null>(null);

  useEffect(() => () => { if (helpTimer.current) clearTimeout(helpTimer.current); }, []);

  function handleAnswer(letter: string) {
    if (feedback) return;
    const elapsed = Date.now() - roundStartedAt.current;
    responseTimes.current.push(elapsed);
    const correct = letter === round.smallLetter;
    if (correct) {
      setCorrectCount((c) => c + 1);
      setTotalPoints((p) => p + roundScore(elapsed, true));
    }
    setFeedback({ picked: letter, correct });
    setHelpHighlight(false);
    setTimeout(nextRound, FEEDBACK_MS);
  }

  function nextRound() {
    prevRound.current = round;
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      if (!finished.current) {
        finished.current = true;
        const helpMult = helpsUsed === 0 ? 1 : helpsUsed === 1 ? 0.85 : 0.7;
        const raw = Math.min(100, Math.round((totalPoints / (TOTAL_ROUNDS * 12)) * 100 * helpMult));
        const rts = responseTimes.current;
        const avg = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
        setPhase('done');
        onComplete({
          gameType: 'navon',
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
    setRound(generateRound(prevRound.current));
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
        <button type="button" onClick={() => { finished.current = false; setRoundIdx(0); setTotalPoints(0); setCorrectCount(0); setHelpsUsed(0); responseTimes.current = []; setFeedback(null); setRound(generateRound(null)); prevRound.current = null; startedAt.current = Date.now(); roundStartedAt.current = Date.now(); setPhase('playing'); }} style={{ border: '1px solid var(--color-cream-3)', background: 'var(--color-cream)', color: 'var(--color-ink)', borderRadius: 999, padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{t.playAgain}</button>
      </div>
    );
  }

  // ---------- Playing ----------
  const pattern = LETTER_PATTERNS[round.bigLetter] ?? [];
  const runningScore = Math.min(100, Math.round((totalPoints / (TOTAL_ROUNDS * 12)) * 100));

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} style={{ background: 'transparent', padding: '4px 0', maxWidth: 860, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 6, flexDirection: 'row', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: 'var(--color-ash)' }}>{t.round} {roundIdx + 1} / {TOTAL_ROUNDS}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: ACCENT.primary, fontFeatureSettings: '"tnum"' }}>{t.score}: {runningScore}</span>
        <button type="button" onClick={triggerHelp} disabled={!!feedback || helpsUsed >= MAX_HELPS} style={{ border: '1px solid var(--color-cream-3)', background: 'var(--color-cream)', color: 'var(--color-ink)', borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: helpsUsed >= MAX_HELPS ? 'not-allowed' : 'pointer', opacity: helpsUsed >= MAX_HELPS ? 0.4 : 1, minHeight: 44 }}>{t.help} ({MAX_HELPS - helpsUsed})</button>
      </div>

      {/* Navon letter display */}
      <div style={{ background: 'var(--color-cream-2)', borderRadius: 12, padding: '24px 16px', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
        <svg viewBox="0 0 100 140" width="100%" height="auto" style={{ display: 'block', maxWidth: 200, maxHeight: 280 }}>
          {pattern.map(([row, col], i) => (
            <text
              key={i}
              x={col * 20 + 10}
              y={row * 20 + 16}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill={ACCENT.primary}
              fontFamily="monospace"
            >
              {round.smallLetter}
            </text>
          ))}
        </svg>
      </div>

      {/* Question */}
      <p style={{ fontSize: 14, color: 'var(--color-ash)', textAlign: 'center', margin: '0 0 12px' }}>{t.question}</p>

      {/* Options */}
      <div className="navon-options" style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
        {round.options.map((letter) => {
          const isPicked = feedback?.picked === letter;
          const isCorrect = letter === round.smallLetter;
          let border = '2px solid var(--color-cream-3)';
          if (feedback) {
            if (isPicked && feedback.correct) border = '2px solid #4CAF50';
            else if (isPicked && !feedback.correct) border = '2px solid #F44336';
            else if (isCorrect) border = '2px solid #4CAF50';
          }
          const isHelpHighlighted = helpHighlight && isCorrect && !feedback;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => handleAnswer(letter)}
              disabled={!!feedback}
              style={{
                width: '100%',
                padding: '16px 0',
                fontSize: 22,
                fontWeight: 600,
                background: 'var(--color-cream)',
                color: 'var(--color-ink)',
                border,
                borderRadius: 12,
                cursor: feedback ? 'default' : 'pointer',
                fontFamily: 'monospace',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxShadow: isHelpHighlighted ? HELP_HIGHLIGHT_BOX_SHADOW : undefined,
                minHeight: 52,
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
