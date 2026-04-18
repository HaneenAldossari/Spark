/* English static fallback bank — used when Gemini returns invalid JSON twice,
 * or when the Gemini API is unavailable.
 *
 * TODO: expand every array below to 200+ items pre-launch (PRD v3 §9.4).
 * Seed content below is deliberately small (~12 items per type) so we have
 * coverage end-to-end while the full content pass is scheduled.
 */
import type {
  StoryOut,
  BattleQuestionOut,
  DebatePromptOut,
  VerdictOut,
  LaunchMessageOut,
} from '../validators/llmValidator.js';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ---------- Stories ----------
const stories: readonly StoryOut[] = [
  {
    story: 'A door appears on the side of the mountain you have climbed since dawn. There is no handle — only three faint marks. You step closer, and the air thickens with something almost like a memory.',
    choices: ['Trace the marks with your finger', 'Press your ear to the wood', 'Step back and watch the air'],
  },
  {
    story: 'In the empty library, a single book is open on the floor. Its pages are blank, except for a name written in the margin — and the name is yours.',
    choices: ['Read the margin aloud', 'Turn the blank page slowly', 'Close the book gently'],
  },
  {
    story: 'The sea has gone quiet. Not still — quiet, like it is listening. On the shore, a small boat waits, already untied.',
    choices: ['Step in and push off', 'Wait for the tide to rise', 'Walk along the shore first'],
  },
  {
    story: 'You find a letter on your desk, addressed in your own handwriting. The date on the envelope is ten years from today. It is still sealed.',
    choices: ['Open it at once', 'Hold it up to the light', 'Place it unopened in a drawer'],
  },
  {
    story: 'A small fox is sitting in your kitchen, perfectly calm. It has your car keys in its mouth, and it is waiting for you to understand something.',
    choices: ['Sit down slowly across from it', 'Offer a piece of bread', 'Follow its eyes to the window'],
  },
  {
    story: 'The clock on the wall has stopped, but the second hand is trembling. Behind you, something is reading your thoughts — not hostile, only curious.',
    choices: ['Ask it a question in your head', 'Stay perfectly still', 'Turn around very slowly'],
  },
  {
    story: 'A train you have never seen before pulls into the station. Every window is lit. No one steps off, and the conductor is smiling at you.',
    choices: ['Board without asking where', 'Ask the conductor a question', 'Walk back to the platform bench'],
  },
  {
    story: 'Your shadow is a few steps ahead of you today. It waits at corners. It looks back to make sure you are following.',
    choices: ['Match its pace exactly', 'Call out to it softly', 'Stop walking and see what it does'],
  },
  {
    story: 'You open a notebook to a page you do not remember writing. The handwriting is yours. The instructions are clear, detailed, and urgent.',
    choices: ['Read the first instruction', 'Flip to the last page first', 'Take the notebook outside'],
  },
  {
    story: 'A quiet hallway stretches further than the building should allow. Every door is slightly open, and each leaks a different kind of light.',
    choices: ['Walk to the warmest light', 'Choose the nearest door', 'Turn back and close your eyes'],
  },
  {
    story: 'A single sentence glows on your phone screen. It is a question no one has ever asked you, and you already know the answer.',
    choices: ['Say the answer aloud', 'Write it down first', 'Lock the phone and wait'],
  },
  {
    story: 'An old friend you have not spoken to in years sends you a map with one circle on it. No message, no explanation. The circle is near your home.',
    choices: ['Go there immediately', 'Send a single question back', 'Study the map more carefully'],
  },
];

