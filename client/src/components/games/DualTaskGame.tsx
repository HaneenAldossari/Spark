import { useEffect, useRef, useState } from 'react';
import type { GameProps } from './games.types';
import { FEEDBACK } from './games.types';

const MAX_ROUNDS = 10;
const FLASH_MS = 800;

interface MathQuestion {
  display: string;
  answer: number;
  options: number[];
}

function generateMath(): MathQuestion {
  const op = Math.random() < 0.5 ? '+' : '-';
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const answer = op === '+' ? a + b : a - b;
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const offset = Math.floor(Math.random() * 5) - 2;
    const w = answer + offset;
    if (w !== answer && !wrongs.has(w)) wrongs.add(w);
  }
  const options = [answer, ...Array.from(wrongs)].sort(() => Math.random() - 0.5);
  return { display: `${a} ${op} ${b} = ?`, answer, options };
}

const LABELS = { solve: 'SOLVE', tapIt: 'TAP IT', round: 'Round', score: 'Score', hint: '+20 both · +8 one · +0 none' };

export default function DualTaskGame({ onComplete }: GameProps) {
  const t = LABELS;
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [mathQ, setMathQ] = useState<MathQuestion>(() => generateMath());
  const [visualTarget, setVisualTarget] = useState<number>(() => Math.floor(Math.random() * 9));
  const [flashVisible, setFlashVisible] = useState(true);
  const [mathAnswer, setMathAnswer] = useState<number | null>(null);
  const [visualAnswer, setVisualAnswer] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const finished = useRef(false);

  // Drive rounds
  useEffect(() => {
    if (round >= MAX_ROUNDS) {
      if (finished.current) return;
      finished.current = true;
      onComplete({
        gameType: 'dualtask',
        score: Math.min(100, Math.round((score / (MAX_ROUNDS * 20)) * 100)),
        durationMs: Date.now() - startedAt.current,
        correct: 0,
        total: MAX_ROUNDS,
      });
      return;
    }
    setMathQ(generateMath());
    setVisualTarget(Math.floor(Math.random() * 9));
    setMathAnswer(null);
    setVisualAnswer(null);
    setRevealing(false);
    setFlashVisible(true);
    const id = setTimeout(() => setFlashVisible(false), FLASH_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Resolve a round when both answers are in. Called directly from the
  // click handlers (not a useEffect) so the cleanup-on-deps-change cycle
  // can't kill the round-advance timeout before it fires.
  function resolveRound(mathPick: number, vizPick: number) {
    if (revealing) return;
    setRevealing(true);
    const mathOk = mathPick === mathQ.answer;
    const vizOk = vizPick === visualTarget;
    let delta = 0;
    if (mathOk && vizOk) delta = 20;
    else if (mathOk || vizOk) delta = 8;
    setScore((s) => s + delta);
    setTimeout(() => setRound((r) => r + 1), 480);
  }

  function pickMath(opt: number) {
    if (mathAnswer !== null || revealing) return;
    setMathAnswer(opt);
    if (visualAnswer !== null) resolveRound(opt, visualAnswer);
  }

  function pickVisual(i: number) {
    if (visualAnswer !== null || revealing) return;
    setVisualAnswer(i);
    if (mathAnswer !== null) resolveRound(mathAnswer, i);
  }

  return (
    <div className="w-full max-w-[520px] mx-auto select-none">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em] text-ink/55 mb-4">
        <span>{t.round} {round + 1} / {MAX_ROUNDS}</span>
        <span>{t.score}: {score}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Math panel */}
        <div
          style={{
            border: '1px solid rgba(14,14,16,0.12)',
            borderRadius: 10,
            padding: 14,
            background: 'var(--color-cream-2)',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: '#0F6E56', textAlign: 'center' }}>
            {t.solve}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '14px 0' }}>{mathQ.display}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {mathQ.options.map((opt) => {
              const isPicked = mathAnswer === opt;
              const correct = opt === mathQ.answer;
              const style: React.CSSProperties = {
                padding: 10,
                fontSize: 16,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid rgba(14,14,16,0.18)',
                background: 'var(--color-cream)',
                color: 'var(--color-ink)',
                cursor: mathAnswer === null ? 'pointer' : 'default',
                transition: 'all 0.15s',
              };
              if (revealing) {
                if (correct) {
                  style.background = FEEDBACK.okBg; style.borderColor = FEEDBACK.ok; style.color = FEEDBACK.okText;
                } else if (isPicked) {
                  style.background = FEEDBACK.badBg; style.borderColor = FEEDBACK.bad; style.color = FEEDBACK.badText;
                }
              } else if (isPicked) {
                style.background = FEEDBACK.okBg; style.borderColor = FEEDBACK.ok; style.color = FEEDBACK.okText;
              }
              return (
                <button
                  key={opt}
                  disabled={mathAnswer !== null}
                  onClick={() => pickMath(opt)}
                  style={style}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual panel */}
        <div
          style={{
            border: '1px solid rgba(14,14,16,0.12)',
            borderRadius: 10,
            padding: 14,
            background: 'var(--color-cream-2)',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: '#854F0B', textAlign: 'center' }}>
            {t.tapIt}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 40px)',
              gap: 4,
              justifyContent: 'center',
              margin: '14px auto 0',
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => {
              const isFlashing = flashVisible && i === visualTarget;
              const isPicked = visualAnswer === i;
              const isTarget = i === visualTarget;
              const cellStyle: React.CSSProperties = {
                width: 40,
                height: 40,
                borderRadius: 6,
                background: 'var(--color-cream)',
                border: '1px solid rgba(14,14,16,0.12)',
                cursor: visualAnswer === null ? 'pointer' : 'default',
                transition: 'background 0.2s, border 0.15s',
              };
              if (isFlashing) {
                cellStyle.background = '#BA7517';
                cellStyle.border = '2px solid #BA7517';
              }
              if (revealing) {
                if (isTarget) { cellStyle.background = FEEDBACK.ok; cellStyle.border = `2px solid ${FEEDBACK.ok}`; }
                else if (isPicked) { cellStyle.background = FEEDBACK.bad; cellStyle.border = `2px solid ${FEEDBACK.bad}`; }
              } else if (isPicked) {
                cellStyle.background = '#FAEEDA';
                cellStyle.border = '2px solid #BA7517';
              }
              return (
                <button
                  key={i}
                  disabled={visualAnswer !== null}
                  onClick={() => pickVisual(i)}
                  style={cellStyle}
                  aria-label={`cell ${i}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-ink/55 mt-4">{t.hint}</div>
    </div>
  );
}
