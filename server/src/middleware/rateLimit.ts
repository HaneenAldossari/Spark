/* Rate limiters per PRD v3 §11.
 * - Per-user 10 session-starts per day
 * - Per-user 60 API calls per minute
 *
 * Uses express-rate-limit's in-memory store. Move to Redis-backed store
 * before going beyond a single Replit instance.
 *
 * Dev mode (NODE_ENV !== 'production'): both limiters become no-ops so
 * local development isn't blocked by the per-day session quota. Production
 * still enforces the original PRD limits.
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

const isProd = process.env.NODE_ENV === 'production';

const keyByUser = (req: Request, res: Response): string =>
  req.auth?.userId ?? ipKeyGenerator(req.ip ?? '');
void Response;

const noop: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

export const apiLimiter: RequestHandler = isProd
  ? rateLimit({
      windowMs: 60 * 1000,
      limit: 60,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      keyGenerator: keyByUser,
      message: { error: 'Too many requests', code: 'rate_limited' },
    })
  : noop;

export const sessionStartLimiter: RequestHandler = isProd
  ? rateLimit({
      windowMs: 24 * 60 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      keyGenerator: keyByUser,
      message: { error: 'Daily session limit reached (10 / day)', code: 'session_quota' },
    })
  : noop;
