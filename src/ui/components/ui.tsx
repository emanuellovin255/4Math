import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-accent text-accent-fg hover:opacity-90',
    secondary: 'bg-surface-2 text-fg hover:bg-border',
    ghost: 'bg-transparent text-fg hover:bg-surface-2',
    danger: 'bg-bad-soft text-bad hover:opacity-90',
  };
  return (
    <button
      {...props}
      className={cx(
        'rounded-2xl px-4 py-3 font-semibold transition select-none disabled:opacity-40 active:scale-[0.98]',
        styles[variant],
        className,
      )}
    />
  );
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'block w-full rounded-3xl border border-border bg-surface p-4 text-left',
        onClick && 'transition active:scale-[0.99] hover:border-accent/50',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function ProgressBar({ value, className, color = 'bg-accent' }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div className={cx('h-full rounded-full transition-[width] duration-300', color)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-full border px-3 py-1.5 text-sm font-medium transition select-none',
        active ? 'border-accent bg-accent-soft text-fg' : 'border-border bg-surface text-muted',
      )}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: () => void; right?: ReactNode }) {
  return (
    <header className="safe-top flex items-center gap-3 pb-4">
      {back && (
        <button onClick={back} aria-label="Înapoi" className="-ml-2 rounded-full p-2 text-muted hover:bg-surface-2">
          <Icon name="back" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  learn: 'M12 4 2 9l10 5 10-5-10-5zm-6 7.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5',
  stats: 'M4 20V10m6 10V4m6 16v-7m6 7H2',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  flame: 'M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-6 6-6 10-1-1-2-2-2-4-1 2-1 3-1 5 0 5 3 8 7 8z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  play: 'M7 4v16l13-8z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  x: 'M18 6 6 18M6 6l12 12',
  backspace: 'M21 5H9l-6 7 6 7h12zM18 9l-6 6m0-6 6 6',
  check: 'M5 12l5 5L20 7',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  steps: 'M4 20h4v-4h4v-4h4V8h4',
};

export function Icon({ name, className = 'h-6 w-6' }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
