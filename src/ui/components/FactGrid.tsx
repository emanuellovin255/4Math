import type { FactState } from '../../engine/srs';
import { parseMulKey } from '../../engine/generators/facts/mulTable';
import { secs } from '../lib/stats';
import { cx } from './ui';

export function factLabel(key: string): string {
  const [kind, rest] = key.split(':');
  if (kind === 'mul') {
    const [a, b] = parseMulKey(key);
    return `${a}×${b}`;
  }
  if (kind === 'sq') return `${rest}²`;
  if (kind === 'cu') return `${rest}³`;
  if (kind === 'fp') return key.slice(3);
  return key;
}

export const boxColor = (s: FactState | undefined) => (s ? `var(--lvl-${Math.min(5, s.box)})` : 'var(--lvl-none)');

export function factTitle(key: string, s: FactState | undefined): string {
  if (!s) return `${factLabel(key)} · neînceput`;
  return `${factLabel(key)} · nivel ${s.box}/5 · ${secs(s.ewmaMs)} · ${s.correct}/${s.seen} corecte`;
}

/** Heatmap pentru tabla înmulțirii 2–20: fiecare celulă e un fapt, colorată după cutia Leitner. */
export function MulHeatmap({ facts, onPick }: { facts: Map<string, FactState>; onPick?(key: string): void }) {
  const nums = Array.from({ length: 19 }, (_, i) => i + 2);
  return (
    <div className="overflow-x-auto">
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(20, minmax(0, 1fr))`, minWidth: 320 }}>
        <div />
        {nums.map((n) => (
          <div key={`h${n}`} className="text-center text-[9px] text-muted">
            {n}
          </div>
        ))}
        {nums.map((a) => (
          <Row key={a} a={a} nums={nums} facts={facts} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

function Row({ a, nums, facts, onPick }: { a: number; nums: number[]; facts: Map<string, FactState>; onPick?(key: string): void }) {
  return (
    <>
      <div className="flex items-center justify-end pr-0.5 text-[9px] text-muted">{a}</div>
      {nums.map((b) => {
        const key = `mul:${Math.min(a, b)}:${Math.max(a, b)}`;
        const s = facts.get(key);
        return (
          <button
            key={b}
            title={factTitle(key, s)}
            onClick={() => onPick?.(key)}
            className="aspect-square rounded-[3px]"
            style={{ background: boxColor(s) }}
          />
        );
      })}
    </>
  );
}

/** Listă de fapte ca „pastile” colorate (pătrate, cuburi, fracții). */
export function FactChips({ keys, facts, onPick, className }: { keys: string[]; facts: Map<string, FactState>; onPick?(key: string): void; className?: string }) {
  return (
    <div className={cx('flex flex-wrap gap-1', className)}>
      {keys.map((k) => {
        const s = facts.get(k);
        const strong = s && s.box >= 2;
        return (
          <button
            key={k}
            title={factTitle(k, s)}
            onClick={() => onPick?.(k)}
            className={cx('min-w-10 rounded-lg px-1.5 py-1 text-xs font-semibold', strong ? 'text-white' : 'text-fg')}
            style={{ background: boxColor(s) }}
          >
            {factLabel(k)}
          </button>
        );
      })}
    </div>
  );
}

export function LevelLegend() {
  const items = [
    ['var(--lvl-none)', 'nou'],
    ['var(--lvl-0)', 'greșit'],
    ['var(--lvl-1)', 'lent'],
    ['var(--lvl-2)', 'știut'],
    ['var(--lvl-3)', 'automat'],
    ['var(--lvl-5)', 'solid'],
  ];
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}
