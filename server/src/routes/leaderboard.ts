import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getLeaderboard } from '../services/SupabaseService.js';
import { getUser } from '../services/SupabaseService.js';

const router = Router();

const query = z.object({
  scope: z.enum(['campus', 'global']).default('global'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get('/', requireAuth, async (req, res) => {
  const parsed = query.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid query', code: 'bad_input' });
    return;
  }
  try {
    const user = await getUser(req.auth!.userId);
    const institution = user?.email.split('@')[1] ?? null;
    const weekStart = mondayOfWeek(new Date()).toISOString().slice(0, 10);
    const entries = await getLeaderboard(parsed.data.scope, institution, weekStart, parsed.data.limit, parsed.data.offset);
    const me = entries.find((e) => e.userId === req.auth!.userId);
    res.json({
      entries,
      currentUserRank: me ? me.rank : null,
      weekStart,
      weekEnd: new Date(Date.parse(weekStart) + 6 * 86400000).toISOString().slice(0, 10),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[leaderboard]', e);
    res.status(500).json({ error: 'Failed to load leaderboard', code: 'leaderboard_error' });
  }
});

function mondayOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = (out.getUTCDay() + 6) % 7;
  out.setUTCDate(out.getUTCDate() - day);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

export default router;
