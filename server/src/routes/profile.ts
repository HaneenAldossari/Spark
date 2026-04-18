import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  getRatings,
  getUser,
  recentSessions,
  setUserLanguage,
  upsertUser,
} from '../services/SupabaseService.js';
import { getRatingLabel, getRatingLabelAr } from '../services/ScoringService.js';
import type { Lang } from '../types.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    let user = await getUser(req.auth!.userId);
    if (!user) {
      user = await upsertUser({
        id: req.auth!.userId,
        email: req.auth!.email,
        name: req.auth!.email.split('@')[0] ?? 'user',
      });
    }
    const [ratings, sessions] = await Promise.all([
      getRatings(req.auth!.userId),
      recentSessions(req.auth!.userId, 20),
    ]);
    const labelFn = user.language === 'ar' ? getRatingLabelAr : getRatingLabel;
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        language: user.language,
        streak: user.streak,
        lastSessionAt: user.last_session_at,
      },
      ratings: ratings.map((r) => ({
        category: r.category,
        rating: r.rating,
        label: labelFn(r.rating),
        totalBattles: r.total_battles,
      })),
      recentSessions: sessions.map((s) => ({
        id: s.id,
        declaredTask: s.declared_task,
        taskCategory: s.task_category,
        brainScore: s.brain_score,
        gameType: s.game_type,
        status: s.status,
        createdAt: s.created_at,
      })),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[profile/get]', e);
    res.status(500).json({ error: 'Failed to load profile', code: 'profile_error' });
  }
});

const langBody = z.object({ language: z.enum(['ar', 'en']) });

router.patch('/language', requireAuth, async (req, res) => {
  const parsed = langBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid body', code: 'bad_input' });
    return;
  }
  try {
    await setUserLanguage(req.auth!.userId, parsed.data.language as Lang);
    res.json({ language: parsed.data.language });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[profile/language]', e);
    res.status(500).json({ error: 'Failed to update language', code: 'lang_error' });
  }
});

export default router;
