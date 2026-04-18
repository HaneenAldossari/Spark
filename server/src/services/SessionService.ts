/* SessionService — orchestrates the full session lifecycle:
 * (1) start: call Gemini for all 5 phases in parallel, insert session row.
 * (2) complete: validate, score, update ratings/streak/leaderboard.
 */
import type { BattleCategory, BattleOutcome, GameType, Lang, TaskCategory } from '../types.js';
import {
  generateBattleQuestion,
  generateDebatePrompt,
  generateGameContent,
  generateLaunchMessage,
  generateStory,
} from './GeminiService.js';
import {
  brainScore,
  checkSessionValidity,
  consistencyScore,
  verdictScore,
} from './ScoringService.js';
import { randomUUID } from 'node:crypto';
import {
  completeSession,
  ensureRating,
  getRatings,
  getSession,
  getUser,
  insertSession,
  recentSessions,
  sessionsInLastDays,
  updateRating,
  updateStreak,
  upsertWeeklyLeaderboard,
} from './SupabaseService.js';
import type { BattleCategory as Cat } from '../types.js';

// Categories whose rating rows we keep per-user. Mirrors the Profile UI.
const ALL_RATING_CATEGORIES: Cat[] = ['logic', 'language', 'math', 'pattern', 'general'];

// Each game trains one or two cognitive domains. The player's per-game
// score feeds an ELO update against each of the game's mapped categories.
// Games listed against two categories contribute to both (half credit each
// falls out naturally from running the ELO twice with the same K).
const GAME_CATEGORY_MAP: Partial<Record<GameType, Cat[]>> = {
  schulte:        ['general'],
  nback:          ['logic'],
  dotconnect:     ['pattern'],
  speedmath:      ['math'],
  stroop:         ['language'],
  navon:          ['logic', 'language'],
  mentalrotation: ['pattern', 'general'],
};

const ELO_K = 32;
const ELO_ANCHOR = 1200;

// ELO update: convert game score (0–100) to a performance in [0, 1], then
// nudge the rating by K × (performance − expected). Score 50 ≈ neutral.
function eloNext(current: number, gameScore: number): number {
  const performance = Math.max(0, Math.min(1, gameScore / 100));
  const expected = 1 / (1 + Math.pow(10, (ELO_ANCHOR - current) / 400));
  const next = current + ELO_K * (performance - expected);
  return Math.round(Math.max(400, Math.min(2400, next)));
}

// ---------- Game selection (PRD §7.1, updated April 2026) ----------
// Active rotation (the "Phase 2 five"): schulte, nback, dotconnect,
// speedmath, stroop. Older games (dualtask, ruleswitch, memory, pattern,
// word_sprint) are retired from the picker but the GameType union still
// accepts them so historical session rows remain valid on read.
const ALL_GAMES: GameType[] = ['schulte', 'nback', 'dotconnect', 'speedmath', 'stroop'];

export function pickGame(category: TaskCategory, lastGame: GameType | null): GameType {
  const hour = new Date().getHours();
  let pool: GameType[] = ALL_GAMES;
  // Task-aware bias — matches each game to the cognitive skill it trains.
  // speedmath → processing speed; stroop → inhibitory control;
  // schulte → visual scanning; nback → working memory;
  // dotconnect → spatial planning.
  if (category === 'coding' || category === 'studying') {
    pool = ['nback', 'dotconnect', 'schulte', 'speedmath', 'stroop'];
  } else if (category === 'writing' || category === 'presenting') {
    pool = ['stroop', 'nback', 'dotconnect', 'schulte', 'speedmath'];
  } else if (category === 'designing' || category === 'design') {
    pool = ['dotconnect', 'schulte', 'stroop', 'nback', 'speedmath'];
  } else if (category === 'math') {
    pool = ['speedmath', 'nback', 'dotconnect', 'stroop', 'schulte'];
  } else if (category === 'reading') {
    pool = ['schulte', 'stroop', 'nback', 'dotconnect', 'speedmath'];
  }
  // Time-of-day bias — morning favors speed/attention, evening favors planning.
  if (hour >= 5 && hour < 12) {
    const favored: GameType[] = pool.filter((g) => g === 'speedmath' || g === 'stroop' || g === 'schulte');
    pool = favored.concat(pool);
  } else if (hour >= 18) {
    const favored: GameType[] = pool.filter((g) => g === 'nback' || g === 'dotconnect');
    pool = favored.concat(pool);
  }
  // Avoid repeating the previous game
  const filtered = pool.filter((g) => g !== lastGame);
  return filtered[Math.floor(Math.random() * filtered.length)] ?? 'nback';
}

