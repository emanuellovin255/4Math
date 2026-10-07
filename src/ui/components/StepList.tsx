import type { Step } from '../../engine/types';
import { fmt } from '../../engine/format';
import { cx } from './ui';

export const stepValueText = (s: Step) => s.display ?? (s.value !== undefined ? fmt(s.value) : '');

export function StepList({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cx('space-y-2', className)}>
      {steps.map((s, i) => (
        <li key={i} className="rounded-xl bg-surface-2 px-3 py-2">
          <div className="text-lg font-semibold">
            {s.expr}
            {s.value !== undefined && (
              <>
                {' '}
                <span className="text-muted">=</span> <span className="text-accent">{stepValueText(s)}</span>
              </>
            )}
          </div>
          {s.note && <div className="text-sm text-muted">{s.note}</div>}
        </li>
      ))}
    </ol>
  );
}
