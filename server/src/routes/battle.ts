import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/auth.js';
import { findMatch, recordBattleAndUpdateElo } from '../services/BattleService.js';
import { battleScore } from '../services/ScoringService.js';
import { ensureRating, getRating } from '../services/SupabaseService.js';
import type { BattleCategory, BattleOutcome } from '../types.js';

const router = Router();

const findBody = z.object({
  sessionId: z.string().min(1),
  category: z.enum(['logic', 'language', 'math', 'pattern', 'general']),
});

router.post('/find', optionalAuth, async (req, res) => {
  const parsed = findBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid body', code: 'bad_input' });
    return;
  }
  try {
    if (req.isGuest) {
      res.json({
        battleId: parsed.data.sessionId,
        isGhost: true,
        opponentName: 'Spark Player',
        opponentRating: 1200,
        opponentResponseMs: 30_000,
        realtimeChannel: null,
      });
      return;
    }
    const rating = await ensureRating(req.auth!.userId, parsed.data.category as BattleCategory);
    const match = await findMatch(req.auth!.userId, parsed.data.category as BattleCategory, rating.rating);
    res.json({
      battleId: parsed.data.sessionId,
      isGhost: match.isGhost,
      opponentName: match.opponentName,
      opponentRating: match.opponentRating,
      opponentResponseMs: match.opponentResponseMs,
      realtimeChannel: `battle:${parsed.data.sessionId}`,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[battle/find]', e);
    res.status(500).json({ error: 'Matchmaking failed', code: 'match_error' });
  }
});

const submitBody = z.object({
  sessionId: z.string().min(1),
  category: z.enum(['logic', 'language', 'math', 'pattern', 'general']),
  questionId: z.string().min(1),
  userAnswer: z.string().max(240),
  userResponseMs: z.number().int().min(0),
  opponentResponseMs: z.number().int().min(0),
  isGhost: z.boolean(),
  opponentId: z.string().uuid().nullable(),
  fullyCorrect: z.boolean(),
  partiallyCorrect: z.boolean().optional(),
});

router.post('/submit', optionalAuth, async (req, res) => {
  const parsed = submitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid body', code: 'bad_input' });
    return;
  }
  try {
    if (req.isGuest) {
      // Guests: compute battleScore but don't write rating row.
      const fc = parsed.data.fullyCorrect;
      const fast = parsed.data.userResponseMs <= parsed.data.opponentResponseMs;
      const guestOutcome: BattleOutcome = fc && fast ? 'ghost_win' : 'ghost_loss';
      const score = battleScore({
        outcome: guestOutcome,
        userResponseMs: parsed.data.userResponseMs,
        opponentResponseMs: parsed.data.opponentResponseMs,
        fullyCorrect: fc,
        partiallyCorrect: parsed.data.partiallyCorrect ?? false,
      });
      res.json({ outcome: guestOutcome, battleScore: score, ratingBefore: 1200, ratingAfter: 1200 });
      return;
    }
    const cat = parsed.data.category as BattleCategory;
    const ratingRow = (await getRating(req.auth!.userId, cat))
      ?? (await ensureRating(req.auth!.userId, cat));

    // Determine outcome
    let outcome: BattleOutcome;
    if (parsed.data.fullyCorrect && parsed.data.userResponseMs <= parsed.data.opponentResponseMs) {
      outcome = parsed.data.isGhost ? 'ghost_win' : 'win';
    } else if (parsed.data.fullyCorrect) {
      outcome = parsed.data.isGhost ? 'ghost_loss' : 'loss';
    } else {
      outcome = parsed.data.isGhost ? 'ghost_loss' : 'loss';
    }

    const score = battleScore({
      outcome,
      userResponseMs: parsed.data.userResponseMs,
      opponentResponseMs: parsed.data.opponentResponseMs,
      fullyCorrect: parsed.data.fullyCorrect,
      partiallyCorrect: parsed.data.partiallyCorrect ?? false,
    });

    const { ratingAfter } = await recordBattleAndUpdateElo(
      {
        sessionId: parsed.data.sessionId,
        userId: req.auth!.userId,
        category: cat,
        questionId: parsed.data.questionId,
        userAnswer: parsed.data.userAnswer,
        userResponseMs: parsed.data.userResponseMs,
        opponentResponseMs: parsed.data.opponentResponseMs,
        opponentId: parsed.data.opponentId,
        isGhost: parsed.data.isGhost,
        outcome,
        ratingBefore: ratingRow.rating,
      },
      ratingRow.total_battles,
    );

    res.json({
      outcome,
      battleScore: score,
      ratingBefore: ratingRow.rating,
      ratingAfter,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[battle/submit]', e);
    res.status(500).json({ error: 'Battle submission failed', code: 'battle_error' });
  }
});

export default router;