// ---------- Task → battle category (rough heuristic for MVP) ----------
export function categoryForTask(task: TaskCategory): BattleCategory {
  switch (task) {
    case 'coding': return 'logic';
    case 'studying': return 'general';
    case 'writing':
    case 'presenting': return 'language';
    case 'reading': return 'language';
    case 'designing':
    case 'design': return 'pattern';
    case 'math': return 'math';
    default: return 'general';
  }
}

// ---------- Start session ----------
export interface StartInput {
  userId: string;
  taskText: string;
  taskCategory: TaskCategory;
  language: Lang;
}

export interface StartOutput {
  sessionId: string;
  phase1: { story: string; choices: string[] };
  phase2: { gameType: GameType; seed: number };
  phase3: { question: string; options: string[]; answerIndex: number; explanation: string; category: BattleCategory; timeLimitMs: 60_000 };
  phase4: { debatePrompt: string };
}

export async function startSession(i: StartInput): Promise<StartOutput> {
  const ratings = await getRatings(i.userId);
  const ratingMap = new Map(ratings.map((r) => [r.category, r.rating]));
  const battleCategory = categoryForTask(i.taskCategory);
  const ratingForBattle = ratingMap.get(battleCategory) ?? 1200;
  const cognitiveRating =
    [...ratingMap.values()].reduce((a, b) => a + b, 0) / Math.max(ratingMap.size, 1) || 1200;

  const recent = await recentSessions(i.userId, 1);
  const lastGame = recent[0]?.game_type ?? null;
  const gameType = pickGame(i.taskCategory, lastGame);

  // All 5 generation calls in parallel per §3.2 step 4.
  const [story, gameContent, battleQ, debate] = await Promise.all([
    generateStory(i.taskText, i.taskCategory, i.language),
    generateGameContent(gameType, cognitiveRating, i.taskText, i.language),
    generateBattleQuestion(battleCategory, [ratingForBattle - 150, ratingForBattle + 150], i.language),
    generateDebatePrompt(i.taskText, i.taskCategory, i.language),
  ]);

  const row = await insertSession({
    user_id: i.userId,
    declared_task: i.taskText.slice(0, 240),
    task_category: i.taskCategory,
    language: i.language,
    game_type: gameType,
  });

  return {
    sessionId: row.id,
    phase1: { story: story.story, choices: story.choices },
    phase2: { gameType, seed: gameContent.seed },
    phase3: {
      question: battleQ.question,
      options: battleQ.options,
      answerIndex: battleQ.answer_index,
      explanation: battleQ.explanation,
      category: battleCategory,
      timeLimitMs: 60_000,
    },
    phase4: { debatePrompt: debate.prompt },
  };
}

// ---------- Guest session start ----------
// No DB writes. Generates a fake UUID so the client can pass it back to
// /complete. Uses a neutral 1200 cognitive rating (no profile to read).
export async function startGuestSession(i: Omit<StartInput, 'userId'>): Promise<StartOutput> {
  const battleCategory = categoryForTask(i.taskCategory);
  const ratingForBattle = 1200;
  const cognitiveRating = 1200;
  const gameType = pickGame(i.taskCategory, null);

  const [story, gameContent, battleQ, debate] = await Promise.all([
    generateStory(i.taskText, i.taskCategory, i.language),
    generateGameContent(gameType, cognitiveRating, i.taskText, i.language),
    generateBattleQuestion(battleCategory, [ratingForBattle - 150, ratingForBattle + 150], i.language),
    generateDebatePrompt(i.taskText, i.taskCategory, i.language),
  ]);

  return {
    sessionId: `guest-${randomUUID()}`,
    phase1: { story: story.story, choices: story.choices },
    phase2: { gameType, seed: gameContent.seed },
    phase3: {
      question: battleQ.question,
      options: battleQ.options,
      answerIndex: battleQ.answer_index,
      explanation: battleQ.explanation,
      category: battleCategory,
      timeLimitMs: 60_000,
    },
    phase4: { debatePrompt: debate.prompt },
  };
}

