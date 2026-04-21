import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from './games.types';
import { ACCENT, FEEDBACK, HELP_HIGHLIGHT_BOX_SHADOW } from './games.types';

const N = 2;
const TOTAL_ROUNDS = 15;
const SCOREABLE_ROUNDS = TOTAL_ROUNDS - N; // 13 rounds that produce a response
const WATCH_DISPLAY_MS = 2000;       // rounds 1–2: cell lights, auto-advance
const WATCH_GAP_MS = 300;             // brief dim before next round in watch phase
const FEEDBACK_FLASH_MS = 200;        // green/red flash on response
const POST_FEEDBACK_GAP_MS = 400;     // dim + pause before next round
const HELP_HIGHLIGHT_MS = 1000;
const FAST_MS = 2000;                 // response under 2s = fast
const PTS_FAST = 12;                  // correct + fast
const PTS_SLOW = 8;                   // correct + slow
const MAX_POSSIBLE = SCOREABLE_ROUNDS * PTS_FAST; // 13 × 12 = 156

type Response = 'correct' | 'correct_diff' | 'wrong_match' | 'wrong_diff';

function generateSequence(total: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < total; i++) {
    if (i >= N && Math.random() < 0.35) {
      seq.push(seq[i - N]!);
    } else {
      let pos: number;
      do {
        pos = Math.floor(Math.random() * 9);
      } while (i >= N && pos === seq[i - N]);
      seq.push(pos);
    }
  }
  return seq;
}

const STR = {
  en: {
    match: 'MATCH',
    different: 'DIFFERENT',
    round: 'Round',
    score: 'Score',
    help: 'Help',
    instr: 'Is this the same position as 2 steps ago?',
    watch: 'Just watch...',
  },
  ar: {
    match: 'مطابق',
    different: 'مختلف',
    round: 'الجولة',
    score: 'النتيجة',
    help: 'مساعدة',
    instr: 'هل يتطابق مع الجولة قبل السابقة؟',
    watch: 'راقب فقط…',
  },
} as const;

// Dot colors per response type — used by the history strip at the bottom.
const DOT_COLORS: Record<Response, string> = {
  correct:      FEEDBACK.ok,   // green: tapped MATCH on a real match
  correct_diff: '#6FCF97',     // light green: tapped DIFFERENT on a non-match
  wrong_match:  FEEDBACK.bad,  // red: tapped MATCH on a non-match
  wrong_diff:   FEEDBACK.warn, // amber: tapped DIFFERENT on a real match
};

type FeedbackKind = 'ok' | 'bad';

