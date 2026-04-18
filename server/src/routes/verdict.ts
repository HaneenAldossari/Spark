import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/auth.js';
import { scoreArgument } from '../services/GeminiService.js';
import { sanitizeUserText } from '../validators/llmValidator.js';

const router = Router();

const body = z.object({
  sessionId: z.string().min(1),
  argument: z.string().min(1).max(1000),
  debatePrompt: z.string().min(1).max(240),
  language: z.enum(['ar', 'en']),
});

router.post('/score', optionalAuth, async (req, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid body', code: 'bad_input' });
    return;
  }
  const wordCount = parsed.data.argument.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 10) {
    res.status(422).json({ error: 'Argument too short — minimum 10 words.', code: 'too_short' });
    return;
  }
  try {
    const cleanArg = sanitizeUserText(parsed.data.argument, 1000);
    const out = await scoreArgument(cleanArg, parsed.data.debatePrompt, parsed.data.language);
    res.json(out);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[verdict/score]', e);
    res.status(500).json({ error: 'Verdict scoring failed', code: 'verdict_error' });
  }
});

export default router;
