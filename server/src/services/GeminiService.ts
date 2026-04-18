/* ---------------------------------------------------------------
 * GeminiService — Spark
 * Created: 2026-04-08
 *
 * What: Only place in the codebase that calls the Gemini 1.5 Flash
 *       API. Every function takes an explicit `language: Lang`
 *       parameter and prepends the matching instruction block from
 *       PRD v3 §6.2 to the system prompt. No caller is allowed to
 *       build its own prompt.
 *
 * Why:  Earlier versions of Spark had scattered prompt strings and
 *       the language toggle was not wired to content generation —
 *       Arabic users received English output. This file makes
 *       language a required parameter on every call and fails
 *       closed to the static Arabic/English fallback bank if
 *       Gemini misbehaves (§6.4). Retry-once, then fall back.
 *
 * Structure:
 *   - Language instructions (AR_INSTRUCTION / EN_INSTRUCTION)
 *   - Private callJson() — shared Gemini call + parse + retry
 *   - Public generators — one per PRD §6.3 contract
 *   - scoreArgument() — Phase 4 judge, with §8.3 fallback path
 * -------------------------------------------------------------- */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { env } from '../env.js';
import {
  battleQuestionSchema,
  debatePromptSchema,
  launchMessageSchema,
  parse,
  sanitizeUserText,
  storySchema,
  verdictSchema,
  ValidationError,
  type BattleQuestionOut,
  type DebatePromptOut,
  type LaunchMessageOut,
  type StoryOut,
  type VerdictOut,
} from '../validators/llmValidator.js';
import { fallbacks_en } from '../fallbacks/fallbacks_en.js';
import { fallbacks_ar } from '../fallbacks/fallbacks_ar.js';
import type { BattleCategory, GameType, Lang, TaskCategory } from '../types.js';

// ================================================================
// §6.2 — Language instructions injected into EVERY prompt
// ================================================================
const AR_INSTRUCTION = `
You are generating content for an Arabic-speaking user.
ALL output must be in Arabic (Modern Standard Arabic — فصحى).
This applies to: story text, choices, questions, debate prompts,
feedback sentences, and launch messages.
Do NOT mix Arabic and English in the same output.
Do NOT translate — write natively in Arabic.
Numbers stay as Western numerals (1, 2, 3) not Eastern Arabic numerals.
Maintain proper Arabic grammar and natural sentence flow.
`.trim();

const EN_INSTRUCTION = `
You are generating content for an English-speaking user.
ALL output must be in English.
`.trim();

const JSON_INSTRUCTION = `
Return your answer as a SINGLE JSON object and NOTHING else.
Do not wrap it in markdown code fences. Do not add commentary.
`.trim();

function langBlock(lang: Lang): string {
  return lang === 'ar' ? AR_INSTRUCTION : EN_INSTRUCTION;
}

function fallbacks(lang: Lang) {
  return lang === 'ar' ? fallbacks_ar : fallbacks_en;
}

// ================================================================
// Lazy client init — GoogleGenerativeAI is instantiated once.
// ================================================================
let _model: GenerativeModel | null = null;
function model(): GenerativeModel {
  if (_model) return _model;
  const client = new GoogleGenerativeAI(env.geminiApiKey);
  _model = client.getGenerativeModel({
    model: env.geminiModel,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.8,
    },
  });
  return _model;
}

