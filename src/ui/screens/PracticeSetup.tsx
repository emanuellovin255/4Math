import { useState } from 'react';
import { MODULES, SKILLS } from '../../data/curriculum';
import { startRun } from '../lib/hooks';
import { navigate } from '../lib/router';
import { Button, Chip, PageHeader } from '../components/ui';

const COUNTS = [10, 20, 40, 0];

export function PracticeSetup() {
  const [selected, setSelected] = useState<string[]>(['facts.mul-2-10']);
  const [mode, setMode] = useState<'practice' | 'sprint'>('practice');
  const [count, setCount] = useState(20);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const start = () => {
    if (!selected.length) return;
    if (mode === 'sprint') startRun({ mode: 'sprint', skillIds: selected, durationMs: 60_000 });
    else startRun({ mode: 'practice', skillIds: selected, count });
  };

  return (
    <div className="space-y-5 pb-28">
      <PageHeader title="Practică liberă" subtitle="Combină orice abilități" back={() => navigate('')} />

      {MODULES.filter((m) => m.available && m.id !== 'basics').map((m) => (
        <section key={m.id}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">
              {m.letter}. {m.title}
            </h2>
            <button
              className="text-xs font-medium text-accent"
              onClick={() => {
                const ids = SKILLS.filter((s) => s.module === m.id).map((s) => s.id);
                const all = ids.every((id) => selected.includes(id));
                setSelected((s) => (all ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]));
              }}
            >
              toate
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SKILLS.filter((s) => s.module === m.id).map((s) => (
              <Chip key={s.id} active={selected.includes(s.id)} onClick={() => toggle(s.id)}>
                {s.title}
              </Chip>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 font-semibold">Mod</h2>
        <div className="flex gap-2">
          <Chip active={mode === 'practice'} onClick={() => setMode('practice')}>
            Normal
          </Chip>
          <Chip active={mode === 'sprint'} onClick={() => setMode('sprint')}>
            Sprint 60 s
          </Chip>
        </div>
      </section>

      {mode === 'practice' && (
        <section>
          <h2 className="mb-2 font-semibold">Câte probleme</h2>
          <div className="flex gap-2">
            {COUNTS.map((c) => (
              <Chip key={c} active={count === c} onClick={() => setCount(c)}>
                {c === 0 ? '∞' : c}
              </Chip>
            ))}
          </div>
        </section>
      )}

      <div className="safe-bottom fixed inset-x-0 bottom-16 z-10 mx-auto max-w-md px-4">
        <Button className="w-full py-4 text-lg shadow-lg" disabled={!selected.length} onClick={start}>
          Start{selected.length > 1 ? ` · ${selected.length} abilități` : ''}
        </Button>
      </div>
    </div>
  );
}
