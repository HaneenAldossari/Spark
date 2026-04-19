/**
 * Spark backend — entry point.
 * Wires Express, CORS, rate limiting, and all routes.
 */
import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import sessionRoutes from './routes/session.js';

const app = express();

// Public app — no auth, no cookies, nothing origin-scoped to protect.
// Accept any origin so the Vercel client (and any future frontend) works
// without a CLIENT_ORIGIN allow-list.
app.use(cors({ origin: true }));
app.use(express.json({ limit: '64kb' }));
app.use('/api', apiLimiter);

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'spark-api', hint: 'use /api/health' });
});
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'spark-api', stage: 1, ts: new Date().toISOString() });
});

app.use('/api/session', sessionRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error', code: 'internal' });
});

// Bind to :: (IPv6) which Node enables as dual-stack on Linux — accepts
// both IPv6 and IPv4 connections. Railway's internal router uses IPv6, so
// an IPv4-only bind (0.0.0.0) causes 502s even though the server is up.
app.listen(env.port, '::', () => {
  // eslint-disable-next-line no-console
  console.log(`[spark] api listening on [::]:${env.port}`);
});
