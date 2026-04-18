/* Zustand-backed app store. Public app — no auth, no user accounts. */
import { create } from 'zustand';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { api, type SessionStartResponse } from './api';
import { catalogues, type Strings } from '../i18n';
import type { BattleOutcome, GameType, Lang, TaskCategory } from './types';

export interface StagedSession {
  taskText: string;
  taskCategory: TaskCategory;
  startedAt: number;
  sessionId?: string;
  content?: SessionStartResponse;
  ignitionChoice?: number;
  gameScore?: number;
  gameType?: GameType;
  phase2DurationMs?: number;
  battleScore?: number;
  battleAnswered?: boolean;
  battleOutcome?: BattleOutcome;
  verdict?: { logic: number; evidence: number; clarity: number; fallback: boolean };
  argument?: string;
  brainScore?: number;
  launchMessage?: string;
  gamesPlayed?: GameType[];
  gameScores?: Partial<Record<GameType, number>>;
  finalScore?: number;
}

interface State {
  language: Lang;
  t: Strings;
  setLanguage: (lang: Lang) => Promise<void>;

  current: StagedSession | null;
  startError: string | null;
  startSession(taskText: string, taskCategory: TaskCategory): Promise<void>;
  stagePhase(patch: Partial<StagedSession>): void;
  finishSession(): Promise<{ brainScore: number; launchMessage: string; status: 'complete' | 'incomplete' }>;
  clearSession(): void;
}

const STORAGE_LANG = 'spark.lang';

function initialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_LANG);
  if (stored === 'ar' || stored === 'en') return stored;
  return 'en';
}

export const useStore = create<State>((set, get) => ({
  language: initialLang(),
  t: catalogues[initialLang()],

  setLanguage: async (lang) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_LANG, lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    set({ language: lang, t: catalogues[lang] });
  },

  current: null,
  startError: null,
  startSession: async (taskText, taskCategory) => {
    set({
      current: { taskText, taskCategory, startedAt: Date.now() },
      startError: null,
    });
    try {
      const content = await api.session.start({
        taskText,
        taskCategory,
        language: get().language,
      });
      set((s) => ({
        current: s.current
          ? { ...s.current, sessionId: content.sessionId, content, gameType: content.phase2.gameType }
          : s.current,
      }));
    } catch (e) {
      set({ startError: (e as Error).message });
      throw e;
    }
  },
  stagePhase: (patch) => {
    set((s) => ({ current: s.current ? { ...s.current, ...patch } : s.current }));
  },
  finishSession: async () => {
    const c = get().current;
    if (!c || !c.sessionId || !c.content) throw new Error('No active session');
    const out = await api.session.complete({
      sessionId: c.sessionId,
      gameType: c.gameType ?? c.content.phase2.gameType,
      gameScore: c.gameScore ?? 0,
      phase2DurationMs: c.phase2DurationMs ?? 0,
      battleScore: c.battleScore ?? 0,
      battleAnswered: c.battleAnswered ?? false,
      battleOutcome: c.battleOutcome ?? 'ghost_loss',
      verdict: c.verdict ?? { logic: 50, evidence: 50, clarity: 50, fallback: true },
      argument: c.argument ?? '',
      taskCategory: c.taskCategory,
      gamesPlayed: c.gamesPlayed,
      gameScores: c.gameScores,
      finalScore: c.finalScore,
      taskText: c.taskText,
      language: get().language,
    });
    set((s) => ({
      current: s.current
        ? { ...s.current, brainScore: out.brainScore, launchMessage: out.launchMessage }
        : s.current,
    }));
    return { brainScore: out.brainScore, launchMessage: out.launchMessage, status: out.status };
  },
  clearSession: () => set({ current: null }),
}));

export function StoreInit({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lang = useStore.getState().language;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);
  return <>{children}</>;
}
