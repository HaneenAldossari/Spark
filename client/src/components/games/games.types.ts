// Shared types for the Phase 2 cognitive game system.

export type GameType = 'nback' | 'ruleswitch' | 'dualtask' | 'dotconnect' | 'schulte' | 'speedmath' | 'reflex' | 'stroop' | 'navon' | 'mentalrotation';

export type GamePhase = 'intro' | 'playing' | 'done';

export interface GameStats {
  timeTakenSec?: number;
  numbersFound?: number;
  totalNumbers?: number;
  gridSize?: number;
  correct?: number;
  total?: number;
  bestStreak?: number;
  puzzlesSolved?: number;
  totalPuzzles?: number;
  hintsUsed?: number;
  correctAnswers?: number;
  totalRounds?: number;
  avgResponseSec?: number;
  fastestSec?: number;
  stroopCorrect?: number;
  stroopTotal?: number;
  stroopAvgSec?: number;
  stroopErrors?: number;
}

export interface GameResult {
  gameType: GameType;
  score: number;       // 0–100, integer (Math.round before returning)
  durationMs: number;  // wall-clock duration of the game itself
  correct: number;     // number of correct responses
  total: number;       // total possible correct responses
  stats?: GameStats;   // per-game breakdown shown on the result card
}

export interface GameProps {
  language: 'ar' | 'en';
  taskCategory: string;
  cognitiveRating: number; // 800–2000, used to scale difficulty
  onComplete: (result: GameResult) => void;
}

// Phase 2 accent palette — purple per design spec.
export const ACCENT = {
  primary: '#534AB7',
  light: '#EEEDFE',
  dark: '#3C3489',
  textOnLight: '#3C3489',
  textOnDark: '#CECBF6',
} as const;

// Session-flow editorial design tokens — match the landing page exactly.
// No white cards, no shadows. Content sits on cream #F5F0E8 directly.
export const SESSION_UI = {
  pageBg: '#F5F0E8',
  textPrimary: '#111111',
  textMuted: '#888888',
  accent: '#534AB7',
  divider: 'rgba(0,0,0,0.08)',
  borderHair: 'rgba(0,0,0,0.12)',
  softFill: 'rgba(0,0,0,0.06)',
  softFillLighter: 'rgba(0,0,0,0.04)',
  softFillDarker: 'rgba(0,0,0,0.15)',
  serif: 'Fraunces, "Instrument Serif", Georgia, serif',
  btnRadius: 24,
  cardRadius: 12,
} as const;

// Help highlight — a glowing purple ring used by every game's in-game Help
// button to silently point at the correct answer. Apply as a CSS box-shadow,
// remove after the per-game timeout (1500ms / 1000ms / 800ms depending on
// the game). No text, no rule explanation — the highlight IS the help.
export const HELP_HIGHLIGHT_BOX_SHADOW =
  '0 0 0 3px #534AB7, 0 0 14px rgba(83,74,183,0.6)';

// Reusable per-game metadata used by the transition screens.
// `rule` = short tagline. `explainer` = plain 1–2 sentence "what you'll do".
export const GAME_META: Record<
  GameType,
  {
    en: { name: string; rule: string; explainer: string };
    ar: { name: string; rule: string; explainer: string };
  }
