import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameProps } from './games.types';
import { FEEDBACK } from './games.types';

type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond';
type ColorName = 'red' | 'blue' | 'green' | 'purple';
type RuleName = 'color' | 'shape' | 'size';

interface ShapeData {
  type: ShapeType;
  color: ColorName;
  sizePx: 70 | 45;
}

const COLOR_HEX: Record<ColorName, string> = {
  red: '#D85A30',
  blue: '#185FA5',
  green: '#1D9E75',
  purple: '#534AB7',
};

const RULES: { name: RuleName; correct: (s: ShapeData) => string; options: string[] }[] = [
  { name: 'color', correct: (s) => s.color, options: ['red', 'blue', 'green', 'purple'] },
  { name: 'shape', correct: (s) => s.type, options: ['circle', 'square', 'triangle', 'diamond'] },
  { name: 'size', correct: (s) => (s.sizePx === 70 ? 'big' : 'small'), options: ['big', 'small'] },
];

const MAX_ROUNDS = 12;

const LABELS = {
  color: { red: 'Red', blue: 'Blue', green: 'Green', purple: 'Purple' },
  shape: { circle: 'Circle', square: 'Square', triangle: 'Triangle', diamond: 'Diamond' },
  size: { big: 'Big', small: 'Small' },
  rules: { color: 'COLOR', shape: 'SHAPE', size: 'SIZE' },
  questions: {
    color: 'What color is this shape?',
    shape: 'What shape is this?',
    size: 'Is this shape big or small?',
  },
  rule: 'Rule',
  round: 'Round',
  score: 'Score',
};

function generateShape(): ShapeData {
  const types: ShapeType[] = ['circle', 'square', 'triangle', 'diamond'];
  const colors: ColorName[] = ['red', 'blue', 'green', 'purple'];
  return {
    type: types[Math.floor(Math.random() * types.length)]!,
    color: colors[Math.floor(Math.random() * colors.length)]!,
    sizePx: Math.random() > 0.5 ? 70 : 45,
  };
}

function renderShape(shape: ShapeData) {
  const color = COLOR_HEX[shape.color];
  const s = shape.sizePx;
  switch (shape.type) {
    case 'circle':
      return <div style={{ width: s, height: s, borderRadius: '50%', background: color }} />;
    case 'square':
      return <div style={{ width: s, height: s, borderRadius: 8, background: color }} />;
    case 'triangle':
      return (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${s / 2}px solid transparent`,
            borderRight: `${s / 2}px solid transparent`,
            borderBottom: `${Math.round(s * 0.87)}px solid ${color}`,
          }}
        />
      );
    case 'diamond':
      return (
        <div
          style={{
            width: s,
            height: s,
            background: color,
            transform: 'rotate(45deg)',
            borderRadius: 4,
          }}
        />
      );
  }
}

export default function RuleSwitchGame({ onComplete }: GameProps) {
  const t = LABELS;
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentRule, setCurrentRule] = useState<typeof RULES[number] | null>(null);
  const [currentShape, setCurrentShape] = useState<ShapeData | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [pickedCorrect, setPickedCorrect] = useState<boolean | null>(null);
  const startedAt = useRef<number>(Date.now());
  const finished = useRef(false);
  const previousRule = useRef<RuleName | null>(null);

  // Drive rounds
  useEffect(() => {
    if (round >= MAX_ROUNDS) {
      if (finished.current) return;
      finished.current = true;
      onComplete({
        gameType: 'ruleswitch',
        score: Math.min(100, Math.round((correctCount / MAX_ROUNDS) * 100)),
        durationMs: Date.now() - startedAt.current,
        correct: correctCount,
        total: MAX_ROUNDS,
      });
      return;
    }
    nextRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function nextRound() {
    let newRule: typeof RULES[number];
    if (!previousRule.current || round < 2) {
      newRule = RULES[Math.floor(Math.random() * RULES.length)]!;
    } else if (Math.random() < 0.5) {
      newRule = RULES.find((r) => r.name === previousRule.current)!;
    } else {
      const others = RULES.filter((r) => r.name !== previousRule.current);
      newRule = others[Math.floor(Math.random() * others.length)]!;
    }
    previousRule.current = newRule.name;
    setCurrentRule(newRule);
    setCurrentShape(generateShape());
    setPicked(null);
    setPickedCorrect(null);
  }

  function answer(option: string) {
    if (picked !== null || !currentRule || !currentShape) return;
    const correct = option === currentRule.correct(currentShape);
    setPicked(option);
    setPickedCorrect(correct);
    if (correct) {
      setScore((s) => s + 10);
      setCorrectCount((c) => c + 1);
    }
    setTimeout(() => setRound((r) => r + 1), 380);
  }

  if (!currentRule || !currentShape) return null;

  const ruleLabel = t.rules[currentRule.name];
  const question = t.questions[currentRule.name];
  const optionLabels = (currentRule.name === 'color' ? t.color
    : currentRule.name === 'shape' ? t.shape
    : t.size) as Record<string, string>;
  const isFourOpts = currentRule.options.length === 4;

  return (
    <div className="w-full max-w-[460px] mx-auto select-none">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em] text-ink/55 mb-4">
        <span>{t.round} {round + 1} / {MAX_ROUNDS}</span>
        <span>{t.score}: {score}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${round}-${currentRule.name}`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          style={{
            background: '#E1F5EE',
            color: '#085041',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            textAlign: 'center',
            marginBottom: 18,
          }}
        >
          <div style={{ fontWeight: 600, letterSpacing: '0.06em' }}>{t.rule}: {ruleLabel}</div>
          <div style={{ marginTop: 4 }}>{question}</div>
        </motion.div>
      </AnimatePresence>

      <div className="grid place-items-center" style={{ height: 130 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`s-${round}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {renderShape(currentShape)}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isFourOpts ? '1fr 1fr' : '1fr 1fr',
          gap: 8,
          marginTop: 18,
        }}
      >
        {currentRule.options.map((opt) => {
          const isPicked = picked === opt;
          const baseStyle: React.CSSProperties = {
            padding: 12,
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 8,
            border: '1px solid rgba(14,14,16,0.18)',
            background: 'var(--color-cream-2)',
            color: 'var(--color-ink)',
            cursor: picked ? 'default' : 'pointer',
            transition: 'all 0.15s',
          };
          if (isPicked) {
            if (pickedCorrect) {
              baseStyle.background = FEEDBACK.okBg;
              baseStyle.borderColor = FEEDBACK.ok;
              baseStyle.color = FEEDBACK.okText;
            } else {
              baseStyle.background = FEEDBACK.badBg;
              baseStyle.borderColor = FEEDBACK.bad;
              baseStyle.color = FEEDBACK.badText;
            }
          }
          return (
            <button key={opt} onClick={() => answer(opt)} disabled={picked !== null} style={baseStyle}>
              {optionLabels[opt] ?? opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
