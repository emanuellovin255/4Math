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
        <div className="fixed inset-0 z-30" role="dialog" aria-label="Alege operația">
          <button aria-label="Închide" className="absolute inset-0 bg-black/40" onClick={() => setSheet(false)} />
          <div className="safe-bottom slide-up absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl border-t border-border bg-bg px-4 pt-3 pb-20">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
            <div className="mb-3 text-lg font-bold">Ce exersezi?</div>
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
