import type { PropsWithChildren } from 'react';
import { Menu, Smartphone, UserSquare2, Waves } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SurfaceCard } from '@freegull-flow/ui';
import { useUiStore } from './ui-store';

const links = [
  { to: '/', label: 'דאשבורד', icon: Waves },
  { to: '/lessons', label: 'שיעורים', icon: Smartphone },
  { to: '/users', label: 'צוות', icon: UserSquare2 },
];

export function AppShell({ children }: PropsWithChildren) {
  const { mobileNavOpen, setMobileNavOpen } = useUiStore();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ebfffb,_#f3f7f7_45%,_#d7e6e7)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <aside
          className={`fixed inset-y-0 right-0 z-30 w-72 border-l border-slate-200 bg-white/85 p-5 backdrop-blur-md transition-transform md:static md:translate-x-0 ${
            mobileNavOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="mb-8 flex items-center justify-between">
            <button
              type="button"
              className="rounded-2xl bg-slate-100 p-3 md:hidden"
              onClick={() => setMobileNavOpen(false)}
            >
              <Menu size={20} />
            </button>
            <div className="text-right">
              <div className="text-xs font-black uppercase tracking-[0.35em] text-teal-700">
                Capacitor Ready
              </div>
              <h1 className="text-2xl font-black text-slate-950">Freegull Flow</h1>
            </div>
          </div>
          <nav className="space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-3xl px-4 py-4 text-sm font-black transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-lg'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:p-8">
          <header className="mb-6 flex items-center justify-between">
            <button
              type="button"
              className="rounded-2xl bg-white p-3 shadow-sm md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={20} />
            </button>
            <SurfaceCard className="w-full max-w-xl text-right">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-teal-700">
                Shared Web + Mobile Shell
              </div>
              <div className="mt-1 text-sm text-slate-500">
                אותו קוד עבור web, iOS ו-Android דרך Capacitor.
              </div>
            </SurfaceCard>
          </header>
          {children}
        </main>
      </div>
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-950/30 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        />
      ) : null}
    </div>
  );
}
