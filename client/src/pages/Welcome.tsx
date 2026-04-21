import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';

export default function Welcome() {
  const t = useStore((s) => s.t);
  const language = useStore((s) => s.language);
  const ar = language === 'ar';

  return (
    <div className="px-5 md:px-12 pt-6 pb-24">
      <div className="max-w-[1320px] mx-auto">
        <section className="grid grid-cols-12 gap-y-8 md:gap-x-10">
          <div className="col-span-12 md:col-span-8">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.2, 0.65, 0.3, 1] }}
              className={`font-display font-medium text-ink tracking-[-0.045em] text-[clamp(40px,11vw,88px)] ${ar ? 'leading-[1.35]' : 'leading-[0.86]'}`}
            >
              {t.welcome.heroLine1}
              <br />
              {t.welcome.heroLine2}
              <br />
              <span className="font-serif-i text-ash font-normal">{t.welcome.heroLine3before}</span>
              {t.welcome.heroLine3after}
            </motion.h1>
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col justify-end gap-8">
            <p className="font-serif-i text-[20px] md:text-[26px] leading-[1.25] text-ink/80 text-balance max-w-[34ch]">
              {t.welcome.heroSub}
            </p>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-wrap">
              <Link to="/declare" className="btn-ink inline-flex items-center justify-center gap-2 w-full md:w-auto min-h-[44px]">
                {t.welcome.cta}
                <Arrow />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-20 md:mt-28 border-y border-ink/15">
          <div className="grid grid-cols-3 divide-x divide-ink/15">
            <Stat
              label={ar ? 'الجلسة' : 'Session'}
              value="05:00"
              sub={ar ? 'خمس دقائق' : 'Five minutes'}
            />
            <Stat
              label={ar ? 'الألعاب' : 'Games'}
              value="5"
              sub={ar ? 'مختارة لمهمّتك' : 'Selected for your task'}
            />
            <Stat
              label={ar ? 'درجة التركيز' : 'Focus Score'}
              value="0–100"
              sub={ar ? 'درجة جاهزيّة صادقة' : 'Honest readiness score'}
            />
          </div>
        </section>

        <section className="mt-20 md:mt-28">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {phases.map((p, i) => (
              <PhaseCard key={p.labelEn} {...p} index={i} />
            ))}
          </div>
        </section>

        <section className="mt-20 md:mt-32 grid grid-cols-12 gap-6 md:gap-10">
          <div className="col-span-12 md:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.2em] text-ash mb-4">{t.welcome.problemEyebrow}</div>
            <p className="font-display text-[clamp(26px,7vw,44px)] leading-[1.04] tracking-[-0.025em] text-balance">
              {t.welcome.problemLine1}
              <br />
              {t.welcome.problemLine2before}
              <span className="font-serif-i text-ash">{t.welcome.problemLine2after}</span>
            </p>
            <p className="font-serif-i text-[16px] md:text-[18px] text-ink/70 mt-6 leading-[1.5] max-w-[38ch]">
              {ar
                ? 'دماغك يحتاج من ٦ إلى ٢٠ دقيقة من التنشيط التدريجيّ قبل أن يدخل في التركيز العميق. الإرادة وحدها لا تختصر هذه الخطوة. سبارك يقوم بالتهيئة عنك في خمس دقائق.'
                : 'Your brain needs 6–20 minutes of graduated activation before it can hold deep focus. Willpower can\'t skip the warm-up. Spark does it for you, in five minutes.'}
            </p>
          </div>
          <div className="col-span-12 md:col-span-7 grid grid-cols-2 gap-3 md:gap-5 text-[13px] md:text-[15px] leading-snug text-ink/80">
            <Card title="DMN">
              {ar ? 'نشطة أثناء التمرير. تُكبَت في ستّين ثانية.' : 'Active while scrolling. Suppressed in 60 seconds.'}
            </Card>
            <Card title="PFC">
              {ar ? 'تحتاج من ٦ إلى ٢٠ دقيقة للتسخين.' : 'Needs 6–20 min to warm up.'}
            </Card>
            <Card title={ar ? 'الدوبامين' : 'Dopamine'}>
              {ar ? 'خدّرته المكافآت السريعة. يُعاد ضبطه بالمكاسب المستحَقّة.' : 'Numbed by cheap rewards. Reset by earned wins.'}
            </Card>
            <Card title={ar ? 'النورإبينفرين' : 'Norepinephrine'}>
              {ar ? 'بدون جِدّة، لا يُفرَز هرمون التركيز.' : 'No novelty, no focus hormone.'}
            </Card>
          </div>
        </section>

        <section className="mt-24 md:mt-32">
          <div className="text-[11px] uppercase tracking-[0.2em] text-ash mb-4">{t.welcome.notEyebrow}</div>
          <h2 className="font-display text-[clamp(28px,8vw,52px)] leading-[0.95] tracking-[-0.03em] mb-10">
            {t.welcome.notHead}
          </h2>
          <div className="border-t border-ink/15">
            {(ar ? compare.ar : compare.en).map((row) => (
              <div key={row.them} className="grid grid-cols-12 items-baseline gap-y-1.5 gap-x-4 py-5 border-b border-ink/15">
                <div className="col-span-12 md:col-span-3 text-[11px] md:text-[12px] uppercase tracking-[0.18em] text-ash">{row.them}</div>
                <div className="col-span-12 md:col-span-4 font-serif-i text-[16px] md:text-[18px] text-ink/70">{row.theyDo}</div>
                <div className="col-span-12 md:col-span-5 font-display text-[18px] md:text-[22px] tracking-[-0.01em]">{row.weDo}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-28 md:mt-40 grid grid-cols-12 gap-6 md:gap-10 items-end">
          <div className="col-span-12 md:col-span-7">
            <p className={`font-display text-[clamp(36px,10vw,88px)] tracking-[-0.035em] text-balance ${ar ? 'leading-[1.35]' : 'leading-[0.92]'}`}>
              {t.welcome.promiseLine1}
              <br />
              <span className="font-serif-i text-ash">{t.welcome.promiseLine2}</span>
            </p>
          </div>
          <div className="col-span-12 md:col-span-5 flex md:justify-end flex-col items-stretch md:items-end gap-2">
            <Link to="/declare" className="btn-ink text-[15px] !py-5 !px-8 inline-flex items-center justify-center gap-3 w-full md:w-auto min-h-[44px]">
              {t.welcome.promiseCta}
              <Arrow />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

// New 4-step flow (replaces the legacy 5-phase grid).
const phases = [
  {
    labelEn: 'STEP 01',
    labelAr: 'الخطوة ٠١',
    nameEn: 'Declare',
    nameAr: 'الإعلان',
    time: '0:00 → 0:10',
    descEn: "Tell Spark what you're about to do. Pick a category.",
    descAr: 'أخبر سبارك بما ستفعله. اختر الفئة.',
    tagEn: 'PRIME THE BRAIN',
    tagAr: 'تهيئة الدماغ',
    color: 'var(--color-teal)',
  },
  {
    labelEn: 'STEP 02',
    labelAr: 'الخطوة ٠٢',
    nameEn: 'Warm-Up',
    nameAr: 'التسخين',
    time: '0:10 → 5:00',
    descEn: 'Five of seven science-backed games, ordered for your task type.',
    descAr: 'خمسٌ من سبع ألعاب مبنيّة على أسس علميّة، مرتَّبة وفق نوع مهمّتك.',
    tagEn: 'ACTIVATE PFC',
    tagAr: 'تنشيط القشرة الجبهيّة',
    color: 'var(--color-purple)',
  },
  {
    labelEn: 'STEP 03',
    labelAr: 'الخطوة ٠٣',
    nameEn: 'Check-In',
    nameAr: 'المراجعة',
    time: '5:00 → 5:10',
    descEn: "One question. If you're nervous, we add a short breathing pause before the score.",
    descAr: 'سؤالٌ واحد. إذا كنتَ متوتّرًا أُضيفت وقفة تنفّس قصيرة قبل النتيجة.',
    tagEn: 'READ YOUR STATE',
    tagAr: 'اقرأ حالتك',
    color: 'var(--color-amber)',
  },
  {
    labelEn: 'STEP 04',
    labelAr: 'الخطوة ٠٤',
    nameEn: 'Focus Score',
    nameAr: 'درجة التركيز',
    time: '5:10 → 5:30',
    descEn: 'Your brain score. Honest. Are you ready to start?',
    descAr: 'درجة دماغك. صادقة. هل أنت جاهز للبدء؟',
    tagEn: 'CLOSE THE LOOP',
    tagAr: 'أغلق الحلقة',
    color: 'var(--color-green)',
  },
];

function PhaseCard({
  labelEn,
  labelAr,
  nameEn,
  nameAr,
  time,
  descEn,
  descAr,
  tagEn,
  tagAr,
  color,
  index,
}: typeof phases[number] & { index: number }) {
  const language = useStore((s) => s.language);
  const ar = language === 'ar';
  const label = ar ? labelAr : labelEn;
  const name = ar ? nameAr : nameEn;
  const desc = ar ? descAr : descEn;
  const tag = ar ? tagAr : tagEn;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: 'easeOut' }}
      className="relative bg-cream-2 ring-ink p-5 rounded-[22px] flex flex-col gap-3 min-h-[230px] overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-ash">{label}</span>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      </div>
      <div className="font-display text-[32px] leading-none tracking-[-0.02em]">{name}</div>
      <div className="font-mono text-[11px] text-ash">{time}</div>
      <p className="text-[14px] text-ink/75 leading-snug mt-1">{desc}</p>
      <div className="mt-auto pt-3 border-t border-ink/10 text-[11px] uppercase tracking-[0.16em] text-ash">{tag}</div>
    </motion.div>
  );
}

