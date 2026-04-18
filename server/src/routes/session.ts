import { Router } from 'express';
import { z } from 'zod';
import { sessionStartLimiter } from '../middleware/rateLimit.js';
import { finishGuestSession, startGuestSession } from '../services/SessionService.js';
import type { Lang, TaskCategory, BattleOutcome, GameType } from '../types.js';

const router = Router();

const startBody = z.object({
  taskText: z.string().min(1).max(240),
  // 'designing' kept for backwards compat with older clients — treat it as
  // 'design' server-side (same game selection + label).
  taskCategory: z.enum(['studying', 'coding', 'writing', 'presenting', 'reading', 'design', 'math', 'designing', 'other']),
  language: z.enum(['ar', 'en']),
});

router.post('/start', sessionStartLimiter, async (req, res) => {
  const parsed = startBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid body', code: 'bad_input', issues: parsed.error.issues });
    return;
  }
  try {
    const out = await startGuestSession({
      taskText: parsed.data.taskText,
      taskCategory: parsed.data.taskCategory as TaskCategory,
      language: parsed.data.language as Lang,
    });
    res.json(out);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[session/start]', e);
    res.status(503).json({ error: 'Session generation failed', code: 'gen_error' });
  }
});

const completeBody = z.object({
  sessionId: z.string().min(1),
  taskText: z.string().min(1).max(240).optional(),
  language: z.enum(['ar', 'en']).optional(),
  gameType: z.enum([
    'schulte', 'nback', 'dotconnect', 'speedmath', 'stroop',
    'navon', 'mentalrotation', 'reflex',
    'dualtask', 'ruleswitch',
    'memory', 'pattern', 'word_sprint',
  ]),
  gameScore: z.number().int().min(0).max(100),
  phase2DurationMs: z.number().int().min(0),
  battleScore: z.number().int().min(0).max(100),
  battleAnswered: z.boolean(),
  battleOutcome: z.enum(['win', 'loss', 'draw', 'ghost_win', 'ghost_loss']),
  verdict: z.object({
    logic: z.number().int().min(0).max(100),
    evidence: z.number().int().min(0).max(100),
    clarity: z.number().int().min(0).max(100),
    fallback: z.boolean(),
  }),
  argument: z.string().min(0).max(1000),
  // Multi-game gauntlet summary — accepted but not persisted (public app).
  taskCategory: z.enum(['studying', 'coding', 'writing', 'presenting', 'reading', 'design', 'math', 'designing', 'other']).optional(),
  gamesPlayed: z.array(z.enum([
    'schulte', 'nback', 'dotconnect', 'speedmath', 'stroop', 'navon', 'mentalrotation',
    'dualtask', 'ruleswitch',
  ])).optional(),
  gameScores: z.record(z.string(), z.number().int().min(0).max(100)).optional(),
  finalScore: z.number().int().min(0).max(100).optional(),
});

router.post('/complete', async (req, res) => {
  const parsed = completeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid body', code: 'bad_input', issues: parsed.error.issues });
    return;
  }
  try {
    const out = await finishGuestSession({
      taskText: parsed.data.taskText ?? 'your task',
      language: (parsed.data.language ?? 'en') as Lang,
      gameScore: parsed.data.gameScore,
      gameType: parsed.data.gameType as GameType,
      phase2DurationMs: parsed.data.phase2DurationMs,
      battleScore: parsed.data.battleScore,
      battleAnswered: parsed.data.battleAnswered,
      battleOutcome: parsed.data.battleOutcome as BattleOutcome,
      verdict: parsed.data.verdict,
      argument: parsed.data.argument,
    });
    if (out.status === 'incomplete') {
      res.status(422).json({ ...out, error: out.reason });
      return;
    }
    res.json(out);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[session/complete]', e);
    res.status(500).json({ error: 'Failed to complete session', code: 'complete_error' });
  }
});

export default router;
