import { useState } from 'react';
import SpeedMathGame from '../components/games/SpeedMathGame';
import type { GameResult } from '../components/games/games.types';
import { useStore } from '../lib/store';

// Temporary sandbox for SpeedMathGame. Visit /sandbox/speedmath.
// Safe to delete once the server rotation serves 'speedmath'.
export default function SpeedMathSandbox() {
  const language = useStore((s) => s.language);
  const [result, setResult] = useState<GameResult | null>(null);
  const [rating, setRating] = useState(1500);
  const [key, setKey] = useState(0);

  const band =
    rating <= 1200 ? 'easy (add/sub, 1–10)'
    : rating <= 1600 ? 'medium (+ ×, 1–12)'
    : 'hard (+ ×, ÷, 1–20)';

  return (
    <div className="min-h-screen bg-cream px-6 py-10">
      <div className="max-w-[640px] mx-auto">
        <div className="text-[11px] uppercase tracking-[0.2em] text-ash mb-2">
          Sandbox · Speed Math · isolated test
        </div>
        <h1 className="font-display text-[40px] leading-[0.95] tracking-[-0.03em] mb-3">
          Speed Math
        </h1>
        <p className="text-[14px] text-ink/70 mb-6">
          10 rounds · 5s each · 12pts fast, 8pts slow, 0pts wrong. <code>onComplete</code> output appears below the game.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setResult(null); setKey((k) => k + 1); }}
            className="px-4 py-2 rounded-full ring-ink hover:bg-ink hover:text-cream text-[12px] uppercase tracking-[0.16em]"
          >
            Reset game
          </button>
          <label className="text-[12px] text-ash flex items-center gap-2">
            cognitiveRating
            <input
              type="range"
              min={800}
              max={2000}
              step={50}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              disabled={!!result}
            />
            <span className="font-mono text-ink">{rating}</span>
            <span className="text-ink/60">· {band}</span>
          </label>
        </div>

        <SpeedMathGame
          key={key}
          language={language}
          taskCategory="sandbox"
          cognitiveRating={rating}
          onComplete={(r) => setResult(r)}
        />

        {result && (
          <div className="mt-6 bg-ink text-cream rounded-2xl p-5 font-mono text-[12px] whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </div>
        )}

        <div className="mt-8 text-[11px] text-ash">
          Tip: operators stay the same regardless of digit style.
        </div>
      </div>
    </div>
  );
}
