import { Link, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';

export default function Layout() {
  const loc = useLocation();
  const isWelcome = loc.pathname === '/';
  const t = useStore((s) => s.t);
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 md:px-12 pt-5 md:pt-8">
        <div className="max-w-[1320px] mx-auto flex items-center justify-between gap-2 md:gap-4">
          <Link to="/" className="flex items-center gap-2 group shrink-0 min-w-0">
            <Bolt />
            <span className="font-display text-[22px] md:text-[26px] leading-none tracking-[-0.03em] font-medium">
              {language === 'ar' ? 'سبارك' : 'spark'}
            </span>
            <span className="mx-1 text-[10px] uppercase tracking-[0.18em] text-ash align-top mt-1 hidden sm:inline">
              v3 · 2026
            </span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="text-[12px] uppercase tracking-[0.18em] text-ash hover:text-ink transition-colors min-h-[44px] px-2"
              aria-label="Toggle language"
            >
              {language === 'ar' ? 'EN' : 'ع'}
            </button>
            {!isWelcome && (
              <Link to="/declare" className="btn-ink text-[12px] md:text-[13px] uppercase tracking-[0.14em] !py-3 !px-4 md:!px-5 min-h-[44px] inline-flex items-center">
                {t.nav.ignite}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="px-5 md:px-12 py-8 md:py-10 text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-ash">
        <div className="max-w-[1320px] mx-auto flex flex-wrap items-center justify-between gap-3 md:gap-4 border-t border-ink/15 pt-6">
          <span>{t.footer.rights}</span>
          <span>{t.footer.tagline}</span>
        </div>
      </footer>
    </div>
  );
}

function Bolt() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-ink">
      <path d="M14 2 4 14h7l-2 8 11-13h-8z" />
    </svg>
  );
}
