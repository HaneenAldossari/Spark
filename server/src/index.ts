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

// Allow the configured client origin AND its 127.0.0.1 / localhost twin,
// since browsers treat them as distinct origins for CORS purposes.
const allowedOrigins = new Set<string>([
  env.clientOrigin,
  env.clientOrigin.replace('localhost', '127.0.0.1'),
  env.clientOrigin.replace('127.0.0.1', 'localhost'),
]);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '64kb' }));
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'spark-api', stage: 1, ts: new Date().toISOString() });
});

app.use('/api/session', sessionRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error', code: 'internal' });
});

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[spark] api listening on http://localhost:${env.port}`);
});
