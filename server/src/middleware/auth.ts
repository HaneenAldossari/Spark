/* JWT verification middleware — uses Supabase Auth admin SDK to verify
 * the bearer token on every protected route. Attaches { userId, email }
 * to req.auth.
 */
import type { NextFunction, Request, Response } from 'express';
import { admin } from '../services/SupabaseService.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { userId: string; email: string };
    isGuest?: boolean;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({ error: 'Missing bearer token', code: 'no_token' });
    return;
  }
  const token = header.slice(7).trim();
  try {
    const { data, error } = await admin().auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: 'Invalid token', code: 'bad_token' });
      return;
    }
    req.auth = { userId: data.user.id, email: data.user.email ?? '' };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Auth check failed', code: 'auth_error' });
  }
}

/**
 * Same as requireAuth, but treats a missing or empty bearer token as a
 * guest session: req.auth stays undefined, req.isGuest = true. Routes
 * that mount this must branch on req.isGuest before doing any DB work.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    req.isGuest = true;
    next();
    return;
  }
  const token = header.slice(7).trim();
  if (!token) {
    req.isGuest = true;
    next();
    return;
  }
  try {
    const { data, error } = await admin().auth.getUser(token);
    if (error || !data?.user) {
      // Invalid token → fall through as guest (don't 401 — guests are allowed here)
      req.isGuest = true;
      next();
      return;
    }
    req.auth = { userId: data.user.id, email: data.user.email ?? '' };
    req.isGuest = false;
    next();
  } catch {
    req.isGuest = true;
    next();
  }
}
