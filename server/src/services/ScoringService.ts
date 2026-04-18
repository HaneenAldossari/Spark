/* ---------------------------------------------------------------
 * ScoringService — Spark
 * Created: 2026-04-08
 *
 * What: Single source of truth for every number the user ever
 *       sees in Spark. Implements PRD v3 §7.2 (game formulas) and
 *       §8.1–§8.8 (battle, ELO, verdict, consistency, brain score,
 *       display rules, rating labels, session validity) verbatim.
 *
 * Why:  Before this file existed, scoring lived in component code
 *       with arbitrary placeholders. PRD v3 locks the formulas —
 *       this module is the only place they are allowed to live.
 *       No component, route, or other service is allowed to do
 *       scoring math. If you find math somewhere else, move it
 *       here or call this.
 *
 * All functions are pure. All outputs are integers 0–100 unless
 * the function name says otherwise (ELO → integer ≥ 800).
 * -------------------------------------------------------------- */

import type { BattleOutcome, GameType } from '../types.js';

// ---------- small helpers ----------
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const clamp100 = (n: number) => clamp(Math.round(n), 0, 100);

// ================================================================
// §7.2 — Game scores
// ================================================================

// G1 — Stroop Test
// 10 rounds, 3000ms each. If fewer than 6 rounds completed → 0.
export interface StroopInput {
  correctResponses: number;
  completedRounds: number;
  avgResponseMs: number;
}
export function stroopScore(i: StroopInput): number {
  if (i.completedRounds < 6) return 0;
  const accuracy = i.correctResponses / 10;
  const speedBoost = 1 + ((3000 - i.avgResponseMs) / 3000) * 0.3;
  return clamp100(accuracy * 100 * speedBoost);
}

// G2 — Working Memory Sequence
// sequenceLength 4–7; exact match = 1, right item wrong place = 0.5.
export interface MemoryInput {
  correctPositions: number; // sum of 1's and 0.5's
  totalPositions: number;
  sequenceLength: number;
}
export function memoryScore(i: MemoryInput): number {
  if (i.totalPositions <= 0) return 0;
  const accuracy = i.correctPositions / i.totalPositions;
  const lengthBoost = 1 + (i.sequenceLength - 4) * 0.08;
  return clamp100(accuracy * 100 * lengthBoost);
}

// G3 — Pattern Completion
// 5 questions, difficulty multiplier tied to cognitive rating.
export interface PatternInput {
  correctAnswers: number;
  cognitiveRating: number;
}
export function patternScore(i: PatternInput): number {
  const mult = i.cognitiveRating < 1200 ? 0.8 : i.cognitiveRating <= 1600 ? 1.0 : 1.25;
  return clamp100((i.correctAnswers / 5) * 100 * mult);
}

// G4 — Word Association Sprint
// 10 rounds, 1500ms each. Per-round: speed (max 50) + divergence (max 50).
export interface SprintRound {
  responseMs: number; // Infinity or >1500 counted as 0
  semanticDistance: number; // 0.0 – 1.0
}
export function sprintScore(rounds: SprintRound[]): number {
  if (rounds.length === 0) return 0;
  const total = rounds.reduce((acc, r) => {
    if (!Number.isFinite(r.responseMs) || r.responseMs >= 1500) return acc;
    const speed = Math.max(0, ((1500 - r.responseMs) / 1500) * 50);
    const divergence = clamp(r.semanticDistance, 0, 1) * 50;
    return acc + speed + divergence;
  }, 0);
  return clamp100(total / 10);
}

// Semantic-distance stub — TODO: integrate Edinburgh Associative Thesaurus (EN)
// and an Arabic word-association dataset (AR). Until then: top-5 → 0.1,
// uncommon → 0.5, rare → 0.9. Callers should compute this server-side from
// a frequency list; this helper exists so the rule is documented in one place.
export function stubSemanticDistance(rank: number): number {
  if (rank <= 5) return 0.1;
  if (rank <= 100) return 0.5;
  return 0.9;
}

// Convenience dispatch by game type (optional — routes may call the
// specific function directly if they already know the type).
export function gameScore(
  type: GameType,
  payload:
    | { type: 'stroop'; data: StroopInput }
    | { type: 'memory'; data: MemoryInput }
    | { type: 'pattern'; data: PatternInput }
    | { type: 'word_sprint'; data: SprintRound[] },
): number {
  switch (payload.type) {
    case 'stroop': return stroopScore(payload.data);
    case 'memory': return memoryScore(payload.data);
    case 'pattern': return patternScore(payload.data);
    case 'word_sprint': return sprintScore(payload.data);
    default: {
      const _exhaustive: never = payload;
      void _exhaustive;
      void type;
      return 0;
    }
  }
}

// ================================================================
// §8.1 — Battle score
// ================================================================
const OUTCOME_BASE: Record<BattleOutcome, number> = {
  win: 70,
  draw: 50,
  loss: 30,
  ghost_win: 55,
  ghost_loss: 25,
};

