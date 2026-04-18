import { useState } from 'react';
import DotConnectGameV2 from '../components/games/DotConnectGameV2';
import type { GameResult } from '../components/games/games.types';
import { useStore } from '../lib/store';

// Temporary sandbox to test DotConnectGameV2 in isolation. Visit /sandbox/dotconnect.
// Safe to delete once V2 is wired into Engage (it now is — but the sandbox is
// still useful for quick iteration without going through a full session flow).
export default function DotConnectSandbox() {
  const language = useStore((s) => s.language);
  const [result, setResult] = useState<GameResult | null>(null);
  const [key, setKey] = useState(0);

  return (
    <div className="min-h-screen bg-cream px-6 py-10">
      <div className="max-w-[640px] mx-auto">
        <div className="text-[11px] uppercase tracking-[0.2em] text-ash mb-2">
          Sandbox · Dot Connect V2 · isolated test
        </div>
        <h1 className="font-display text-[40px] leading-[0.95] tracking-[-0.03em] mb-3">
          Dot Connect
        </h1>
        <p className="text-[14px] text-ink/70 mb-6">
          Hand-crafted puzzles, help system. No backend, no session, no DB writes. <code>onComplete</code> output appears below the game.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setResult(null); setKey((k) => k + 1); }}
            className="px-4 py-2 rounded-full ring-ink hover:bg-ink hover:text-cream text-[12px] uppercase tracking-[0.16em]"
          >
            Reset game
          </button>
          <span className="text-[11px] text-ash">
            6 puzzles · 30s each · 2 hints per puzzle · drag to draw
          </span>
        </div>

        <DotConnectGameV2
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
          Tip: the grid itself is spatial and not mirrored.
        </div>
      </div>
    </div>
  );
}