// ================================================================
// Core call — combines system block with user block, retries once.
// ================================================================
async function callJson(
  label: string,
  lang: Lang,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const fullSystem = `${langBlock(lang)}\n\n${systemPrompt}\n\n${JSON_INSTRUCTION}`;

  // Dev-only prompt trace — enabled by DEBUG_PROMPTS=1. First 120 chars so
  // we can confirm the Arabic instruction is being prepended without
  // flooding the logs. Remove this block once you are satisfied.
  if (env.debugPrompts) {
    // eslint-disable-next-line no-console
    console.log(
      `[gemini:${label}:${lang}] system="${fullSystem.slice(0, 120).replace(/\n/g, ' ')}…" user="${userPrompt.slice(0, 120).replace(/\n/g, ' ')}…"`,
    );
  }

  const m = model();
  const run = async () => {
    const res = await m.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${fullSystem}\n\n---\n\n${userPrompt}` }] },
      ],
    });
    return res.response.text();
  };

  try {
    return await run();
  } catch (e) {
    // One retry on transient failure.
    // eslint-disable-next-line no-console
    console.warn(`[gemini:${label}] first call failed: ${(e as Error).message}. Retrying once…`);
    return await run();
  }
}

// Validate with retry-once semantics inside the validator step as well.
async function callAndParse<T>(
  label: string,
  lang: Lang,
  systemPrompt: string,
  userPrompt: string,
  schema: Parameters<typeof parse<T>>[0],
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await callJson(label, lang, systemPrompt, userPrompt);
      return parse(schema, raw);
    } catch (e) {
      lastErr = e;
      if (e instanceof ValidationError) {
        // eslint-disable-next-line no-console
        console.warn(`[gemini:${label}] validation failed (attempt ${attempt + 1}): ${e.message}`);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

// ================================================================
// §6.3 — Public generators
// ================================================================

export async function generateStory(
  taskText: string,
  taskCategory: TaskCategory,
  lang: Lang,
): Promise<StoryOut> {
  const clean = sanitizeUserText(taskText, 200);
  const system = `
You are writing a 3-sentence micro-story for the opening phase of a
cognitive warm-up session. The story must gently activate the user's
imagination without demanding effort. Story themes should be
semantically adjacent to the user's declared task — e.g., for coding,
a subtle "system / door / mechanism" vibe; for writing, a subtle
"blank page / voice / letter" vibe. Never mention the task directly.

Output JSON with this exact shape:
{ "story": "<80-300 chars>",
  "choices": ["<10-80 chars>", "<10-80 chars>", "<10-80 chars>"] }
The three choices are three different things the reader could do next
in the story. They must be short and concrete.
`.trim();
  const user = `Task category: ${taskCategory}\nDeclared task: ${clean}`;
  try {
    return await callAndParse<StoryOut>('story', lang, system, user, storySchema);
  } catch {
    return fallbacks(lang).story();
  }
}

export async function generateBattleQuestion(
  category: BattleCategory,
  ratingRange: [number, number],
  lang: Lang,
): Promise<BattleQuestionOut> {
  const system = `
You are generating one multiple-choice question for a 60-second live
1v1 battle between two users in a focus-prep app. The question must
have exactly ONE correct answer, be solvable in 30 seconds, and
require no outside knowledge.

Output JSON with this exact shape:
{ "question": "<the question>",
  "options": ["A","B","C","D"],
  "answer_index": <0|1|2|3>,
  "explanation": "<50-200 chars explaining why the answer is correct>" }
`.trim();
  const user = `Category: ${category}\nDifficulty rating range: ${ratingRange[0]}–${ratingRange[1]}`;
  try {
    return await callAndParse<BattleQuestionOut>('battle', lang, system, user, battleQuestionSchema);
  } catch {
    return fallbacks(lang).battleQuestion();
  }
}

export async function generateDebatePrompt(
  taskText: string,
  taskCategory: TaskCategory,
  lang: Lang,
): Promise<DebatePromptOut> {
  const clean = sanitizeUserText(taskText, 200);
  const system = `
You are generating a debate prompt for Phase 4 of a focus warm-up.
The user will write a 3-sentence argument defending or rejecting the
statement. The prompt must be debatable (not a fact), opinionated, and
short. It should be loosely related to the user's task domain so it
feels coherent, but not about the task itself.

Output JSON with this exact shape:
{ "prompt": "<40-120 chars>", "side": "agree" | "disagree" }
"side" marks the stance the statement takes — used only for telemetry,
not shown to the user.
`.trim();
  const user = `Task category: ${taskCategory}\nDeclared task: ${clean}`;
  try {
    return await callAndParse<DebatePromptOut>('debate', lang, system, user, debatePromptSchema);
  } catch {
    return fallbacks(lang).debatePrompt();
  }
}

// ---------- Phase 4 judge ----------
// §8.3: if both attempts fail, return the neutral fallback marked
// with fallback:true so the route can persist verdict_fallback=true.
export interface ScoreArgumentResult extends VerdictOut {
  fallback: boolean;
}
export async function scoreArgument(
  argument: string,
  debatePrompt: string,
  lang: Lang,
): Promise<ScoreArgumentResult> {
  const clean = sanitizeUserText(argument, 1000);
  const isAr = lang === 'ar';
  const system = `
You are an impartial reasoning judge for a focus warm-up app. You are
given a debate prompt and a user's 3-sentence argument. Score the
argument on three axes (0-100 integers): logic, evidence, clarity.
Then write a single feedback sentence critiquing the REASONING ONLY —
never the position taken. Keep feedback under 120 characters.
${isAr ? 'The user\'s argument is written in Arabic. Evaluate it in Arabic context. Your feedback field must be written in Arabic (max 120 characters).' : ''}

Output JSON with this exact shape:
{ "logic": <int 0-100>,
  "evidence": <int 0-100>,
  "clarity": <int 0-100>,
  "feedback": "<one sentence>" }
`.trim();
  const user = `Debate prompt: ${debatePrompt}\n\nUser argument: ${clean}`;
  try {
    const v = await callAndParse<VerdictOut>('verdict', lang, system, user, verdictSchema);
    return { ...v, fallback: false };
  } catch {
    return { ...fallbacks(lang).verdict(), fallback: true };
  }
}

export async function generateLaunchMessage(
  task: string,
  brainScore: number,
  components: { game: number; battle: number; verdict: number; consistency: number },
  lang: Lang,
): Promise<LaunchMessageOut> {
  const clean = sanitizeUserText(task, 200);
  const system = `
You are writing a 2-sentence personalized launch message shown at the
end of a 7-minute cognitive warm-up. It must:
- Feel written by a human, not marketing.
- Reference the user's declared task naturally.
- Match the Brain Score tone: high (>=85) = sharp confidence;
  mid (65-84) = steady encouragement; low (<65) = honest restart.
- Never promise outcomes. Never say "you can do it".
- Length: 80-200 characters.

Output JSON with this exact shape:
{ "message": "<80-200 chars>" }
`.trim();
  const user = `Declared task: ${clean}
Brain score: ${brainScore}
Components: game=${components.game}, battle=${components.battle}, verdict=${components.verdict}, consistency=${components.consistency}`;
  try {
    return await callAndParse<LaunchMessageOut>('launch', lang, system, user, launchMessageSchema);
  } catch {
    return fallbacks(lang).launchMessage(clean);
  }
}

// Phase 2 game content is mostly deterministic (shapes live client-side
// in the game components). Gemini is used only for thematic variation,
// which for MVP we can satisfy with deterministic seeds. This export
// exists so routes have a single place to call when that changes.
export async function generateGameContent(
  _gameType: GameType,
  _cognitiveRating: number,
  _taskContext: string,
  _lang: Lang,
): Promise<{ seed: number }> {
  // TODO: invoke Gemini for thematic word lists (Word Sprint) and
  // pattern themes once the static generators are too repetitive.
  return { seed: Math.floor(Math.random() * 2 ** 31) };
}
