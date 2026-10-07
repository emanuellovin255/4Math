import { navigate } from '../lib/router';
import { Icon, cx } from './ui';

const TABS = [
  { path: '', label: 'Azi', icon: 'home' },
  { path: 'learn', label: 'Învață', icon: 'learn' },
  { path: 'stats', label: 'Statistici', icon: 'stats' },
  { path: 'settings', label: 'Setări', icon: 'settings' },
];

export function TabBar({ current }: { current: string }) {
  const active = current === 'skill' || current === 'lesson' ? 'learn' : current;
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={cx(
              'flex flex-col items-center gap-0.5 py-2 text-xs font-medium',
              active === t.path ? 'text-accent' : 'text-muted',
            )}
          >
            <Icon name={t.icon} className="h-6 w-6" />
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
