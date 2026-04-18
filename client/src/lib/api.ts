/* Typed client for the Spark Express API.
 * No auth headers — the app is fully public; every request is anonymous.
 */
import type { GameType, Lang, TaskCategory, BattleOutcome } from './types';

const BASE = (import.meta.env.VITE_API_BASE as string) ?? 'http://localhost:8787';

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(init.headers ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* leave as text */ }
  if (!res.ok) {
    const err = (body && typeof body === 'object' && 'error' in body)
      ? String((body as { error: unknown }).error)
      : `HTTP ${res.status}`;
    throw new ApiError(err, res.status, body);
  }
  return body as T;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// ---------- Types matching server responses ----------
export interface SessionStartResponse {
  sessionId: string;
  phase1: { story: string; choices: string[] };
  phase2: { gameType: GameType; seed: number };
  phase3: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
    category: string;
    timeLimitMs: number;
  };
  phase4: { debatePrompt: string };
}

export interface SessionCompleteResponse {
  brainScore: number;
  componentScores: { game: number; battle: number; verdict: number; consistency: number };
  launchMessage: string;
  status: 'complete' | 'incomplete';
  reason?: string;
}

// ---------- Endpoints ----------
export const api = {
  health: () => call<{ ok: boolean }>('/api/health'),
  session: {
    start: (body: { taskText: string; taskCategory: TaskCategory; language: Lang }) =>
      call<SessionStartResponse>('/api/session/start', { method: 'POST', body: JSON.stringify(body) }),
    complete: (body: {
      sessionId: string;
      gameType: GameType;
      gameScore: number;
      phase2DurationMs: number;
      battleScore: number;
      battleAnswered: boolean;
      battleOutcome: BattleOutcome;
      verdict: { logic: number; evidence: number; clarity: number; fallback: boolean };
      argument: string;
      // Multi-game gauntlet summary.
      taskCategory?: TaskCategory;
      gamesPlayed?: GameType[];
      gameScores?: Partial<Record<GameType, number>>;
      finalScore?: number;
      // Server has no session row for anonymous users — echo these.
      taskText?: string;
      language?: Lang;
    }) => call<SessionCompleteResponse>('/api/session/complete', { method: 'POST', body: JSON.stringify(body) }),
  },
};
