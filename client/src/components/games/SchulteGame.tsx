import { useState, useEffect, useRef, type CSSProperties } from 'react';
import type { GameProps, GameResult } from './games.types';

// Re-export with the standalone names so the sandbox (which imports them
// directly) keeps compiling. They alias to the shared shapes.
export type SchulteGameResult = GameResult;
export type SchulteGameProps = GameProps;

type GamePhase = 'idle' | 'playing' | 'done';

// ---------- Constants ----------
const COLORS = {
  primary:      '#534AB7',
  primaryLight: '#EEEDFE',
  primaryDark:  '#3C3489',
  success:      '#1D9E75',
  successLight: '#EAF3DE',
  successDark:  '#27500A',
  danger:       '#D85A30',
  dangerLight:  '#FAECE7',
  dangerDark:   '#712B13',
} as const;

// Project-local token substitutes — keeps the component standalone.
const TOK = {
  bgSecondary: 'var(--color-cream-2)',
  bgPrimary:   'var(--color-cream)',
  textPrimary: 'var(--color-ink)',
  textMuted:   'var(--color-ash)',
  borderHair:  'rgba(14,14,16,0.10)',
  borderSoft:  'rgba(14,14,16,0.18)',
} as const;

const TEXT = {
  en: {
    idle_instruction: 'Keep your eyes on the center. Use peripheral vision.',
    next: 'Next',
    completed: 'Completed',
    score: 'Score',
    playAgain: 'Play again',
    help: 'Help',
    excellent: 'Excellent',
    good: 'Good',
    keepGoing: 'Keep going',
    tryAgain: 'Try again',
  },
  ar: {
    idle_instruction: 'ثبِّت عينيك في المنتصف. استخدم الرؤية المحيطيّة.',
    next: 'التالي',
    completed: 'اكتمل',
    score: 'النتيجة',
    playAgain: 'اِلعب مجدّدًا',
    help: 'مساعدة',
    excellent: 'ممتاز',
    good: 'جيّد',
    keepGoing: 'واصل',
    tryAgain: 'حاول مجدّدًا',
  },
} as const;

type GridSize = 4 | 5 | 6;

const HELP_HIGHLIGHT_MS = 800;

// ---------- Helpers ----------
function generateGrid(size: number): number[] {
  const nums = Array.from({ length: size * size }, (_, i) => i + 1);
  // Fisher-Yates — temp swap is friendlier to noUncheckedIndexedAccess.
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = nums[i]!;
    nums[i] = nums[j]!;
    nums[j] = tmp;
  }
  return nums;
}

function calculateScore(durationMs: number, gridSize: number, errors: number): number {
  // Linear penalty model. Reference times updated 2026-04: the grid is
  // locked to 4×4, so the expected completion window is tighter than the
  // old 20s spec. 12s target with a steeper −4pts/s penalty rewards speed
  // and keeps full marks within reach for a focused player.
  const config: Record<4 | 5 | 6, { refSec: number; coeff: number }> = {
    4: { refSec: 12, coeff: 4 },
    5: { refSec: 45, coeff: 1.5 },
    6: { refSec: 90, coeff: 0.8 },
  };
  const { refSec, coeff } = config[(gridSize as 4 | 5 | 6)] ?? config[4];
  const elapsedSec = durationMs / 1000;
  const speedPenalty = Math.max(0, (elapsedSec - refSec) * coeff);
  const errorPenalty = errors * 3;
  const raw = 100 - speedPenalty - errorPenalty;
  // Min 0 — 0 is a legitimate "very poor performance" outcome, not a skip marker.
  return Math.round(Math.min(100, Math.max(0, raw)));
}

function getLabel(score: number, t: { excellent: string; good: string; keepGoing: string; tryAgain: string }): string {
  if (score >= 85) return t.excellent;
  if (score >= 65) return t.good;
  if (score >= 45) return t.keepGoing;
  return t.tryAgain;
}

