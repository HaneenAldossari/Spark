/* SupabaseService — the only place we instantiate a Supabase client on the
 * server. Uses the service-role key, so RLS is bypassed. Every other service
 * imports from here — never import @supabase/supabase-js directly.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';
import type {
  BattleCategory,
  BattleOutcome,
  GameType,
  Lang,
  RatingRow,
  SessionRow,
  SessionStatus,
  TaskCategory,
  UserRow,
} from '../types.js';
import { STARTING_RATING } from './ScoringService.js';

let _admin: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

// ---------- Users ----------
export async function getUser(userId: string): Promise<UserRow | null> {
  const { data, error } = await admin().from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data as UserRow | null) ?? null;
}

export async function upsertUser(u: Pick<UserRow, 'id' | 'email' | 'name'> & { language?: Lang }): Promise<UserRow> {
  // Check if user already exists — if so, only update email/language, not name
  // (name is user-editable and shouldn't be overwritten by the email prefix).
  const { data: existing } = await admin()
    .from('users')
    .select('id')
    .eq('id', u.id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin()
      .from('users')
      .update({ email: u.email, language: u.language ?? undefined })
      .eq('id', u.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as UserRow;
  }

  const { data, error } = await admin()
    .from('users')
    .insert({ ...u, language: u.language ?? 'ar' })
    .select('*')
    .single();
  if (error) throw error;
  return data as UserRow;
}

export async function setUserLanguage(userId: string, language: Lang): Promise<void> {
  const { error } = await admin().from('users').update({ language }).eq('id', userId);
  if (error) throw error;
}

export async function updateStreak(userId: string, streak: number): Promise<void> {
  const { error } = await admin()
    .from('users')
    .update({ streak, last_session_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

// ---------- Ratings ----------
export async function getRatings(userId: string): Promise<RatingRow[]> {
  const { data, error } = await admin().from('ratings').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data as RatingRow[]) ?? [];
}

export async function getRating(userId: string, category: BattleCategory): Promise<RatingRow | null> {
  const { data, error } = await admin()
    .from('ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .maybeSingle();
  if (error) throw error;
  return (data as RatingRow | null) ?? null;
}

export async function ensureRating(userId: string, category: BattleCategory): Promise<RatingRow> {
  const existing = await getRating(userId, category);
  if (existing) return existing;
  const { data, error } = await admin()
    .from('ratings')
    .insert({ user_id: userId, category, rating: STARTING_RATING, total_battles: 0 })
    .select('*')
    .single();
  if (error) throw error;
  return data as RatingRow;
}

export async function updateRating(
  userId: string,
  category: BattleCategory,
  newRating: number,
  newTotal: number,
): Promise<void> {
  const { error } = await admin()
    .from('ratings')
    .update({ rating: newRating, total_battles: newTotal, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('category', category);
  if (error) throw error;
}

// ---------- Sessions ----------
export interface NewSession {
  user_id: string;
  declared_task: string;
  task_category: TaskCategory;
  language: Lang;
  game_type: GameType;
}

export async function insertSession(s: NewSession): Promise<SessionRow> {
  const { data, error } = await admin()
    .from('sessions')
    .insert({ ...s, status: 'in_progress' as SessionStatus, verdict_fallback: false })
    .select('*')
    .single();
  if (error) throw error;
  return data as SessionRow;
}

export interface SessionCompletion {
  status: SessionStatus;
  brain_score: number | null;
  game_score: number | null;
  battle_score: number | null;
  verdict_score: number | null;
  consistency_score: number | null;
  game_type: GameType;
  verdict_fallback: boolean;
  phase2_duration_ms: number | null;
  battle_outcome: BattleOutcome | null;
}

export async function completeSession(sessionId: string, patch: SessionCompletion): Promise<SessionRow> {
  const { data, error } = await admin()
    .from('sessions')
    .update({ ...patch, completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error) throw error;
  return data as SessionRow;
}

export async function getSession(sessionId: string): Promise<SessionRow | null> {
  const { data, error } = await admin().from('sessions').select('*').eq('id', sessionId).maybeSingle();
  if (error) throw error;
  return (data as SessionRow | null) ?? null;
}

export async function recentSessions(userId: string, limit = 20): Promise<SessionRow[]> {
  const { data, error } = await admin()
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as SessionRow[]) ?? [];
}

export async function sessionsInLastDays(userId: string, days: number): Promise<number> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { count, error } = await admin()
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'complete')
    .gte('created_at', since);
  if (error) throw error;
  return count ?? 0;
}

// ---------- Battles ----------
export async function insertBattle(row: {
  session_id: string;
  user_id: string;
  opponent_id: string | null;
  is_ghost: boolean;
  category: BattleCategory;
  question_id: string;
  user_answer: string | null;
  user_response_ms: number | null;
  opponent_response_ms: number | null;
  outcome: BattleOutcome | null;
  rating_before: number;
  rating_after: number;
}): Promise<void> {
  const { error } = await admin().from('battles').insert(row);
  if (error) throw error;
}

export async function findGhostOpponent(
  category: BattleCategory,
  rating: number,
): Promise<{ opponentId: string; opponentRating: number; responseMs: number } | null> {
  const { data, error } = await admin()
    .from('battles')
    .select('user_id, rating_before, user_response_ms')
    .eq('category', category)
    .eq('is_ghost', false)
    .gte('rating_before', rating - 150)
    .lte('rating_before', rating + 150)
    .not('user_response_ms', 'is', null)
    .limit(20);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const pick = data[Math.floor(Math.random() * data.length)];
  if (!pick) return null;
  return {
    opponentId: pick.user_id as string,
    opponentRating: pick.rating_before as number,
    responseMs: pick.user_response_ms as number,
  };
}

// ---------- Leaderboard ----------
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avgBrainScore: number;
  sessionCount: number;
}

export async function upsertWeeklyLeaderboard(
  userId: string,
  weekStart: string,
  avgBrainScore: number,
  sessionCount: number,
  institution: string | null,
): Promise<void> {
  const { error } = await admin()
    .from('leaderboard_weekly')
    .upsert(
      { user_id: userId, week_start: weekStart, avg_brain_score: avgBrainScore, session_count: sessionCount, institution },
      { onConflict: 'user_id,week_start' },
    );
  if (error) throw error;
}

export async function getLeaderboard(
  scope: 'campus' | 'global',
  institution: string | null,
  weekStart: string,
  limit = 50,
  offset = 0,
): Promise<LeaderboardEntry[]> {
  let q = admin()
    .from('leaderboard_weekly')
    .select('user_id, avg_brain_score, session_count, institution, users!inner(name)')
    .eq('week_start', weekStart)
    .gte('session_count', 3)
    .order('avg_brain_score', { ascending: false })
    .range(offset, offset + limit - 1);
  if (scope === 'campus' && institution) q = q.eq('institution', institution);

  const { data, error } = await q;
  if (error) throw error;
  type Row = {
    user_id: string;
    avg_brain_score: number;
    session_count: number;
    users: { name: string } | { name: string }[];
  };
  return ((data ?? []) as Row[]).map((row, i) => {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      rank: offset + i + 1,
      userId: row.user_id,
      name: u?.name ?? 'Anonymous',
      avgBrainScore: row.avg_brain_score,
      sessionCount: row.session_count,
    };
  });
}
