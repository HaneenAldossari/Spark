import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import type { TaskCategory } from '../lib/types';

export default function TaskDeclare() {
  const nav = useNavigate();
  const t = useStore((s) => s.t);
  const startSession = useStore((s) => s.startSession);
  const [task, setTask] = useState('');
  const [cat, setCat] = useState<TaskCategory>('studying');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cats: { id: TaskCategory; label: string }[] = [
    { id: 'studying', label: t.declare.studying },
    { id: 'coding', label: t.declare.coding },
    { id: 'writing', label: t.declare.writing },
    { id: 'design', label: t.declare.design },
    { id: 'math', label: t.declare.math },
    { id: 'reading', label: t.declare.reading },
    { id: 'presenting', label: t.declare.presenting },
    { id: 'other', label: t.declare.other },
  ];

  async function start() {
    const text = task.trim() || (t.declare.placeholder);
    setBusy(true); setErr(null);
    try {
      await startSession(text, cat);
      nav('/session');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 md:px-12 py-10 md:py-12">
      <div className="max-w-[920px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-ash mb-4">{t.declare.eyebrow}</div>
          <h1 className="font-display font-medium text-[clamp(34px,9vw,96px)] leading-[0.92] tracking-[-0.035em] text-balance">
            {t.declare.head1}<span className="font-serif-i text-ash">{t.declare.head2}</span>{t.declare.head3}
          </h1>
          <p className="font-serif-i text-[18px] md:text-[24px] text-ink/70 mt-6 max-w-[60ch]">{t.declare.sub}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="mt-10 md:mt-12">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-ash mb-3">{t.declare.label}</label>
          <div className="relative">
            <input
              autoFocus
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={t.declare.placeholder}
              disabled={busy}
              className="w-full bg-transparent border-0 border-b-2 border-ink pb-4 pe-14 font-display text-[clamp(22px,6vw,44px)] tracking-[-0.02em] placeholder:text-ash/60 focus:outline-none disabled:opacity-50"
              onKeyDown={(e) => e.key === 'Enter' && start()}
            />
            <div className="absolute end-0 bottom-5 font-mono text-[11px] text-ash">
              {task.length.toString().padStart(3, '0')} / 120
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }} className="mt-10">
          <div className="text-[11px] uppercase tracking-[0.18em] text-ash mb-3">{t.declare.catLabel}</div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const active = cat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`px-5 py-2.5 min-h-[44px] rounded-full text-[14px] transition-all ${
                    active ? 'bg-ink text-cream' : 'bg-transparent text-ink ring-ink hover:bg-ink hover:text-cream'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {err && <div className="mt-6 text-[14px] text-[#d23a2a]">{err}</div>}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }} className="mt-12 md:mt-16 flex items-stretch md:items-center justify-end gap-4 md:gap-6 flex-wrap">
          <button onClick={start} disabled={busy} className="btn-ink !py-5 !px-9 text-[15px] w-full md:w-auto inline-flex items-center justify-center gap-3 disabled:opacity-50 min-h-[52px]">
            {busy ? t.declare.starting : t.declare.ignite}
            {!busy && <span className="font-mono text-[12px] opacity-70">↵</span>}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