> = {
  schulte: {
    en: {
      name: 'Schulte Table',
      rule: 'Find the numbers in order.',
      explainer: "A grid of shuffled numbers appears. Tap them in order from 1 upward, as fast as you can. Keep your eyes near the center and use your peripheral vision.",
    },
    ar: {
      name: 'جدول شولته',
      rule: 'من ١ فصاعدًا، بأقصى سرعة.',
      explainer: 'شبكة أرقام مبعثرة. اضغط عليها بالترتيب من ١ فصاعدًا، بأقصى سرعة. ثبّت نظرك في المنتصف، واستخدم الرؤية المحيطيّة.',
    },
  },
  nback: {
    en: {
      name: 'Active Memory',
      rule: 'Same spot as 2 steps ago?',
      explainer: 'A square lights up somewhere on a 3×3 grid each round. If the current spot matches where it was 2 rounds earlier, tap MATCH. Otherwise tap DIFFERENT.',
    },
    ar: {
      name: 'الذاكرة الحيّة',
      rule: 'هل يتطابق مع الجولة قبل السابقة؟',
      explainer: 'يضيء مربّع في كلّ جولة داخل شبكة ٣×٣. اضغط «مطابق» إذا تطابق موضعه مع الجولة قبل السابقة، و«مختلف» إن لم يتطابق.',
    },
  },
  dotconnect: {
    en: {
      name: 'Color Flow',
      rule: 'Connect dots of the same color.',
      explainer: "Drag to connect each pair of colored dots with a line. Lines can't cross each other or go outside the grid. Fill the whole board before time runs out.",
    },
    ar: {
      name: 'وصل الألوان',
      rule: 'صِل النقاط ذات اللون نفسه.',
      explainer: 'اسحب لتصِل كلّ زوج من النقاط بخطٍّ من اللون نفسه. لا تتقاطع الخطوط ولا تخرج عن الشبكة. اِملأ الشبكة قبل انتهاء الوقت.',
    },
  },
  speedmath: {
    en: {
      name: 'Speed Math',
      rule: 'Simple sums, answer fast.',
      explainer: "You'll see simple math problems, one after another. Tap the correct answer as fast as you can. The faster you answer, the more points you get.",
    },
    ar: {
      name: 'الحساب السريع',
      rule: 'احسب. بسرعة.',
      explainer: 'مسائل حسابيّة بسيطة، الواحدة تلو الأخرى. اضغط الإجابة الصحيحة بأقصى سرعة — كلّما أسرعت، زادت النقاط.',
    },
  },
  stroop: {
    en: {
      name: 'Color Clash',
      rule: 'Tap the ink color, not the word.',
      explainer: "A color word appears in a different colored ink (e.g., the word 'RED' written in blue). Ignore the word — tap the color of the ink.",
    },
    ar: {
      name: 'تضارب الألوان',
      rule: 'اضغط لون الحبر، لا الكلمة.',
      explainer: 'ستظهر كلمة لون مكتوبة بحبر مختلف (مثلًا كلمة «أحمر» بالأزرق). تجاهل الكلمة، واضغط لون الحبر.',
    },
  },
  navon: {
    en: {
      name: 'Navon Letters',
      rule: 'Name the small letter.',
      explainer: "A big letter appears on screen, made out of many tiny letters. Ignore the big shape — tap the letter that the small ones are.",
    },
    ar: {
      name: 'حروف نافون',
      rule: 'الحرف الصغير، لا الكبير.',
      explainer: 'يظهر حرفٌ كبير مكوَّن من حروف صغيرة متكرّرة. تجاهل الشكل الكبير، واضغط الحرف الصغير.',
    },
  },
  mentalrotation: {
    en: {
      name: 'Mental Rotation',
      rule: 'Same shape or mirrored?',
      explainer: "Two shapes appear side by side, each rotated differently. Decide if they're the same shape, or if one is a mirror image of the other.",
    },
    ar: {
      name: 'الدوران الذهنيّ',
      rule: 'الشكل نفسه أم معكوس؟',
      explainer: 'شكلان متجاوران، كلٌّ منهما مُدار بزاوية مختلفة. قرِّر: هل هما الشكل نفسه، أم أحدهما صورة مرآة للآخر؟',
    },
  },
  ruleswitch: {
    en: {
      name: 'Rule Switch',
      rule: 'The rule keeps changing.',
      explainer: 'The rule for answering changes mid-game. Stay alert and adapt each time a new rule appears.',
    },
    ar: {
      name: 'تبديل القاعدة',
      rule: 'القاعدة تتغيّر.',
      explainer: 'تتغيّر قاعدة الإجابة في أثناء اللعبة. ابقَ متيقّظًا وتكيّف كلّما ظهرت قاعدة جديدة.',
    },
  },
  dualtask: {
    en: {
      name: 'Dual Task',
      rule: 'Two things at once.',
      explainer: 'Two tasks run at the same time. Respond to both — missing either one counts against you.',
    },
    ar: {
      name: 'مهمّة مزدوجة',
      rule: 'شيئان في الوقت نفسه.',
      explainer: 'تعمل على مهمّتين في الوقت نفسه. أجِب عن كلتيهما — تفويت أيٍّ منهما يخصم من نتيجتك.',
    },
  },
  reflex: {
    en: {
      name: 'Reflex Tap',
      rule: 'Tap as soon as it appears.',
      explainer: 'A target appears at a random moment. Tap it the instant you see it — speed is the only thing that matters.',
    },
    ar: {
      name: 'ردّ الفعل',
      rule: 'اضغط فور ظهوره.',
      explainer: 'سيظهر هدفٌ فجأة في أيّ لحظة. اضغطه لحظة رؤيته — السرعة وحدها هي ما يُحتسب.',
    },
  },
};

// Reusable feedback colors used by every game.
export const FEEDBACK = {
  ok: '#1D9E75',
  okBg: '#E1F5EE',
  okText: '#085041',
  warn: '#BA7517',
  warnBg: '#FAEEDA',
  warnText: '#854F0B',
  bad: '#D85A30',
  badBg: '#FAECE7',
  badText: '#712B13',
} as const;
