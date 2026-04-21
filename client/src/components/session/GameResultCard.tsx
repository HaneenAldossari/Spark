/* GameResultCard — per-game result screen shown for 3 seconds between
 * game end and the between-game transition. Auto-advances, no button.
 */
import { useEffect, useState } from 'react';
import type { GameType, GameStats } from '../games/games.types';
import { ACCENT, GAME_META } from '../games/games.types';

interface GameResultCardProps {
  gameType: GameType;
  score: number;
  stats?: GameStats;
  language: 'ar' | 'en';
  onDone: () => void;
}

const DISPLAY_MS = 3000;
const COUNT_UP_MS = 800;

// ---------- Messages ----------
type Tier = 'high' | 'mid' | 'low';
function getTier(score: number): Tier {
  if (score >= 70) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

const MESSAGES: Record<'en' | 'ar', Record<string, Record<Tier, string>>> = {
  en: {
    schulte: {
      high: 'Sharp eyes. Found all {numbersFound} in {timeTakenSec}s.',
      mid:  'Good scan. {numbersFound} found in {timeTakenSec}s.',
      low:  'Warm-up done. The next game will be sharper.',
    },
    nback: {
      high: 'Strong memory. {correct} correct, {bestStreak} streak.',
      mid:  '{correct} correct. Working memory warming up.',
      low:  'Tough game. Your brain noticed every round.',
    },
    dotconnect: {
      high: '{puzzlesSolved} puzzles solved. Clean spatial thinking.',
      mid:  '{puzzlesSolved} of {totalPuzzles} solved. Good routing.',
      low:  'Spatial warm-up done. Next games will benefit.',
    },
    speedmath: {
      high: '{correctAnswers}/{totalRounds} correct. Fastest: {fastestSec}s.',
      mid:  '{correctAnswers} correct. Avg {avgResponseSec}s per question.',
      low:  'Numbers warming up. Brain is engaging.',
    },
    stroop: {
      high: '{stroopCorrect}/{stroopTotal} correct. Avg {stroopAvgSec}s — fast.',
      mid:  '{stroopCorrect} correct. Inhibitory control active.',
      low:  'Color conflict is real. You pushed through.',
    },
    navon: {
      high: '{correctAnswers}/{totalRounds} correct. Local focus locked in.',
      mid:  '{correctAnswers} correct. Global shape didn\'t fool you.',
      low:  'Visual warm-up done. Next game benefits.',
    },
    mentalrotation: {
      high: '{correctAnswers}/{totalRounds} correct. Strong spatial sense.',
      mid:  '{correctAnswers} correct. Parietal cortex engaged.',
      low:  'Rotation is hard. Your brain stretched.',
    },
  },
  ar: {
    schulte: {
      high: 'عينٌ حادّة. {numbersFound} أرقام في {timeTakenSec} ثانية.',
      mid:  'مسحٌ جيّد. {numbersFound} في {timeTakenSec} ثانية.',
      low:  'انتهى الإحماء. اللعبة التالية أكثر حدّة.',
    },
    nback: {
      high: 'ذاكرةٌ قويّة. {correct} صحيحة، وأطول تتابع {bestStreak}.',
      mid:  '{correct} صحيحة. الذاكرة العاملة تستيقظ.',
      low:  'جولة صعبة. وقد صمدت فيها.',
    },
    dotconnect: {
      high: 'حللت {puzzlesSolved} ألغاز. تفكيرٌ مكانيّ متقن.',
      mid:  '{puzzlesSolved} من {totalPuzzles}. تخطيطٌ جيّد.',
      low:  'انتهى الإحماء المكانيّ. ما يليه يستفيد منه.',
    },
    speedmath: {
      high: '{correctAnswers}/{totalRounds} صحيحة. أسرع إجابة {fastestSec} ثانية.',
      mid:  '{correctAnswers} صحيحة. بمتوسّط {avgResponseSec} ثانية لكلّ سؤال.',
      low:  'الأرقام تُسخِّن دماغك. بدأ يستجيب.',
    },
    stroop: {
      high: '{stroopCorrect}/{stroopTotal} صحيحة. بمتوسّط {stroopAvgSec} ثانية — سرعة عالية.',
      mid:  '{stroopCorrect} صحيحة. التحكّم المعرفيّ نشِط.',
      low:  'حاولت الألوان تضليلك. لم تنخدع.',
    },
    navon: {
      high: '{correctAnswers}/{totalRounds} صحيحة. تركيزٌ محكَم على التفاصيل.',
      mid:  '{correctAnswers} صحيحة. لم يخدعك الشكل الكبير.',
      low:  'انتهى الإحماء البصريّ. اللعبة التالية ستبني عليه.',
    },
    mentalrotation: {
      high: '{correctAnswers}/{totalRounds} صحيحة. حسٌّ مكانيّ قويّ.',
      mid:  '{correctAnswers} صحيحة. القشرة الجداريّة تعمل.',
      low:  'الدوران صعب. ومع ذلك تابعت.',
    },
  },
};

function interpolate(template: string, stats: GameStats): string {
  let hasMissing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = (stats as Record<string, unknown>)[key];
    if (val === undefined || val === null) { hasMissing = true; return ''; }
    if (typeof val === 'number') return String(Math.round(val * 10) / 10);
    return String(val);
  });
  // If any placeholder was missing, clean up dangling suffixes like "s"
  // that no longer have a number in front, plus collapsed whitespace.
  if (hasMissing) {
    return out
      .replace(/\s+s(\s|\.|,|$)/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,])/g, '$1')
      .trim();
  }
  return out;
}