// ---------- Complete session ----------
export interface CompleteInput {
  userId: string;
  sessionId: string;
  gameScore: number;
  gameType: GameType;
  phase2DurationMs: number;
  battleScore: number;
  battleAnswered: boolean;
  battleOutcome: BattleOutcome;
  verdict: { logic: number; evidence: number; clarity: number; fallback: boolean };
  argument: string;
  // Per-game scores (0–100) from the 5-game gauntlet. Used to update the
  // per-category cognitive ratings with an ELO-style update. Optional for
  // backwards compat with older clients that only sent a single gameScore.
  gamesPlayed?: GameType[];
  gameScores?: Partial<Record<GameType, number>>;
}

export interface CompleteOutput {
  brainScore: number;
  componentScores: { game: number; battle: number; verdict: number; consistency: number };
  launchMessage: string;
  status: 'complete' | 'incomplete';
  reason?: string;
}

export async function finishSession(i: CompleteInput): Promise<CompleteOutput> {
  const [user, sessionRow] = await Promise.all([getUser(i.userId), getSession(i.sessionId)]);
  if (!user) throw new Error('User not found');
  if (!sessionRow) throw new Error('Session not found');
  if (sessionRow.user_id !== i.userId) throw new Error('Session does not belong to user');

  // §8.6 session validity
  const validity = checkSessionValidity({
    reachedLaunch: true,
    phase2DurationMs: i.phase2DurationMs,
    battleAnswered: i.battleAnswered,
    argument: i.argument,
  });
  if (!validity.valid) {
    await completeSession(i.sessionId, {
      status: 'incomplete',
      brain_score: null,
      game_score: null,
      battle_score: null,
      verdict_score: null,
      consistency_score: null,
      game_type: i.gameType,
      verdict_fallback: i.verdict.fallback,
      phase2_duration_ms: i.phase2DurationMs,
      battle_outcome: i.battleOutcome,
    });
    return {
      brainScore: 0,
      componentScores: { game: 0, battle: 0, verdict: 0, consistency: 0 },
      launchMessage: 'Complete all phases to earn your Brain Score.',
      status: 'incomplete',
      reason: validity.reason,
    };
  }

  const sessions7 = await sessionsInLastDays(i.userId, 7);
  const isNewUser = sessions7 === 0 && (user.streak ?? 0) === 0;
  const consistency = consistencyScore({
    currentStreak: user.streak ?? 0,
    sessionsLast7Days: sessions7,
    isNewUser,
  });
  const vScore = verdictScore(i.verdict);
  const score = brainScore({ game: i.gameScore, battle: i.battleScore, verdict: vScore, consistency });

  // Streak rule: if last session was within 48h, +1; else reset to 1.
  const lastTs = user.last_session_at ? Date.parse(user.last_session_at) : 0;
  const within = Date.now() - lastTs < 48 * 3600 * 1000;
  const newStreak = within ? (user.streak ?? 0) + 1 : 1;
  await updateStreak(i.userId, newStreak);

  const launch = await generateLaunchMessage(
    sessionRow.declared_task,
    score,
    { game: i.gameScore, battle: i.battleScore, verdict: vScore, consistency },
    sessionRow.language,
  );

  await completeSession(i.sessionId, {
    status: 'complete',
    brain_score: score,
    game_score: i.gameScore,
    battle_score: i.battleScore,
    verdict_score: vScore,
    consistency_score: consistency,
    game_type: i.gameType,
    verdict_fallback: i.verdict.fallback,
    phase2_duration_ms: i.phase2DurationMs,
    battle_outcome: i.battleOutcome,
  });

  // Per-category cognitive rating — one ELO nudge per (game, category)
  // pair, using the game's own 0–100 score. Games that map to two
  // categories update both. Categories whose games weren't played this
  // session stay untouched.
  const perGame = i.gameScores ?? {};
  const played: GameType[] = i.gamesPlayed ?? (i.gameType ? [i.gameType] : []);

  // Make sure every category row exists so the Profile page always has
  // something to read (starting rating = ELO_ANCHOR by default in the DB).
  await Promise.all(ALL_RATING_CATEGORIES.map((c) => ensureRating(i.userId, c)));

  // Aggregate updates per category so two-category games like navon
  // produce a single DB write per category, not two.
  const pending = new Map<Cat, number>(); // final rating per category
  for (const game of played) {
    const gScore = perGame[game];
    if (typeof gScore !== 'number') continue;
    const cats = GAME_CATEGORY_MAP[game] ?? [];
    for (const cat of cats) {
      const current = pending.get(cat);
      const base = current ?? (await ensureRating(i.userId, cat)).rating;
      pending.set(cat, eloNext(base, gScore));
    }
  }
  await Promise.all(
    [...pending.entries()].map(async ([cat, newRating]) => {
      const row = await ensureRating(i.userId, cat);
      await updateRating(i.userId, cat, newRating, row.total_battles + 1);
    }),
  );

  // Weekly leaderboard upsert — Monday 00:00 UTC+3 as week anchor.
  const weekStart = mondayOfWeek(new Date()).toISOString().slice(0, 10);
  const institution = user.email.split('@')[1] ?? null;
  const last7 = await recentSessions(i.userId, 30);
  const thisWeek = last7.filter(
    (s) => s.status === 'complete' && s.brain_score !== null && Date.parse(s.created_at) >= Date.parse(weekStart),
  );
  const avg = thisWeek.length
    ? Math.round(thisWeek.reduce((a, b) => a + (b.brain_score ?? 0), 0) / thisWeek.length)
    : score;
  await upsertWeeklyLeaderboard(i.userId, weekStart, avg, thisWeek.length || 1, institution);

  return {
    brainScore: score,
    componentScores: { game: i.gameScore, battle: i.battleScore, verdict: vScore, consistency },
    launchMessage: launch.message,
    status: 'complete',
  };
}

