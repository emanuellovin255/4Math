import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { CUSTOM_MUL_ID } from '../../data/curriculum';
import { db, getKV } from '../../db/db';
import { MulDeck, multiplySteps, parseCmulKey } from '../../engine/generators/multiply';
import { createRng } from '../../engine/rng';
import { TIMES, fmt } from '../../engine/format';
import { useApp } from '../../store';
import { startRun } from '../lib/hooks';
import { Button, Card, Chip, PageHeader, cx } from '../components/ui';
import { StepList } from '../components/StepList';

const TABLES = Array.from({ length: 19 }, (_, i) => i + 2);
const LIMITS = [10, 12, 20, 50, 100, 1000];
const COUNTS = [10, 20, 50, 0];
const HISTORY_WINDOW = 30 * 24 * 60 * 60 * 1000;

export function Multiply() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const tables = settings.mulTables.length ? settings.mulTables : [7];
  const upTo = settings.mulUpTo;
  const [timed, setTimed] = useState(false);
  const [customTable, setCustomTable] = useState('');
  const [customLimit, setCustomLimit] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const bestKey = `best:mul:${[...tables].sort((a, b) => a - b).join('+')}:${upTo}`;
  const best = useLiveQuery(() => getKV<number>(bestKey, 0), [bestKey]);

  // cele mai dese greșeli din ultimele 30 de zile
  const history = useLiveQuery(
    () => db.attempts.where('skillId').equals(CUSTOM_MUL_ID).filter((a) => a.ts > Date.now() - HISTORY_WINDOW).toArray(),
    [],
  );
  const weak = useMemo(() => {
    const byKey = new Map<string, { key: string; wrong: number; total: number; lastWrong: string }>();
    for (const a of history ?? []) {
      if (!a.key) continue;
      const e = byKey.get(a.key) ?? { key: a.key, wrong: 0, total: 0, lastWrong: '' };
      e.total++;
      if (!a.correct) {
        e.wrong++;
        e.lastWrong = a.userText;
      }
      byKey.set(a.key, e);
    }
    return [...byKey.values()].filter((e) => e.wrong > 0).sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total);
  }, [history]);

  const examples = useMemo(() => {
    const deck = new MulDeck({ tables, upTo }, createRng(tables.reduce((s, t) => s * 31 + t, upTo)));
    return Array.from({ length: 4 }, () => deck.next());
  }, [tables, upTo]);

  const combos = tables.length * Math.max(1, upTo - 1);

  const toggleTable = (t: number) => {
    const next = tables.includes(t) ? tables.filter((x) => x !== t) : [...tables, t].sort((a, b) => a - b);
    update({ mulTables: next.length ? next : [t] });
  };

  const addCustomTable = () => {
    const n = Number(customTable);
    if (Number.isInteger(n) && n >= 2 && n <= 999 && !tables.includes(n)) update({ mulTables: [...tables, n].sort((a, b) => a - b) });
    setCustomTable('');
  };

  const applyCustomLimit = () => {
    const n = Number(customLimit);
    if (Number.isInteger(n) && n >= 3 && n <= 10000) update({ mulUpTo: n });
    setCustomLimit('');
  };

  const start = () => {
    if (timed) startRun({ mode: 'multiply', mul: { tables, upTo }, durationMs: 60_000 });
    else startRun({ mode: 'multiply', mul: { tables, upTo }, count: settings.mulCount });
  };

  const practiceWeak = () => {
    const pairs = weak.slice(0, 15).map((w) => parseCmulKey(w.key)).filter((p): p is [number, number] => p !== null);
    if (!pairs.length) return;
    startRun({ mode: 'multiply', mul: { tables, upTo, pairs }, count: pairs.length * 2 });
  };

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="Înmulțiri" subtitle="Alegi tabla și până la cât" />

      <Card className="space-y-4">
        <section>
          <div className="mb-2 font-semibold">Înmulțiri cu</div>
          <div className="flex flex-wrap gap-2">
            {TABLES.map((t) => (
              <Chip key={t} active={tables.includes(t)} onClick={() => toggleTable(t)}>
                {t}
              </Chip>
            ))}
            {tables
              .filter((t) => t > 20)
              .map((t) => (
                <Chip key={t} active onClick={() => toggleTable(t)}>
                  {t} ✕
                </Chip>
              ))}
          </div>
          <NumberField value={customTable} onChange={setCustomTable} onApply={addCustomTable} placeholder="alt număr, ex. 25" action="Adaugă" />
        </section>

        <section>
          <div className="mb-2 font-semibold">Până la</div>
          <div className="flex flex-wrap gap-2">
            {LIMITS.map((l) => (
              <Chip key={l} active={upTo === l} onClick={() => update({ mulUpTo: l })}>
                {fmt(l)}
              </Chip>
            ))}
            {!LIMITS.includes(upTo) && <Chip active>{fmt(upTo)}</Chip>}
          </div>
          <NumberField value={customLimit} onChange={setCustomLimit} onApply={applyCustomLimit} placeholder="altă limită, ex. 30" action="Setează" />
        </section>

        <section>
          <div className="mb-2 font-semibold">Câte</div>
          <div className="flex flex-wrap gap-2">
            {COUNTS.map((c) => (
              <Chip
                key={c}
                active={!timed && settings.mulCount === c}
                onClick={() => {
                  setTimed(false);
                  update({ mulCount: c });
                }}
              >
                {c === 0 ? '∞' : c}
              </Chip>
            ))}
            <Chip active={timed} onClick={() => setTimed(true)}>
              ⚡ 60 s{best ? ` · record ${best}` : ''}
            </Chip>
          </div>
        </section>

        <div className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
          <span className="text-muted">Exemple: </span>
          <span className="font-semibold">{examples.map(([a, b]) => `${a} ${TIMES} ${fmt(b)}`).join(' · ')}</span>
          <div className="text-xs text-muted">
            {fmt(combos)} combinații {combos <= 3000 ? '· trec toate înainte să se repete' : '· aleatoare, fără repetări apropiate'}
          </div>
        </div>

        <Button className="w-full py-4 text-lg" onClick={start}>
          Start
        </Button>
      </Card>

      <Card>
        <div className="mb-1 flex items-baseline justify-between">
          <div className="font-semibold">Greșelile tale frecvente</div>
          <div className="text-xs text-muted">ultimele 30 de zile</div>
        </div>
        {weak.length === 0 ? (
          <p className="py-3 text-sm text-muted">Încă nimic aici. Greșelile apar după primele exerciții, ca să le poți repeta.</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {weak.slice(0, 15).map((w) => {
                const pair = parseCmulKey(w.key);
                if (!pair) return null;
                const [a, b] = pair;
                const isOpen = openKey === w.key;
                return (
                  <li key={w.key} className="py-2">
                    <button className="flex w-full items-baseline justify-between gap-3 text-left" onClick={() => setOpenKey(isOpen ? null : w.key)}>
                      <span className="text-lg font-semibold">
                        {a} {TIMES} {fmt(b)} = <span className="text-good">{fmt(a * b)}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-muted">
                        <span className="font-semibold text-bad">
                          {w.wrong} {w.wrong === 1 ? 'greșeală' : 'greșeli'}
                        </span>{' '}
                        din {w.total}
                        {w.lastWrong && <div>ultima: <span className="line-through">{w.lastWrong}</span></div>}
                      </span>
                    </button>
                    <div className={cx(!isOpen && 'hidden')}>
                      <StepList steps={multiplySteps(a, b)} className="mt-2" />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Button variant="secondary" className="mt-3 w-full" onClick={practiceWeak}>
              Exersează-le ({Math.min(15, weak.length)})
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

function NumberField({
  value,
  onChange,
  onApply,
  placeholder,
  action,
}: {
  value: string;
  onChange(v: string): void;
  onApply(): void;
  placeholder: string;
  action: string;
}) {
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
    >
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-base outline-none focus:border-accent"
      />
      <Button type="submit" variant="secondary" className="px-3 py-2 text-sm" disabled={!value}>
        {action}
      </Button>
    </form>
  );
}