// ---------- Stats rows per game ----------
interface StatRow { label: string; value: string }

const STAT_LABELS = {
  en: {
    time: 'Time',
    found: 'Found',
    grid: 'Grid',
    correct: 'Correct',
    bestStreak: 'Best streak',
    solved: 'Solved',
    hints: 'Hints',
    avgTime: 'Avg time',
    fastest: 'Fastest',
    errors: 'Errors',
    score: 'Score',
  },
  ar: {
    time: 'زمن الإكمال',
    found: 'الأرقام التي وصلت إليها',
    grid: 'حجم الشبكة',
    correct: 'الإجابات الصحيحة',
    bestStreak: 'أطول تتابع',
    solved: 'المحلولة',
    hints: 'التلميحات',
    avgTime: 'متوسّط الزمن',
    fastest: 'أسرع إجابة',
    errors: 'الأخطاء',
    score: 'النتيجة',
  },
} as const;

function getStatRows(gameType: string, stats: GameStats, lang: 'ar' | 'en'): StatRow[] {
  const L = STAT_LABELS[lang];
  const sec = lang === 'ar' ? 'ث' : 's';
  switch (gameType) {
    case 'schulte': return [
      { label: L.time, value: `${stats.timeTakenSec ?? '—'}${sec}` },
      { label: L.found, value: `${stats.numbersFound ?? '—'} / ${stats.totalNumbers ?? '—'}` },
      { label: L.grid, value: stats.gridSize ? `${stats.gridSize}×${stats.gridSize}` : '—' },
    ];
    case 'nback': return [
      { label: L.correct, value: `${stats.correct ?? '—'} / ${stats.total ?? '—'}` },
      { label: L.bestStreak, value: String(stats.bestStreak ?? '—') },
    ];
    case 'dotconnect': return [
      { label: L.solved, value: `${stats.puzzlesSolved ?? '—'} / ${stats.totalPuzzles ?? '—'}` },
      { label: L.hints, value: String(stats.hintsUsed ?? 0) },
    ];
    case 'speedmath': return [
      { label: L.correct, value: `${stats.correctAnswers ?? '—'} / ${stats.totalRounds ?? '—'}` },
      { label: L.avgTime, value: `${stats.avgResponseSec ?? '—'}${sec}` },
      { label: L.fastest, value: `${stats.fastestSec ?? '—'}${sec}` },
    ];
    case 'stroop': return [
      { label: L.correct, value: `${stats.stroopCorrect ?? '—'} / ${stats.stroopTotal ?? '—'}` },
      { label: L.errors, value: String(stats.stroopErrors ?? 0) },
      { label: L.avgTime, value: `${stats.stroopAvgSec ?? '—'}${sec}` },
    ];
    case 'navon': return [
      { label: L.correct, value: `${stats.correctAnswers ?? '—'} / ${stats.totalRounds ?? '—'}` },
      { label: L.avgTime, value: `${stats.avgResponseSec ?? '—'}${sec}` },
    ];
    case 'mentalrotation': return [
      { label: L.correct, value: `${stats.correctAnswers ?? '—'} / ${stats.totalRounds ?? '—'}` },
      { label: L.avgTime, value: `${stats.avgResponseSec ?? '—'}${sec}` },
    ];
    default: return [];
  }
}

