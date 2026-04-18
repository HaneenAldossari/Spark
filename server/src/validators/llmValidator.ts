/* llmValidator — enforces PRD v3 §6.4 output rules on every Gemini response.
 *
 * Usage: parse(schema, rawText) → strongly typed object OR throws ValidationError.
 * Callers (GeminiService) retry once on failure; on second failure they fall
 * back to the static bank in fallbacks_{lang}.ts.
 */
import { z } from 'zod';

export class ValidationError extends Error {
  constructor(message: string, public readonly raw?: string) {
    super(message);
  }
}

// ---------- Schemas (shapes from §6.3 contracts) ----------

export const storySchema = z.object({
  story: z.string().min(80).max(300),
  choices: z.array(z.string().min(10).max(80)).length(3),
});
export type StoryOut = z.infer<typeof storySchema>;

export const battleQuestionSchema = z.object({
  question: z.string().min(20).max(240),
  options: z.array(z.string().min(1).max(120)).length(4),
  answer_index: z.number().int().min(0).max(3),
  explanation: z.string().min(30).max(240),
});
export type BattleQuestionOut = z.infer<typeof battleQuestionSchema>;

export const debatePromptSchema = z.object({
  prompt: z.string().min(40).max(160),
  side: z.enum(['agree', 'disagree']),
});
export type DebatePromptOut = z.infer<typeof debatePromptSchema>;

export const verdictSchema = z.object({
  logic: z.number().int().min(0).max(100),
  evidence: z.number().int().min(0).max(100),
  clarity: z.number().int().min(0).max(100),
  feedback: z.string().min(1).max(160),
});
export type VerdictOut = z.infer<typeof verdictSchema>;

export const launchMessageSchema = z.object({
  message: z.string().min(60).max(220),
});
export type LaunchMessageOut = z.infer<typeof launchMessageSchema>;

// ---------- JSON extraction ----------

// Gemini sometimes wraps JSON in ```json fences even in JSON mode.
// Strip fences and trim before parsing.
export function extractJson(raw: string): unknown {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  // Sometimes the model emits leading prose — pluck the first {...} block.
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace > 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    throw new ValidationError(`LLM returned invalid JSON: ${(e as Error).message}`, raw);
  }
}

export function parse<T>(schema: z.ZodType<T>, raw: string): T {
  const obj = extractJson(raw);
  const result = schema.safeParse(obj);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ValidationError(`LLM output failed schema: ${issues}`, raw);
  }
  return result.data;
}

// ---------- Content safety stubs ----------
// TODO moderation: PRD v3 §17 Q5. For MVP we only strip HTML/control chars.
// Before sending to Gemini, sanitize user-supplied text here.
export function sanitizeUserText(text: string, maxLen = 1000): string {
  return text
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .slice(0, maxLen)
    .trim();
}
