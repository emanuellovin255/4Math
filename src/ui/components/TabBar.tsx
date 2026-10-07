import { useEffect, useState } from 'react';
import { navigate } from '../lib/router';
import { OpsPicker } from '../screens/Ops';
import { Icon, cx } from './ui';

const TABS = [
  { path: '', label: 'Azi', icon: 'home' },
  { path: 'ops', label: 'Operații', icon: 'ops' },
  { path: 'learn', label: 'Învață', icon: 'learn' },
  { path: 'stats', label: 'Statistici', icon: 'stats' },
  { path: 'settings', label: 'Setări', icon: 'settings' },
];

export function TabBar({ current }: { current: string }) {
  const [sheet, setSheet] = useState(false);
  const active = current === 'skill' || current === 'lesson' ? 'learn' : current;

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  return (
    <>
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Alege operația">
          <button aria-label="Închide" className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setSheet(false)} />
          <div className="pop relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl border border-border bg-bg p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-bold">Ce exersezi?</div>
              <button aria-label="Închide" onClick={() => setSheet(false)} className="-mr-1 rounded-full p-1.5 text-muted hover:bg-surface-2">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <OpsPicker
              onPick={(op) => {
                setSheet(false);
                navigate(`ops/${op}`);
              }}
            />
          </div>
        </div>
      )}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.path}
              onClick={() => {
                if (t.path === 'ops') setSheet((s) => !s);
                else {
                  setSheet(false);
                  navigate(t.path);
                }
              }}
              className={cx(
                'flex flex-col items-center gap-0.5 py-2 text-xs font-medium',
                (t.path === 'ops' ? sheet || active === 'ops' : active === t.path && !sheet) ? 'text-accent' : 'text-muted',
              )}
            >
              <Icon name={t.icon} className="h-6 w-6" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