// ---------- Score count-up hook ----------
function useCountUp(target: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      setN(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

// ---------- Component ----------
export default function GameResultCard({
  gameType,
  score,
  stats = {},
  language,
  onDone,
}: GameResultCardProps) {
  const meta = GAME_META[gameType]?.[language];
  const tier = getTier(score);
  const msgTemplate = MESSAGES[language][gameType]?.[tier] ?? '';
  const message = interpolate(msgTemplate, stats);
  const rows = getStatRows(gameType, stats, language);
  const displayScore = useCountUp(score);

  // Auto-advance after 3 seconds
  useEffect(() => {
    const id = setTimeout(onDone, DISPLAY_MS);
    return () => clearTimeout(id);
  }, [onDone]);

  // Depletion bar progress (100 → 0 over 3 seconds)
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / DISPLAY_MS) * 100));
    }, 50);
    return () => clearInterval(id);
  }, []);

  const SERIF = 'Fraunces, "Instrument Serif", Georgia, serif';

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{
        background: 'transparent',
        padding: '8px 0',
        maxWidth: 860,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Game name — small all-caps label */}
      <p style={{ fontSize: 11, color: '#888888', margin: '0 0 8px', letterSpacing: '2px', textTransform: 'uppercase' }}>
        {meta?.name ?? gameType}
      </p>

      {/* Encouraging message — serif, editorial */}
      <p style={{ fontSize: 'clamp(20px, 5.5vw, 24px)', fontWeight: 600, color: '#111111', margin: '0 0 24px', lineHeight: 1.3, fontFamily: SERIF }}>
        {message}
      </p>

      {/* Thin divider */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '0 0 14px' }} />

      {/* Stat rows */}
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            fontSize: 13,
            borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
            flexDirection: 'row',
          }}
        >
          <span style={{ color: '#888888' }}>{row.label}</span>
          <span style={{ fontWeight: 600, color: '#111111', fontFeatureSettings: '"tnum"' }}>
            {row.value}
          </span>
        </div>
      ))}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '18px 0' }} />

      {/* Score — editorial */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexDirection: 'row',
        }}
      >
        <span style={{ fontSize: 13, color: '#888888' }}>
          {STAT_LABELS[language].score}
        </span>
        <span
          style={{
            fontSize: 'clamp(40px, 12vw, 56px)',
            fontWeight: 600,
            color: ACCENT.primary,
            fontFeatureSettings: '"tnum"',
            lineHeight: 1,
            fontFamily: SERIF,
          }}
        >
          {displayScore}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 3,
          background: 'rgba(0,0,0,0.08)',
          borderRadius: 2,
          margin: '14px 0 4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            background: ACCENT.primary,
            borderRadius: 2,
            transition: 'width 0.8s ease-out',
          }}
        />
      </div>

      {/* Auto-advance depletion bar */}
      <div
        style={{
          height: 2,
          background: 'rgba(14,14,16,0.04)',
          borderRadius: 1,
          marginTop: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--color-ash)',
            opacity: 0.3,
            borderRadius: 1,
            transition: 'width 50ms linear',
          }}
        />
      </div>
    </div>
  );
}
