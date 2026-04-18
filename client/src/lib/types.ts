export type Lang = 'en' | 'ar';

export type TaskCategory =
  | 'studying'
  | 'coding'
  | 'writing'
  | 'presenting'
  | 'reading'
  | 'design'
  | 'math'
  // legacy — retained so historical sessions keep type-checking
  | 'designing'
  | 'other';

export type GameType =
  // legacy — kept so historical sessions still type-check
  | 'stroop' | 'memory' | 'pattern' | 'word_sprint'
  // new Phase 2 rotation (April 2026)
  | 'nback' | 'ruleswitch' | 'dualtask' | 'dotconnect' | 'schulte'
  // added 2026-04
  | 'speedmath' | 'reflex' | 'navon' | 'mentalrotation';

export type BattleCategory = 'logic' | 'language' | 'math' | 'pattern' | 'general';

export type BattleOutcome = 'win' | 'loss' | 'draw' | 'ghost_win' | 'ghost_loss';

export type PhaseId = 'ignition' | 'engage' | 'battle' | 'verdict' | 'launch';

export interface PhaseMeta {
  id: PhaseId;
  index: number; // 0..4
  name: string;
  blurb: string;
  color: string;
  colorSoft: string;
  colorVar: string; // css var name
}

export const PHASES: PhaseMeta[] = [
  {
    id: 'ignition',
    index: 0,
    name: 'Ignition',
    blurb: 'Suppress the Default Mode Network.',
    color: 'var(--color-teal)',
    colorSoft: 'var(--color-teal-soft)',
    colorVar: '--color-teal',
  },
  {
    id: 'engage',
    index: 1,
    name: 'Engage',
    blurb: 'Activate the Prefrontal Cortex.',
    color: 'var(--color-purple)',
    colorSoft: 'var(--color-purple-soft)',
    colorVar: '--color-purple',
  },
  {
    id: 'battle',
    index: 2,
    name: 'Battle',
    blurb: 'Peak norepinephrine under stakes.',
    color: 'var(--color-amber)',
    colorSoft: 'var(--color-amber-soft)',
    colorVar: '--color-amber',
  },
  {
    id: 'verdict',
    index: 3,
    name: 'Verdict',
    blurb: 'Flush working-memory residue.',
    color: 'var(--color-blue)',
    colorSoft: 'var(--color-blue-soft)',
    colorVar: '--color-blue',
  },
  {
    id: 'launch',
    index: 4,
    name: 'Launch',
    blurb: 'Transfer momentum to your task.',
    color: 'var(--color-green)',
    colorSoft: 'var(--color-green-soft)',
    colorVar: '--color-green',
  },
];

export interface SessionResult {
  taskText: string;
  taskCategory: TaskCategory;
  ignitionChoice?: number;
  gameScore?: number;
  gameType?: GameType;
  battleWon?: boolean;
  battleScore?: number;
  verdict?: { logic: number; evidence: number; clarity: number; text: string };
  brainScore?: number;
  startedAt: number;
}