export default function NBackGame({ language, onComplete }: GameProps) {
  const sequence = useMemo(() => generateSequence(TOTAL_ROUNDS), []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  // 'lit' = cell visible and tap-able. 'dim' = brief blank gap between rounds.
  const [phase, setPhase] = useState<'lit' | 'dim'>('lit');
  // Which button (if any) is showing the green/red feedback flash right now.
  const [flash, setFlash] = useState<{ button: 'match' | 'different'; kind: FeedbackKind } | null>(null);
  const [helpHint, setHelpHint] = useState<'match' | 'different' | null>(null);

  const answeredRef = useRef(false);
  const startedAt = useRef<number>(Date.now());
  const roundStartedAt = useRef<number>(Date.now());
  const helpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);
  const t = STR[language];

  const isWatchRound = currentIdx < N;
  const activePos = phase === 'lit' && currentIdx < TOTAL_ROUNDS ? sequence[currentIdx]! : null;

  // ---------- Help ----------
  function triggerHelp() {
    if (isWatchRound || answeredRef.current || phase !== 'lit') return;
    if (helpTimer.current) clearTimeout(helpTimer.current);
    const wasMatch = sequence[currentIdx] === sequence[currentIdx - N];
    setHelpHint(wasMatch ? 'match' : 'different');
    helpTimer.current = setTimeout(() => setHelpHint(null), HELP_HIGHLIGHT_MS);
  }

  // ---------- Reset per-round bookkeeping when the round changes ----------
  useEffect(() => {
    answeredRef.current = false;
    roundStartedAt.current = Date.now();
    setHelpHint(null);
    setFlash(null);
    setPhase('lit');
    if (helpTimer.current) clearTimeout(helpTimer.current);
  }, [currentIdx]);

  // ---------- Watch-round auto-advance (rounds 1–2 only) ----------
  useEffect(() => {
    if (!isWatchRound || phase !== 'lit') return;
    if (currentIdx >= TOTAL_ROUNDS) return;
    if (watchTimer.current) clearTimeout(watchTimer.current);
    watchTimer.current = setTimeout(() => {
      setPhase('dim');
      setTimeout(() => setCurrentIdx((i) => i + 1), WATCH_GAP_MS);
    }, WATCH_DISPLAY_MS);
    return () => {
      if (watchTimer.current) clearTimeout(watchTimer.current);
    };
  }, [currentIdx, phase, isWatchRound]);

  // ---------- Cleanup on unmount ----------
  useEffect(() => () => {
    if (helpTimer.current) clearTimeout(helpTimer.current);
    if (watchTimer.current) clearTimeout(watchTimer.current);
  }, []);

  // ---------- onComplete when sequence ends ----------
  useEffect(() => {
    if (currentIdx < TOTAL_ROUNDS) return;
    if (finished.current) return;
    finished.current = true;
    const correctCount = responses.filter((r) => r === 'correct' || r === 'correct_diff').length;
    // Compute best streak
    let best = 0;
    let cur = 0;
    for (const r of responses) {
      if (r === 'correct' || r === 'correct_diff') { cur++; best = Math.max(best, cur); }
      else cur = 0;
    }
    // Spec blend: 70% accuracy, 30% speed-weighted points.
    const accuracyPct = responses.length > 0 ? (correctCount / responses.length) * 100 : 0;
    const pointsPct = (totalPoints / MAX_POSSIBLE) * 100;
    const raw = Math.round(accuracyPct * 0.7 + pointsPct * 0.3);
    onComplete({
      gameType: 'nback',
      score: Math.min(100, Math.max(0, raw)),
      durationMs: Date.now() - startedAt.current,
      correct: correctCount,
      total: responses.length,
      stats: {
        correct: correctCount,
        total: responses.length,
        bestStreak: best,
      },
    });
  }, [currentIdx, responses, totalPoints, onComplete]);

  // ---------- Response handler (rounds 3+ only) ----------
  function respond(tappedMatch: boolean) {
    if (isWatchRound || answeredRef.current || phase !== 'lit') return;
    answeredRef.current = true;

    const elapsed = Date.now() - roundStartedAt.current;
    const wasMatch = sequence[currentIdx] === sequence[currentIdx - N];
    const correct = (tappedMatch && wasMatch) || (!tappedMatch && !wasMatch);

    let response: Response;
    if (tappedMatch && wasMatch) response = 'correct';
    else if (!tappedMatch && !wasMatch) response = 'correct_diff';
    else if (tappedMatch && !wasMatch) response = 'wrong_match';
    else response = 'wrong_diff';

    setResponses((r) => [...r, response]);

    // Speed + accuracy scoring — mirrors SpeedMath/Stroop.
    // Fast correct = 12pts, slow correct = 8pts, wrong = 0pts.
    if (correct) {
      const pts = elapsed < FAST_MS ? PTS_FAST : PTS_SLOW;
      setTotalPoints((p) => p + pts);
    }

    // Brief feedback flash on the tapped button, then dim the cell, then advance.
    setFlash({
      button: tappedMatch ? 'match' : 'different',
      kind: correct ? 'ok' : 'bad',
    });
    setTimeout(() => {
      setPhase('dim');
      setTimeout(() => setCurrentIdx((i) => i + 1), POST_FEEDBACK_GAP_MS);
    }, FEEDBACK_FLASH_MS);
  }

  const lastTen = responses.slice(-10);
  const helpDisabled = isWatchRound || answeredRef.current || phase !== 'lit';

  // Compute per-button background based on feedback flash. Default styles are
  // unchanged — the flash overrides them only for ~200ms.
  const matchFlashBg = flash?.button === 'match'
    ? (flash.kind === 'ok' ? FEEDBACK.ok : FEEDBACK.bad)
    : ACCENT.primary;
  const matchFlashBorder = flash?.button === 'match'
    ? (flash.kind === 'ok' ? FEEDBACK.ok : FEEDBACK.bad)
    : 'transparent';
  const diffFlashBg = flash?.button === 'different'
    ? (flash.kind === 'ok' ? FEEDBACK.ok : FEEDBACK.bad)
    : 'transparent';
  const diffFlashBorder = flash?.button === 'different'
    ? (flash.kind === 'ok' ? FEEDBACK.ok : FEEDBACK.bad)
    : ACCENT.primary;
  const diffFlashColor = flash?.button === 'different' && flash ? '#fff' : ACCENT.primary;

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} style={{ background: 'transparent', padding: '4px 0', maxWidth: 860, margin: '0 auto', width: '100%' }}>
    <div className="w-full max-w-[420px] mx-auto select-none">
      <div className="flex items-center justify-between text-[12px] md:text-[13px] uppercase tracking-[0.16em] md:tracking-[0.18em] text-ink/55 mb-4 gap-2 flex-wrap">
        <span>{t.round} {Math.min(currentIdx + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}</span>
        <span>{t.score}: {totalPoints}</span>
        <button
          type="button"
          onClick={triggerHelp}
          aria-label={t.help}
          disabled={helpDisabled}
          style={{
            border: '1px solid var(--color-cream-3)',
            background: 'var(--color-cream)',
            color: 'var(--color-ink)',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'none',
            letterSpacing: 0,
            cursor: helpDisabled ? 'not-allowed' : 'pointer',
            opacity: helpDisabled ? 0.4 : 1,
            minHeight: 44,
          }}
        >
          {t.help}
        </button>
      </div>
      <p className="text-center text-[15px] md:text-[16px] text-ink/70 mb-5 px-2">{t.instr}</p>

      <div
        className="mx-auto nback-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(80px, 1fr))',
          gap: 8,
          width: '100%',
          maxWidth: 300,
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const lit = activePos === i;
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1 / 1',
                width: '100%',
                minWidth: 80,
                minHeight: 80,
                borderRadius: 10,
                background: lit ? ACCENT.primary : 'var(--color-cream-2)',
                border: lit ? `2px solid ${ACCENT.primary}` : '1px solid rgba(14,14,16,0.08)',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            />
          );
        })}
      </div>

      {isWatchRound ? (
        // Rounds 1–2: no buttons, just a "Just watch..." label. Auto-advances.
        <div
          className="block mx-auto mt-6 text-center"
          style={{
            color: 'var(--color-ash)',
            fontSize: 14,
            fontStyle: 'italic',
            padding: '8px 16px',
          }}
        >
          {t.watch}
        </div>
      ) : (
        // Round 3+: response required, no auto-advance.
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => respond(true)}
            disabled={answeredRef.current}
            style={{
              flex: 1,
              background: matchFlashBg,
              color: '#fff',
              borderRadius: 10,
              padding: '16px 0',
              fontSize: 17,
              fontWeight: 600,
              border: `2px solid ${matchFlashBorder}`,
              opacity: answeredRef.current && !flash ? 0.35 : 1,
              cursor: answeredRef.current ? 'not-allowed' : 'pointer',
              boxShadow: helpHint === 'match' ? HELP_HIGHLIGHT_BOX_SHADOW : undefined,
              transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
              minHeight: 52,
            }}
          >
            {t.match}
          </button>
          <button
            onClick={() => respond(false)}
            disabled={answeredRef.current}
            style={{
              flex: 1,
              background: diffFlashBg,
              color: diffFlashColor,
              borderRadius: 10,
              padding: '16px 0',
              fontSize: 17,
              fontWeight: 600,
              border: `2px solid ${diffFlashBorder}`,
              opacity: answeredRef.current && !flash ? 0.35 : 1,
              cursor: answeredRef.current ? 'not-allowed' : 'pointer',
              boxShadow: helpHint === 'different' ? HELP_HIGHLIGHT_BOX_SHADOW : undefined,
              transition: 'background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s',
              minHeight: 52,
            }}
          >
            {t.different}
          </button>
        </div>
      )}

      <div className="flex justify-center gap-1 mt-5 min-h-[14px]">
        {lastTen.map((r, i) => (
          <span
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: DOT_COLORS[r],
            }}
          />
        ))}
      </div>
    </div>
    </div>
  );
}