// ---------- Guest session complete ----------
// Pure scoring + Gemini launch message. No DB writes, no streak/rating
// updates, no leaderboard upsert. Same Brain Score formula as logged-in.
export interface GuestCompleteInput {
  taskText: string;
  language: import('../types.js').Lang;
  gameScore: number;
  gameType: GameType;
  phase2DurationMs: number;
  battleScore: number;
  battleAnswered: boolean;
  battleOutcome: BattleOutcome;
  verdict: { logic: number; evidence: number; clarity: number; fallback: boolean };
  argument: string;
}

export async function finishGuestSession(i: GuestCompleteInput): Promise<CompleteOutput> {
  const validity = checkSessionValidity({
    reachedLaunch: true,
    phase2DurationMs: i.phase2DurationMs,
    battleAnswered: i.battleAnswered,
    argument: i.argument,
  });
  if (!validity.valid) {
    return {
      brainScore: 0,
      componentScores: { game: 0, battle: 0, verdict: 0, consistency: 0 },
      launchMessage: 'Complete all phases to earn your Brain Score.',
      status: 'incomplete',
      reason: validity.reason,
    };
  }

  const consistency = consistencyScore({ currentStreak: 0, sessionsLast7Days: 0, isNewUser: true });
  const vScore = verdictScore(i.verdict);
  const score = brainScore({ game: i.gameScore, battle: i.battleScore, verdict: vScore, consistency });

  const launch = await generateLaunchMessage(
    i.taskText,
    score,
    { game: i.gameScore, battle: i.battleScore, verdict: vScore, consistency },
    i.language,
  );

  return {
    brainScore: score,
    componentScores: { game: i.gameScore, battle: i.battleScore, verdict: vScore, consistency },
    launchMessage: launch.message,
    status: 'complete',
  };
}

function mondayOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = (out.getUTCDay() + 6) % 7; // Mon=0
  out.setUTCDate(out.getUTCDate() - day);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}
