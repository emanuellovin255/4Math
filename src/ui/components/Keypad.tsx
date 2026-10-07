import { type ReactNode, useEffect } from 'react';
import type { InputMode } from '../../engine/types';
import { Icon, cx } from './ui';

export interface KeypadProps {
  mode: InputMode;
  value: string;
  onChange(next: string): void;
  onSubmit(): void;
  onSkip?(): void;
  layout: 'phone' | 'calculator';
  disabled?: boolean;
  onKey?(): void;
}

const MAX_LEN = 12;

/** Aplică o tastă asupra textului curent, respectând modul de input. */
export function applyKey(value: string, key: string, mode: InputMode): string {
  if (key === 'back') return value.slice(0, -1);
  if (value.length >= MAX_LEN) return value;
  if (key === ',') {
    if (mode !== 'decimal' || value.includes(',')) return value;
    return value === '' ? '0,' : value + ',';
  }
  if (key === '/') {
    if (mode !== 'fraction' || value.includes('/') || value === '') return value;
    return value + '/';
  }
  if (/^\d$/.test(key)) {
    // fără zerouri inutile în față: "07" → "7"
    if (value === '0') return key;
    if (value.endsWith('/0')) return value.slice(0, -1) + key;
    return value + key;
  }
  return value;
}

export function Keypad({ mode, value, onChange, onSubmit, onSkip, layout, disabled, onKey }: KeypadProps) {
  const press = (key: string) => {
    if (disabled) return;
    onKey?.();
    onChange(applyKey(value, key, mode));
  };

  // tastatura fizică (desktop / tastatură Bluetooth)
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === ',' || e.key === '.') press(',');
      else if (e.key === '/') press('/');
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') onSubmit();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  });

  const rows = layout === 'phone' ? [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']] : [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3']];
  const special = mode === 'decimal' ? ',' : mode === 'fraction' ? '/' : null;
  const keyCls =
    'flex h-14 items-center justify-center rounded-2xl text-2xl font-semibold select-none transition active:scale-95 active:bg-border';

  const Key = ({ k, className, children, label }: { k: string; className?: string; children?: ReactNode; label?: string }) => (
    <button
      type="button"
      aria-label={label ?? k}
      onPointerDown={(e) => {
        e.preventDefault();
        press(k);
      }}
      className={cx(keyCls, 'bg-surface-2 text-fg', className)}
    >
      {children ?? k}
    </button>
  );

  return (
    <div className={cx('grid grid-cols-4 gap-2', disabled && 'pointer-events-none opacity-60')}>
      {rows[0].map((k) => (
        <Key key={k} k={k} />
      ))}
      <Key k="back" label="Șterge">
        <Icon name="backspace" />
      </Key>
      {rows[1].map((k) => (
        <Key key={k} k={k} />
      ))}
      <button
        type="button"
        aria-label="Verifică"
        onPointerDown={(e) => {
          e.preventDefault();
          if (!disabled) onSubmit();
        }}
        className={cx(keyCls, 'row-span-3 h-auto bg-accent text-accent-fg')}
      >
        <Icon name="check" className="h-8 w-8" />
      </button>
      {rows[2].map((k) => (
        <Key key={k} k={k} />
      ))}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          if (!disabled) onSkip?.();
        }}
        className={cx(keyCls, 'bg-transparent text-sm font-medium text-muted', !onSkip && 'invisible')}
      >
        Nu știu
      </button>
      <Key k="0" />
      {special ? <Key k={special} label={special === ',' ? 'virgulă' : 'fracție'} /> : <div />}
    </div>
  );
}
