/* PrimeScreen — full-screen 3-2-1-GO countdown shown immediately after
 * task declaration, before the warm-up gauntlet starts. Auto-advances after
 * GO. No buttons, no skip, ~4.5 seconds total.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ACCENT } from '../games/games.types';

interface PrimeScreenProps {
  taskName: string;
  taskCategory: string;
  language: 'ar' | 'en';
  onDone: () => void;
}

const STEP_MS = 900;
const GO_HOLD_MS = 600;

export default function PrimeScreen({
  language,
  onDone,
}: PrimeScreenProps) {
  // Sequence: 3 → 2 → 1 → GO → done
  const [step, setStep] = useState<3 | 2 | 1 | 0>(3);

  useEffect(() => {
    if (step > 0) {
      const id = setTimeout(() => setStep((s) => (s - 1) as 3 | 2 | 1 | 0), STEP_MS);
      return () => clearTimeout(id);
    }
    const id = setTimeout(onDone, GO_HOLD_MS);
    return () => clearTimeout(id);
  }, [step, onDone]);

  const goLabel = language === 'ar' ? 'انطلِق' : 'GO';
  const arDigit = (n: number) => '٠١٢٣٤٥٦٧٨٩'[n] ?? String(n);
  const display = step > 0
    ? (language === 'ar' ? arDigit(step) : String(step))
    : goLabel;

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{
        padding: '60px 0',
        textAlign: 'center',
        maxWidth: 860,
        margin: '0 auto',
        width: '100%',
      }}
    >
        <div
          style={{
            height: 160,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={display}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                fontSize: 'clamp(72px, 22vw, 112px)',
                fontWeight: 600,
                color: step === 0 ? ACCENT.primary : '#111111',
                lineHeight: 1,
                fontFeatureSettings: '"tnum"',
                fontFamily: 'Fraunces, "Instrument Serif", Georgia, serif',
              }}
            >
              {display}
            </motion.div>
          </AnimatePresence>
        </div>
    </div>
  );
}
