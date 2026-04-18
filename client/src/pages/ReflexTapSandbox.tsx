import { useState } from 'react';
import ReflexTapGame from '../components/games/ReflexTapGame';
import type { GameResult } from '../components/games/games.types';
import { useStore } from '../lib/store';

// Temporary sandbox for ReflexTapGame. Visit /sandbox/reflex.
// Safe to delete once the server rotation serves 'reflex'.
export default function ReflexTapSandbox() {
  const language = useStore((s) => s.language);
  const [result, setResult] = useState<GameResult | null>(null);
  const [key, setKey] = useState(0);

  return (
    <div className="min-h-screen bg-cream px-6 py-10">
      <div className="max-w-[640px] mx-auto">
        <div className="text-[11px] uppercase tracking-[0.2em] text-ash mb-2">
          Sandbox · Reflex Tap · isolated test
        </div>
        <h1 className="font-display text-[40px] leading-[0.95] tracking-[-0.03em] mb-3">
          Reflex Tap
        </h1>
        <p className="text-[14px] text-ink/70 mb-6">
          12 rounds · 600–1200ms random delay · 2500ms miss timeout. Reaction-time thresholds: &lt;250=100, &lt;400=85, &lt;600=70, &lt;900=50, &lt;1500=30, else 0.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setResult(null); setKey((k) => k + 1); }}
            className="px-4 py-2 rounded-full ring-ink hover:bg-ink hover:text-cream text-[12px] uppercase tracking-[0.16em]"
          >
            Reset game
          </button>
          <span className="text-[11px] text-ash">
            Don't anticipate — the 600–1200ms delay is randomized on purpose.
          </span>
        </div>

        <ReflexTapGame
          key={key}
          language={language}
          taskCategory="sandbox"
          cognitiveRating={1500}
          onComplete={(r) => setResult(r)}
        />

        {result && (
          <div className="mt-6 bg-ink text-cream rounded-2xl p-5 font-mono text-[12px] whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </div>
        )}

        <div className="mt-8 text-[11px] text-ash">
          Tip: reaction time display stays numeric.
        </div>
      </div>
    </div>
  );
}
