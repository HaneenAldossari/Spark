/* BreatheScreen — 4-2-6 box-breathing animation, 2 cycles, ~24 seconds.
 * Auto-advances. No skip button (the whole point is to slow down).
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ACCENT } from '../games/games.types';

const PHASES = [
  { key: 'in',   ms: 4000, scale: 2, opacity: 1.0 },   // breathe in
  { key: 'hold', ms: 2000, scale: 2, opacity: 1.0 },   // hold
  { key: 'out',  ms: 6000, scale: 1, opacity: 0.3 },   // breathe out
] as const;

const TOTAL_CYCLES = 2;

interface BreatheScreenProps {
  language: 'ar' | 'en';
  onDone: () => void;
}

const TEXT = {
  en: {
    in:   'Breathe in',
    hold: 'Hold',
    out:  'Breathe out',
    cycleOf: (i: number, n: number) => `${i} / ${n}`,
  },
  ar: {
    in:   'شهيق',
    hold: 'احبس',
    out:  'زفير',
    cycleOf: (i: number, n: number) => `${i} / ${n}`,
  },
} as const;

export default function BreatheScreen({ language, onDone }: BreatheScreenProps) {
  const t = TEXT[language];
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycle, setCycle] = useState(1);
  const phase = PHASES[phaseIdx]!;

  useEffect(() => {
    const id = setTimeout(() => {
      const nextIdx = phaseIdx + 1;
      if (nextIdx >= PHASES.length) {
        // End of cycle
        if (cycle >= TOTAL_CYCLES) {
          onDone();
          return;
        }
        setCycle((c) => c + 1);
        setPhaseIdx(0);
      } else {
        setPhaseIdx(nextIdx);
      }
    }, phase.ms);
    return () => clearTimeout(id);
  }, [phaseIdx, cycle, phase.ms, onDone]);

  const phaseLabel = phase.key === 'in' ? t.in : phase.key === 'hold' ? t.hold : t.out;
  const labelMuted = phase.key !== 'in';

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{
        padding: '48px 0 32px',
        textAlign: 'center',
        maxWidth: 860,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          height: 220,
          display: 'grid',
          placeItems: 'center',
          marginBottom: 28,
        }}
      >
        <motion.div
          animate={{
            scale: phase.scale,
            opacity: phase.opacity,
          }}
          transition={{
            duration: phase.ms / 1000,
            ease: phase.key === 'hold' ? 'linear' : [0.4, 0, 0.2, 1],
          }}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: ACCENT.primary,
          }}
        />
      </div>

      <p
        style={{
          fontSize: 18,
          fontFamily: 'Fraunces, "Instrument Serif", Georgia, serif',
          fontStyle: 'italic',
          color: labelMuted ? '#888888' : ACCENT.primary,
          margin: 0,
          transition: 'color 0.3s',
        }}
      >
        {phaseLabel}
      </p>

      <p
        style={{
          fontSize: 11,
          color: '#888888',
          opacity: 0.55,
          margin: '32px 0 0',
          fontFeatureSettings: '"tnum"',
          letterSpacing: '2px',
        }}
      >
        {t.cycleOf(cycle, TOTAL_CYCLES)}
      </p>
    </div>
  );
}
