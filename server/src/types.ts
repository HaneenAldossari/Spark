// Shared server types — mirrors PRD v3 §4 schema and §6 LLM contracts.

export type Lang = 'ar' | 'en';

export type TaskCategory =
  | 'studying'
  | 'coding'
  | 'writing'
  | 'presenting'
  | 'reading'
  | 'design'
  | 'math'
  // legacy — retained so historical session rows keep type-checking
  | 'designing'
  | 'other';

export type GameType =
  // legacy — kept so historical sessions still type-check
  | 'memory' | 'pattern' | 'word_sprint'
  // April 2026 rotation (some retired, some added)
  | 'nback' | 'ruleswitch' | 'dualtask' | 'dotconnect' | 'schulte'
  // Active gauntlet games (2026-04)
  | 'stroop' | 'speedmath' | 'navon' | 'mentalrotation' | 'reflex';

export type BattleCategory = 'logic' | 'language' | 'math' | 'pattern' | 'general';

export type BattleOutcome = 'win' | 'loss' | 'draw' | 'ghost_win' | 'ghost_loss';

export type SessionStatus = 'in_progress' | 'complete' | 'incomplete';

// ---------- LLM output shapes (validated by llmValidator) ----------
export interface StoryOutput {
  story: string;
  choices: [string, string, string];
}

export interface BattleQuestionOutput {
  question: string;
  options: [string, string, string, string];
  answer_index: number;
  explanation: string;
}

export interface DebatePromptOutput {
  prompt: string;
  side: 'agree' | 'disagree';
}

export interface VerdictOutput {
  logic: number;
  evidence: number;
  clarity: number;
  feedback: string;
}

export interface LaunchMessageOutput {
  message: string;
}

// ---------- Database row shapes ----------
export interface UserRow {
  id: string;
  email: string;
  name: string;
  language: Lang;
  streak: number;
  last_session_at: string | null;
  created_at: string;
}

export interface RatingRow {
  id: string;
  user_id: string;
  category: BattleCategory;
  rating: number;
  total_battles: number;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  declared_task: string;
  task_category: TaskCategory;
  language: Lang;
  status: SessionStatus;
  brain_score: number | null;
  game_score: number | null;
  battle_score: number | null;
  verdict_score: number | null;
  consistency_score: number | null;
  game_type: GameType | null;
  verdict_fallback: boolean;
  phase2_duration_ms: number | null;
  battle_outcome: BattleOutcome | null;
  created_at: string;
  completed_at: string | null;
}
