import { useState } from 'react';
import { prettyInput } from '../../engine/format';
import type { MistakeEntry } from '../../store';
import { StepList } from './StepList';
import { cx } from './ui';

/** Lista greșelilor: ce ai scris, ce era corect, iar la atingere rezolvarea pas cu pas. */
export function MistakeList({ items }: { items: MistakeEntry[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="divide-y divide-border">
      {items.map((m) => {
        const isOpen = open === m.key;
        return (
          <li key={m.key} className="py-2">
            <button className="flex w-full items-baseline justify-between gap-3 text-left" onClick={() => setOpen(isOpen ? null : m.key)}>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">
                  {m.prompt}
                  {m.times > 1 && <span className="ml-2 text-xs font-medium text-bad">×{m.times}</span>}
                </div>
                {m.question && <div className="truncate text-xs text-muted">{m.question}</div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-bold text-good">{m.answerText}</div>
                <div className="text-sm text-bad line-through">{m.userText ? prettyInput(m.userText) : 'nu știu'}</div>
              </div>
            </button>
            <div className={cx(!isOpen && 'hidden')}>
              <StepList steps={m.steps} className="mt-2" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