function getAutoGridSize(_rating: number): GridSize {
  // Locked to 4×4 (16 numbers) for every player. Earlier versions scaled
  // with cognitiveRating, but the 5- and 6-grid variants were dropped
  // per product decision — one consistent board for all sessions.
  return 4;
}

// ---------- Component ----------
export default function SchulteGame({ language, cognitiveRating, onComplete }: GameProps) {
  const autoSize = getAutoGridSize(cognitiveRating ?? 50);
  const [gridSize, setGridSize] = useState<GridSize>(autoSize);
  const totalNumbers = gridSize * gridSize;

  const [phase, setPhase] = useState<GamePhase>('playing');
  const [grid, setGrid] = useState<number[]>(() => generateGrid(autoSize));
  const [nextTarget, setNextTarget] = useState<number>(1);
  const [startTime, setStartTime] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState<number>(0);
  const [wrongTap, setWrongTap] = useState<number | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [helpHinted, setHelpHinted] = useState(false);
  const [finalResult, setFinalResult] = useState<GameResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState<number>(60);
  const completed = useRef(false);
  const helpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = TEXT[language];

  function triggerHelp() {
    if (phase !== 'playing') return;
    if (helpTimer.current) clearTimeout(helpTimer.current);
    setHelpHinted(true);
    helpTimer.current = setTimeout(() => setHelpHinted(false), HELP_HIGHLIGHT_MS);
  }

  useEffect(() => () => {
    if (helpTimer.current) clearTimeout(helpTimer.current);
  }, []);

  // Measure container width to size cells — keeps the grid responsive.
  useEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const size = Math.max(44, Math.floor((w - (gridSize - 1) * 4) / gridSize));
      setCellSize(size);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [gridSize]);

  // Timer — 100ms tick while playing.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(id);
  }, [phase, startTime]);

  function startGame(size: GridSize = gridSize) {
    setGridSize(size);
    completed.current = false;
    setGrid(generateGrid(size));
    setNextTarget(1);
    setStartTime(Date.now());
    setElapsed(0);
    setErrorCount(0);
    setFinalResult(null);
    setWrongTap(null);
    setPhase('playing');
  }

  function handleTap(number: number) {
    if (phase !== 'playing') return;
    if (number === nextTarget) {
      if (number === totalNumbers) {
        if (completed.current) return;
        completed.current = true;
        const finalMs = Date.now() - startTime;
        const result: GameResult = {
          gameType: 'schulte',
          score: calculateScore(finalMs, gridSize, errorCount),
          durationMs: finalMs,
          correct: Math.max(0, totalNumbers - errorCount),
          total: totalNumbers,
          stats: {
            timeTakenSec: +(finalMs / 1000).toFixed(1),
            numbersFound: totalNumbers,
            totalNumbers,
            gridSize,
          },
        };
        setElapsed(finalMs);
        setFinalResult(result);
        setPhase('done');
        onComplete(result);
      } else {
        setNextTarget((prev) => prev + 1);
      }
    } else {
      setWrongTap(number);
      setErrorCount((c) => c + 1);
      setTimeout(() => setWrongTap((w) => (w === number ? null : w)), 400);
    }
  }

  function getCellStyle(number: number): CSSProperties {
    // Cell states:
    //   wrong       → red flash for 400 ms after a wrong tap
    //   found       → already tapped, stays purple
    //   helpTarget  → user pressed Help — next target flashes brighter and
    //                 scales up briefly. Deliberately breaks the "no hint"
    //                 rule: that's the point of the help button.
    //   default     → not yet tapped (the next target is NOT visually
    //                 marked normally — peripheral-vision exercise)
    const found = number < nextTarget;
    const wrong = number === wrongTap;
    const helpTarget = helpHinted && number === nextTarget;
    const fontSize = Math.max(16, Math.round(cellSize * 0.35));

    const base: CSSProperties = {
      width: cellSize,
      height: cellSize,
      minWidth: 44,
      minHeight: 44,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize,
      fontWeight: 500,
      cursor: phase === 'playing' ? 'pointer' : 'default',
      userSelect: 'none',
      touchAction: 'none',
      transition: 'background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s, box-shadow 0.15s',
      fontFeatureSettings: '"tnum"',
    };

    if (wrong) {
      base.background = COLORS.dangerLight;
      base.color = COLORS.dangerDark;
      base.border = `1.5px solid ${COLORS.danger}`;
    } else if (helpTarget) {
      base.background = COLORS.primaryLight;
      base.color = COLORS.primaryDark;
      base.border = `2px solid ${COLORS.primary}`;
      base.transform = 'scale(1.15)';
      base.zIndex = 20;
      base.boxShadow = '0 0 0 3px #534AB7, 0 0 14px rgba(83,74,183,0.6)';
    } else if (found) {
      base.background = COLORS.primary;
      base.color = '#FFFFFF';
      base.border = 'none';
    } else {
      base.background = TOK.bgSecondary;
      base.color = TOK.textPrimary;
      base.border = `0.5px solid ${TOK.borderHair}`;
    }
    return base;
  }

  const elapsedDisplay = (elapsed / 1000).toFixed(1) + 's';

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} style={{ background: 'transparent', padding: '4px 0', maxWidth: 860, margin: '0 auto', width: '100%' }}>
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: 520, margin: '0 auto', padding: '0 0 1rem' }}
    >
      {phase === 'playing' && (
        <>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              fontSize: 14,
              gap: 6,
              flexDirection: 'row',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: TOK.textMuted }}>
              {t.next}:{' '}
              <span style={{ fontWeight: 600, color: COLORS.primary, fontSize: 18 }}>
                {nextTarget}
              </span>
            </span>
            <span style={{ fontWeight: 500, color: TOK.textPrimary, fontFeatureSettings: '"tnum"' }}>
              {elapsedDisplay}
            </span>
            <button
              type="button"
              onClick={triggerHelp}
              aria-label={t.help}
              disabled={phase !== 'playing'}
              style={{
                border: `0.5px solid ${TOK.borderSoft}`,
                background: TOK.bgPrimary,
                color: TOK.textPrimary,
                borderRadius: 999,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 500,
                cursor: phase === 'playing' ? 'pointer' : 'not-allowed',
                opacity: phase === 'playing' ? 1 : 0.5,
                minHeight: 44,
              }}
            >
              ? {t.help}
            </button>
          </div>

          {/* Grid */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                gap: 4,
                touchAction: 'none',
                justifyContent: 'center',
              }}
            >
              {grid.map((number) => (
                <div
                  key={number}
                  style={getCellStyle(number)}
                  onClick={() => handleTap(number)}
                  onTouchStart={(e) => { e.preventDefault(); handleTap(number); }}
                >
                  {number}
                </div>
              ))}
            </div>

            {/* Center fixation dot */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: TOK.borderSoft,
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          </div>
        </>
      )}

      {phase === 'done' && finalResult && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ fontSize: 13, color: TOK.textMuted, marginBottom: 8 }}>{t.completed}</p>
          <p style={{ fontSize: 36, fontWeight: 600, color: COLORS.primary, marginBottom: 4, fontFeatureSettings: '"tnum"' }}>
            {(finalResult.durationMs / 1000).toFixed(1)}s
          </p>
          <p style={{ fontSize: 18, fontWeight: 500, color: TOK.textPrimary, marginBottom: 4 }}>
            {t.score}: {finalResult.score}
          </p>
          <p style={{ fontSize: 13, color: TOK.textMuted, marginBottom: 16 }}>
            {getLabel(finalResult.score, t)}
          </p>

          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: TOK.bgSecondary,
              marginBottom: 24,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${finalResult.score}%`,
                borderRadius: 3,
                background: COLORS.primary,
                transition: 'width 0.6s ease-out',
              }}
            />
          </div>

          <button
            onClick={() => startGame(gridSize)}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: `0.5px solid ${TOK.borderSoft}`,
              background: TOK.bgPrimary,
              color: TOK.textPrimary,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t.playAgain}
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
