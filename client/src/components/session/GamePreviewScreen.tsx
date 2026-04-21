/* GamePreviewScreen — shown after the user clicks "Start a session" but
 * BEFORE the 3-2-1 countdown. Lists the 5 games they're about to play with
 * a one-line explainer each, so nothing comes as a surprise. A single
 * "Start now" button continues to the countdown.
 */
import { motion } from 'framer-motion';
import type { GameType } from '../games/games.types';
import { ACCENT, GAME_META } from '../games/games.types';

interface GamePreviewScreenProps {
  language: 'ar' | 'en';
  games: GameType[];
  taskCategory?: string;
  onStart: () => void;
}

const CATEGORY_LABEL: Record<'en' | 'ar', Record<string, string>> = {
  en: {
    studying:   'studying',
    coding:     'coding',
    writing:    'writing',
    design:     'design',
    designing:  'design',
    math:       'math',
    reading:    'reading',
    presenting: 'presenting',
    other:      'your task',
  },
  ar: {
    studying:   'المذاكرة',
    coding:     'البرمجة',
    writing:    'الكتابة',
    design:     'التصميم',
    designing:  'التصميم',
    math:       'الرياضيات',
    reading:    'القراءة',
    presenting: 'العرض',
    other:      'مهمّتك',
  },
};

function categoryLabel(taskCategory: string | undefined, lang: 'ar' | 'en'): string {
  const key = (taskCategory ?? 'other').toLowerCase();
  return CATEGORY_LABEL[lang][key] ?? CATEGORY_LABEL[lang].other!;
}

const TEXT = {
  en: {
    eyebrow: 'Your session',
    heading: "Here's what you'll play",
    subtitle: (cat: string) => `5 games selected for ${cat} · about 5 minutes`,
    cta: 'Start now',
  },
  ar: {
    eyebrow: 'جلستك',
    heading: 'هذه الألعاب التي ستلعبها',
    subtitle: (cat: string) => `٥ ألعاب مختارة لـ${cat} · نحو ٥ دقائق`,
    cta: 'لنبدأ الآن',
  },
} as const;

export default function GamePreviewScreen({
  games,
  taskCategory,
  language,
  onStart,
}: GamePreviewScreenProps) {
  const catText = categoryLabel(taskCategory, language);
  const t = TEXT[language];
  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{
        padding: '32px 0 48px',
        maxWidth: 720,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ textAlign: 'center', marginBottom: 36 }}
      >
        <p
          style={{
            fontSize: 12,
            color: '#888888',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          {t.eyebrow}
        </p>
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 600,
            color: '#111111',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
            fontFamily: 'Fraunces, "Instrument Serif", Georgia, serif',
          }}
        >
          {t.heading}
        </h1>
        <p
          style={{
            fontSize: 17,
            color: '#555555',
            lineHeight: 1.5,
            margin: 0,
            maxWidth: 460,
            marginInline: 'auto',
            fontStyle: 'italic',
            fontFamily: 'Fraunces, "Instrument Serif", Georgia, serif',
          }}
        >
          {t.subtitle(catText)}
        </p>
      </motion.div>

      <motion.ol
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '0 0 40px',
          borderTop: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {games.map((g, i) => {
          const meta = GAME_META[g][language];
          return (
            <li
              key={`${g}-${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                gap: 18,
                padding: '18px 4px',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 13,
                  color: ACCENT.primary,
                  letterSpacing: '0.08em',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: '#111111',
                    margin: '0 0 4px',
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    fontFamily:
                      'Fraunces, "Instrument Serif", Georgia, serif',
                  }}
                >
                  {meta.name}
                </p>
                <p
                  style={{
                    fontSize: 15,
                    color: '#555555',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {meta.explainer}
                </p>
              </div>
            </li>
          );
        })}
      </motion.ol>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{ display: 'flex', justifyContent: 'center' }}
        className="gp-cta-wrap"
      >
        <button
          type="button"
          onClick={onStart}
          autoFocus
          className="gp-cta-btn"
          style={{
            background: '#111111',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 24,
            padding: '18px 56px',
            fontSize: 17,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'Fraunces, "Instrument Serif", Georgia, serif',
            minHeight: 52,
          }}
        >
          {t.cta}
        </button>
      </motion.div>
      <style>{`
        @media (max-width: 480px) {
          .gp-cta-wrap { width: 100%; }
          .gp-cta-btn { width: 100% !important; padding: 18px 24px !important; }
        }
      `}</style>
    </div>
  );
}
