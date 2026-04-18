import 'dotenv/config';

// Log which Spark-related env vars are visible to the container at boot.
// Values aren't printed — just whether each key is set — so we can debug
// missing-var issues on hosting platforms without leaking secrets.
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'];
const OPTIONAL = ['PORT', 'CLIENT_ORIGIN', 'GEMINI_MODEL', 'NODE_ENV'];
// eslint-disable-next-line no-console
console.log('[env] visible vars:', {
  ...Object.fromEntries(REQUIRED.map((k) => [k, process.env[k] ? 'SET' : 'MISSING'])),
  ...Object.fromEntries(OPTIONAL.map((k) => [k, process.env[k] ? `SET(${String(process.env[k]).length}ch)` : 'UNSET'])),
});

function soft(name: string): string {
  const v = process.env[name];
  if (!v) {
    // eslint-disable-next-line no-console
    console.warn(`[env] ${name} is MISSING — starting anyway, but features using it will fail at runtime.`);
    return '';
  }
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  supabaseUrl: soft('SUPABASE_URL'),
  supabaseAnonKey: soft('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: soft('SUPABASE_SERVICE_ROLE_KEY'),
  geminiApiKey: soft('GEMINI_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
  debugPrompts: process.env.DEBUG_PROMPTS === '1',
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;
