/* CheckInScreen — emotional check-in shown after the warm-up gauntlet,
 * before the focus score.
 *   - Nervous   → BreatheScreen
 *   - Okay/Ready → FocusScoreScreen
 */
import { ACCENT } from '../games/games.types';

export type CheckInResponse = 'nervous' | 'okay' | 'ready';

interface CheckInScreenProps {
  taskName: string;
  language: 'ar' | 'en';
  onAnswer: (response: CheckInResponse) => void;
}

const SERIF = 'Fraunces, "Instrument Serif", Georgia, serif';

const TEXT = {
  en: {
    heading: 'How are you feeling about your task?',
    nervous: 'Nervous',
    okay: 'Okay',
    ready: 'Ready',
  },
  ar: {
    heading: 'كيف تشعر تجاه مهمّتك؟',
    nervous: 'متوتّر',
    okay: 'لا بأس',
    ready: 'جاهز',
  },
} as const;

const OPTIONS: { id: CheckInResponse; emoji: string; key: 'nervous' | 'okay' | 'ready' }[] = [
  { id: 'nervous', emoji: '😟', key: 'nervous' },
  { id: 'okay',    emoji: '🙂', key: 'okay' },
  { id: 'ready',   emoji: '💪', key: 'ready' },
];

export default function CheckInScreen({ taskName, language, onAnswer }: CheckInScreenProps) {
  const t = TEXT[language];
  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{
        padding: '24px 0',
        textAlign: 'center',
        maxWidth: 860,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <h2
        style={{
          fontSize: 'clamp(22px, 6vw, 28px)',
          fontWeight: 600,
          color: '#111111',
          margin: '0 0 8px',
          lineHeight: 1.3,
          fontFamily: SERIF,
        }}
      >
        {t.heading}
      </h2>
      <p
        style={{
          fontSize: 14,
          color: '#888888',
          margin: '0 0 32px',
          wordBreak: 'break-word',
          fontStyle: 'italic',
        }}
      >
        {taskName}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onAnswer(opt.id)}
            style={{
              width: '100%',
              maxWidth: 360,
              minHeight: 60,
              background: 'transparent',
              border: '0.5px solid rgba(0,0,0,0.12)',
              borderRadius: 12,
              padding: '18px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              transition: 'border-color 0.15s, background 0.15s',
              flexDirection: language === 'ar' ? 'row-reverse' : 'row',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ACCENT.primary;
              e.currentTarget.style.background = 'rgba(83,74,183,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span aria-hidden style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
            <span
              style={{
                fontSize: 16,
                fontFamily: SERIF,
                color: '#111111',
              }}
            >
              {t[opt.key]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