const compare = {
  en: [
    { them: 'Focus timers', theyDo: 'Track time after focus begins.', weDo: 'Create the focus state before the timer starts.' },
    { them: 'Brain training', theyDo: 'Build skills over weeks.', weDo: 'Activate cognitive readiness right now.' },
    { them: 'Meditation apps', theyDo: 'Calm the brain.', weDo: 'Prime the brain — a different state.' },
    { them: 'Blocking apps', theyDo: 'Remove distractions by force.', weDo: 'Make focus feel natural and earned.' },
    { them: 'Study apps', theyDo: 'Organize content and tasks.', weDo: 'Prepare the brain to absorb them.' },
  ],
  ar: [
    { them: 'مؤقّتات التركيز', theyDo: 'تحتسب الوقت بعد بدء التركيز.', weDo: 'نصنع حالة التركيز قبل أن يبدأ المؤقّت.' },
    { them: 'تدريب الدماغ', theyDo: 'تبني المهارات على مدى أسابيع.', weDo: 'ننشّط الجاهزيّة الذهنيّة الآن.' },
    { them: 'تطبيقات التأمّل', theyDo: 'تهدّئ الدماغ.', weDo: 'نهيّئ الدماغ — حالةٌ مختلفة.' },
    { them: 'تطبيقات الحجب', theyDo: 'تُزيل التشتيت بالقوّة.', weDo: 'نجعل التركيز طبيعيًّا ومستحَقًّا.' },
    { them: 'تطبيقات الدراسة', theyDo: 'تنظّم المحتوى والمهامّ.', weDo: 'نهيّئ الدماغ لاستيعابها.' },
  ],
};

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="px-3 md:px-7 py-7 min-w-0">
      <div className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-ash mb-2 truncate">{label}</div>
      <div className="font-display text-[clamp(26px,7vw,64px)] leading-none tracking-[-0.03em]">{value}</div>
      <div className="text-[11px] md:text-[12px] text-ash mt-1">{sub}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-ink/20 pt-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-ash mb-2">{title}</div>
      <p className="text-pretty">{children}</p>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
