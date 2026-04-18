import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  supabaseUrl: req('SUPABASE_URL'),
  supabaseAnonKey: req('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: req('SUPABASE_SERVICE_ROLE_KEY'),
  geminiApiKey: req('GEMINI_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
  debugPrompts: process.env.DEBUG_PROMPTS === '1',
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;
