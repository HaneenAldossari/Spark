/* BattleService — matchmaking, ghost selection, ELO updates.
 * All ELO math is delegated to ScoringService. Ghost selection uses only
 * real stored response times (PRD v3 §10.2).
 */
import type { BattleCategory, BattleOutcome } from '../types.js';
import { updateElo } from './ScoringService.js';
import {
  ensureRating,
  findGhostOpponent,
  insertBattle,
  updateRating,
} from './SupabaseService.js';

export interface MatchResult {
  isGhost: boolean;
  opponentId: string | null;
  opponentName: string;
  opponentRating: number;
  opponentResponseMs: number | null; // null means live match, known only after submit
}

/**
 * Find a match. Per PRD v3 §10.2: wait up to 15 seconds for a live
 * opponent in the ±150 rating window, then fall back to ghost. Live
 * matchmaking is realized via Supabase Realtime presence from the
 * client — this server-side helper short-circuits to ghost so the
 * MVP always has a playable opponent.
 *
 * TODO: implement live-match presence polling from Supabase Realtime
 *       once presence channels are added.
 */
export async function findMatch(
  userId: string,
  category: BattleCategory,
  userRating: number,
): Promise<MatchResult> {
  const ghost = await findGhostOpponent(category, userRating);
  if (ghost) {
    return {
      isGhost: true,
      opponentId: ghost.opponentId,
      opponentName: 'Anonymous',
      opponentRating: ghost.opponentRating,
      opponentResponseMs: ghost.responseMs,
    };
  }
  // Nothing stored yet — synthesize a neutral mirror opponent at user's rating.
  // TODO: replace with presence-based live match once implemented.
  return {
    isGhost: true,
    opponentId: null,
    opponentName: 'Anonymous',
    opponentRating: userRating,
    opponentResponseMs: 30_000, // neutral 30s response until real data exists
  };
  void userId; // not needed yet — reserved for future presence logic
}

export interface RecordBattleInput {
  sessionId: string;
  userId: string;
  category: BattleCategory;
  questionId: string;
  userAnswer: string;
  userResponseMs: number;
  opponentResponseMs: number;
  opponentId: string | null;
  isGhost: boolean;
  outcome: BattleOutcome;
  ratingBefore: number;
}

export async function recordBattleAndUpdateElo(
  i: RecordBattleInput,
  totalBattles: number,
): Promise<{ ratingAfter: number }> {
  // Map ghost outcomes to ELO outcomes (ghosts still count; PRD §8.2 does
  // not exempt them). ghost_win → win, ghost_loss → loss.
  const eloOutcome: 'win' | 'loss' | 'draw' =
    i.outcome === 'win' || i.outcome === 'ghost_win'
      ? 'win'
      : i.outcome === 'loss' || i.outcome === 'ghost_loss'
      ? 'loss'
      : 'draw';

  const ratingAfter = updateElo({
    userRating: i.ratingBefore,
    opponentRating: i.ratingBefore, // use self as opponent-rating when ghost is neutral
    outcome: eloOutcome,
    totalBattles,
  });

  await insertBattle({
    session_id: i.sessionId,
    user_id: i.userId,
    opponent_id: i.opponentId,
    is_ghost: i.isGhost,
    category: i.category,
    question_id: i.questionId,
    user_answer: i.userAnswer,
    user_response_ms: i.userResponseMs,
    opponent_response_ms: i.opponentResponseMs,
    outcome: i.outcome,
    rating_before: i.ratingBefore,
    rating_after: ratingAfter,
  });

  await ensureRating(i.userId, i.category);
  await updateRating(i.userId, i.category, ratingAfter, totalBattles + 1);

  return { ratingAfter };
}