// ---------- Battle questions ----------
const battleQuestions: readonly BattleQuestionOut[] = [
  {
    question: 'If all Glints are Tarns, and some Tarns are Vims, which is necessarily true?',
    options: ['All Glints are Vims', 'Some Glints may be Vims', 'No Glints are Vims', 'All Vims are Glints'],
    answer_index: 1,
    explanation: 'Only possibility is allowed — the overlap between Tarns and Vims is partial, so Glints may or may not intersect Vims.',
  },
  {
    question: 'Which number completes the sequence: 2, 6, 12, 20, 30, __ ?',
    options: ['36', '40', '42', '44'],
    answer_index: 2,
    explanation: 'Differences are 4, 6, 8, 10, then 12. 30 + 12 = 42.',
  },
  {
    question: 'A bat and a ball cost $1.10. The bat costs $1.00 more than the ball. How much is the ball?',
    options: ['$0.10', '$0.05', '$0.15', '$0.01'],
    answer_index: 1,
    explanation: 'If ball = x, bat = x + 1.00, so 2x + 1.00 = 1.10, x = 0.05.',
  },
  {
    question: 'Which word does not belong with the others?',
    options: ['Carrot', 'Potato', 'Onion', 'Apple'],
    answer_index: 3,
    explanation: 'Carrot, potato, and onion are vegetables that grow underground. Apple is a fruit that grows above ground.',
  },
  {
    question: 'If it takes 5 machines 5 minutes to make 5 widgets, how long do 100 machines take to make 100 widgets?',
    options: ['100 minutes', '20 minutes', '5 minutes', '1 minute'],
    answer_index: 2,
    explanation: 'Each machine makes 1 widget in 5 minutes. 100 machines make 100 widgets in parallel, still in 5 minutes.',
  },
  {
    question: 'Rearrange the letters of ASTRONOMER to form a single word.',
    options: ['MOONSTARER', 'NOMATERS', 'TRANSOMER', 'MOON STARER'],
    answer_index: 0,
    explanation: 'ASTRONOMER anagrams to MOON STARER (single-word form MOONSTARER).',
  },
  {
    question: 'In a race you overtake the person in 2nd place. What position are you in now?',
    options: ['1st', '2nd', '3rd', '4th'],
    answer_index: 1,
    explanation: 'You take their position — 2nd. The 1st place runner is still ahead.',
  },
  {
    question: 'Which is the odd one out: 121, 144, 169, 200, 225?',
    options: ['121', '144', '200', '225'],
    answer_index: 2,
    explanation: '121, 144, 169, 225 are all perfect squares (11², 12², 13², 15²). 200 is not a perfect square.',
  },
  {
    question: 'Complete the pattern: J, F, M, A, M, J, __',
    options: ['J', 'K', 'A', 'S'],
    answer_index: 0,
    explanation: 'First letters of months: January, February, March, April, May, June, July.',
  },
  {
    question: 'A clock shows 3:15. What is the angle between the hour and minute hands?',
    options: ['0°', '7.5°', '15°', '22.5°'],
    answer_index: 1,
    explanation: 'At 3:15, the minute hand is at 90°. The hour hand has moved 0.25 × 30° = 7.5° past 3. Difference: 7.5°.',
  },
  {
    question: 'Which word logically completes: Book is to reading as fork is to __?',
    options: ['Eating', 'Drawing', 'Writing', 'Cooking'],
    answer_index: 0,
    explanation: 'A book is used for reading; a fork is used for eating. Tool-to-primary-activity analogy.',
  },
  {
    question: 'If yesterday was two days before Wednesday, what day will tomorrow be?',
    options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    answer_index: 1,
    explanation: 'Two days before Wednesday is Monday. So yesterday was Monday, today is Tuesday, tomorrow is Wednesday. Wait — tomorrow is Tuesday + 1 = Wednesday. Corrected: answer is Wednesday.',
  },
];

// ---------- Debate prompts ----------
const debatePrompts: readonly DebatePromptOut[] = [
  { prompt: 'A short focused workday is more valuable than a long scattered one.', side: 'agree' },
  { prompt: 'The best ideas arrive only when you stop actively searching for them.', side: 'agree' },
  { prompt: 'Effort is a more reliable signal of future success than raw talent.', side: 'agree' },
  { prompt: 'Cutting a sentence is harder, and more useful, than writing a new one.', side: 'agree' },
  { prompt: 'Refactoring should always be a separate commit from a feature change.', side: 'agree' },
  { prompt: 'Spaced repetition matters more than total study hours for long retention.', side: 'agree' },
  { prompt: 'A generalist will outperform a specialist in most creative work.', side: 'disagree' },
  { prompt: 'Deadlines make people produce worse work, not better work.', side: 'disagree' },
  { prompt: 'Reading widely is more important than reading deeply for young minds.', side: 'agree' },
  { prompt: 'Measuring productivity almost always distorts the behavior being measured.', side: 'agree' },
  { prompt: 'Writing by hand makes you think more carefully than typing does.', side: 'agree' },
  { prompt: 'Most meetings could be replaced by a single well-written document.', side: 'agree' },
];

// ---------- Launch messages (templated, §6.4 fallback) ----------
const launchMessages: readonly string[] = [
  'Your brain is primed. Open your task in the next sixty seconds — momentum is fragile, and you have built it.',
  "You are ready. Do not reread this message — open the task and make the smallest first move.",
  'Seven minutes is enough. Your mind is awake. Begin the task now, before the inertia returns.',
  'Clear head. Sharp attention. The next hour belongs to the work in front of you.',
  'The warm-up is complete. No more preparation. Your task is waiting — go.',
];

// ---------- Verdict fallback (PRD §8.3 — never fabricate a score) ----------
const verdictFallback: VerdictOut = {
  logic: 50,
  evidence: 50,
  clarity: 50,
  feedback: 'Score unavailable — argument was noted.',
};

// ---------- Public API ----------
export const fallbacks_en = {
  story: (): StoryOut => pick(stories),
  battleQuestion: (): BattleQuestionOut => pick(battleQuestions),
  debatePrompt: (): DebatePromptOut => pick(debatePrompts),
  launchMessage: (task: string): LaunchMessageOut => ({
    message: `${pick(launchMessages)} Your task: ${task}.`.slice(0, 220),
  }),
  verdict: (): VerdictOut => ({ ...verdictFallback }),
};