export interface BattleInput {
  outcome: BattleOutcome;
  userResponseMs: number;
  opponentResponseMs: number; // for ghosts: actual stored value, never random
  fullyCorrect: boolean;
  partiallyCorrect?: boolean;
}
export function battleScore(i: BattleInput): number {
  const base = OUTCOME_BASE[i.outcome];
  const speedBonus = clamp(((i.opponentResponseMs - i.userResponseMs) / 1000) * 5, 0, 15);
  const accuracyBonus = i.fullyCorrect ? 15 : i.partiallyCorrect ? 8 : 0;
  return clamp100(base + speedBonus + accuracyBonus);
}

// ================================================================
// §8.2 — ELO rating update
// ================================================================
export interface EloInput {
  userRating: number;
  opponentRating: number;
  outcome: 'win' | 'loss' | 'draw';
  totalBattles: number;
}
export function updateElo(i: EloInput): number {
  const k = i.totalBattles < 20 ? 32 : 16;
  const expected = 1 / (1 + Math.pow(10, (i.opponentRating - i.userRating) / 400));
  const actual = i.outcome === 'win' ? 1 : i.outcome === 'draw' ? 0.5 : 0;
  const raw = i.userRating + k * (actual - expected);
  return Math.max(800, Math.round(raw));
}
export const STARTING_RATING = 1200;

// ================================================================
// §8.3 — Verdict score
// ================================================================
export interface VerdictInput {
  logic: number;
  evidence: number;
  clarity: number;
}
export function verdictScore(v: VerdictInput): number {
  return clamp100((v.logic + v.evidence + v.clarity) / 3);
}

// ================================================================
// §8.4 — Consistency score
// ================================================================
export interface ConsistencyInput {
  currentStreak: number;
  sessionsLast7Days: number;
  isNewUser: boolean;
}
export function consistencyScore(i: ConsistencyInput): number {
  if (i.isNewUser) return 50; // neutral baseline for first session
  const streakPart = Math.min(100, i.currentStreak * 10);
  const freqPart = Math.min(100, Math.round((i.sessionsLast7Days / 7) * 100));
  return clamp100(streakPart * 0.6 + freqPart * 0.4);
}

// ================================================================
// §8.5 — Final Brain Score (updated April 2026)
//
// The session flow was simplified: battle and verdict phases were
// removed. The only real cognitive measurement is the 5-game
// gauntlet score. The formula now weights game heavily and keeps a
// small consistency component to reward returning users.
//
//   game         × 0.85   (the warm-up gauntlet average)
//   consistency  × 0.15   (streak + frequency)
//   battle/verdict are accepted for backwards compat but unused.
// ================================================================
export interface BrainInput {
  game: number;
  battle: number;
  verdict: number;
  consistency: number;
}
export function brainScore(i: BrainInput): number {
  return clamp100(i.game * 0.85 + i.consistency * 0.15);
}

// ================================================================
// §8.6 — Session validity
// ================================================================
export interface ValidityInput {
  reachedLaunch: boolean;
  phase2DurationMs: number;
  battleAnswered: boolean;
  argument: string;
}
export interface ValidityResult {
  valid: boolean;
  reason?: string;
}
// PRD v3 §8.6 specified 60_000 ms. Lowered to 30_000 ms after MVP playtesting:
// the four built-in games finish in 20–40 s, leaving up to 40 s of dead-air on
// the prep screen. 30 s of focused cognitive engagement is sufficient to
// recruit the prefrontal cortex (the actual purpose of Phase 2 per §5.2).
// Revisit if neurological evidence demands the original 60 s.
export const PHASE2_MIN_MS = 30_000;

export function checkSessionValidity(i: ValidityInput): ValidityResult {
  if (!i.reachedLaunch) return { valid: false, reason: 'Session did not reach Launch phase.' };
  if (i.phase2DurationMs < PHASE2_MIN_MS) {
    return { valid: false, reason: `Phase 2 was shorter than ${PHASE2_MIN_MS / 1000} seconds.` };
  }
  // Battle and verdict were removed from the session flow — battleAnswered
  // and argument are now synthetic. Skip those checks.
  return { valid: true };
}

// ================================================================
// §8.7 — Display rules (format helpers)
// ================================================================
export const formatScore = (n: number): number => Math.round(n);
export const formatRating = (n: number): number => Math.round(n);

// Percentile: "Top X%", minimum display is "Top 1%".
export function formatPercentile(p: number): string {
  const v = Math.max(1, Math.round(p));
  return `Top ${v}%`;
}

// ================================================================
// §8.8 — Cognitive rating labels
// ================================================================
// Labels are hardcoded strings. Percentile shown next to them must
// be computed live from the actual user distribution — never from
// this table.
export function getRatingLabel(rating: number): string {
  if (rating >= 1400) return 'Expert';
  if (rating >= 1300) return 'Advanced';
  if (rating >= 1200) return 'Competent';
  if (rating >= 1100) return 'Developing';
  return 'Beginner';
}

// Kept as an alias so route files still compile. The app is English-only,
// so this just mirrors the English label function now.
export const getRatingLabelAr = getRatingLabel;
