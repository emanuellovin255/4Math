import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { OP_SKILL_ID, SKILL_BY_ID } from '../../data/curriculum';
import { db, getKV } from '../../db/db';
import { type Op, type OpConfig, OP_SYMBOL, OpDeck, addSteps, divSteps, evalOp, mulSteps, parseOpKey, subSteps } from '../../engine/generators/operations';
import { createRng } from '../../engine/rng';
import { fmt } from '../../engine/format';
import { type OpSettings, useApp } from '../../store';
import { startRun } from '../lib/hooks';
import { navigate } from '../lib/router';
import { OP_NAMES, OP_ORDER, opBestKey } from '../lib/ops';
import { Button, Card, Chip, Icon, PageHeader, cx } from '../components/ui';
import { StepList } from '../components/StepList';

const HISTORY_WINDOW = 30 * 24 * 60 * 60 * 1000;
const BASE_NUMBERS = Array.from({ length: 19 }, (_, i) => i + 2);
const NUMBERS: Record<Op, number[]> = {
  add: [...BASE_NUMBERS, 25, 50, 99],
  sub: [...BASE_NUMBERS, 25, 50, 99],
  mul: BASE_NUMBERS,
  div: BASE_NUMBERS,
};
const LIMITS: Record<Op, number[]> = {
  add: [20, 50, 100, 1000, 10000],
  sub: [20, 50, 100, 1000, 10000],
  mul: [10, 12, 20, 50, 100, 1000],
  div: [10, 12, 20, 50, 100, 1000],
};
const COUNTS = [10, 20, 50, 0, -1];

const stepsFor = (op: Op, a: number, b: number) =>
  op === 'add' ? addSteps(a, b) : op === 'sub' ? subSteps(a, b) : op === 'mul' ? mulSteps(a, b) : divSteps(a, b);

/** Meniul rubricii: alegi operația. Apare și ca foaie peste ecran, din bara de jos. */
export function OpsPicker({ onPick }: { onPick(op: Op): void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OP_ORDER.map((op) => (
        <button
          key={op}
          onClick={() => onPick(op)}
          className="flex flex-col items-start rounded-3xl border border-border bg-surface p-4 text-left transition active:scale-[0.98] hover:border-accent/50"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-3xl font-bold text-accent">
            {OP_NAMES[op].symbol}
          </span>
          <span className="mt-2 text-lg font-bold">{OP_NAMES[op].title}</span>
          <span className="text-xs text-muted">{OP_NAMES[op].blurb}</span>
        </button>
      ))}
    </div>
  );
}

export function OpsMenu() {
  return (
    <div className="space-y-4">
      <PageHeader title="Operații" subtitle="Alege ce vrei să exersezi" />
      <OpsPicker onPick={(op) => navigate(`ops/${op}`)} />
      <p className="text-center text-sm text-muted">
        Vrei întâi teoria? Lecțiile sunt în{' '}
        <button className="font-medium text-accent" onClick={() => navigate('learn')}>
          Învață → Operații de bază
        </button>
      </p>
    </div>
  );
}

export function OpsScreen({ op }: { op: Op }) {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const conf: OpSettings = settings.ops[op];
  const names = OP_NAMES[op];
  const skillId = OP_SKILL_ID[op];
  const [customNum, setCustomNum] = useState('');
  const [customLimit, setCustomLimit] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const set = (patch: Partial<OpSettings>) => update({ ops: { ...settings.ops, [op]: { ...conf, ...patch } } });
  const cfg: OpConfig = { op, numbers: conf.numbers, upTo: conf.upTo };
  const any = conf.numbers.length === 0;

  const best = useLiveQuery(() => getKV<number>(opBestKey(cfg), 0), [opBestKey(cfg)]);
  const history = useLiveQuery(
    () => db.attempts.where('skillId').equals(skillId).filter((a) => a.ts > Date.now() - HISTORY_WINDOW).toArray(),
    [skillId],
  );

  const weak = useMemo(() => {
    const byKey = new Map<string, { key: string; pair: [number, number]; wrong: number; total: number; lastWrong: string }>();
    for (const a of history ?? []) {
      const parsed = a.key ? parseOpKey(a.key) : null;
      if (!parsed || parsed.op !== op) continue;
      const k = `${parsed.pair[0]}:${parsed.pair[1]}`;
      const e = byKey.get(k) ?? { key: k, pair: parsed.pair, wrong: 0, total: 0, lastWrong: '' };
      e.total++;
      if (!a.correct) {
        e.wrong++;
        e.lastWrong = a.userText;
      }
      byKey.set(k, e);
    }
    return [...byKey.values()].filter((e) => e.wrong > 0).sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total);
  }, [history, op]);

  const { examples, combos } = useMemo(() => {
    const deck = new OpDeck({ op, numbers: conf.numbers, upTo: conf.upTo }, createRng(conf.numbers.reduce((s, t) => s * 31 + t, conf.upTo)));
    return { examples: Array.from({ length: 4 }, () => deck.next()), combos: deck.size() };
  }, [op, conf.numbers, conf.upTo]);

  const toggle = (n: number) => {
    const next = conf.numbers.includes(n) ? conf.numbers.filter((x) => x !== n) : [...conf.numbers, n].sort((a, b) => a - b);
    set({ numbers: next.length ? next : [n] });
  };

  const addCustom = () => {
    const n = Number(customNum);
    if (Number.isInteger(n) && n >= 2 && n <= 9999 && !conf.numbers.includes(n)) set({ numbers: [...conf.numbers, n].sort((a, b) => a - b) });
    setCustomNum('');
  };

  const applyLimit = () => {
    const n = Number(customLimit);
    if (Number.isInteger(n) && n >= 3 && n <= 100000) set({ upTo: n });
    setCustomLimit('');
  };

  const start = () => {
    if (conf.count === -1) startRun({ mode: 'ops', op: cfg, durationMs: 60_000 });
    else startRun({ mode: 'ops', op: cfg, count: conf.count });
  };

  const practiceWeak = () => {
    const pairs = weak.slice(0, 15).map((w) => w.pair);
    if (pairs.length) startRun({ mode: 'ops', op: { ...cfg, pairs }, count: pairs.length * 2 });
  };

  const lesson = SKILL_BY_ID[skillId];
  const extraNums = conf.numbers.filter((n) => !NUMBERS[op].includes(n));

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={names.title}
        subtitle="Alegi numerele și până la cât"
        back={() => navigate('ops')}
        right={
          lesson?.lesson && (
            <button onClick={() => navigate(`lesson/${skillId}`)} className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium">
              <Icon name="book" className="h-4 w-4" /> Lecție
            </button>
          )
        }
      />

      <Card className="space-y-4">
        <section>
          <div className="mb-2 font-semibold">{names.with}</div>
          <div className="flex flex-wrap gap-2">
            <Chip active={any} onClick={() => set({ numbers: any ? [NUMBERS[op][5]] : [] })}>
              Oricare
            </Chip>
            {NUMBERS[op].map((n) => (
              <Chip key={n} active={conf.numbers.includes(n)} onClick={() => toggle(n)}>
                {n}
              </Chip>
            ))}
            {extraNums.map((n) => (
              <Chip key={n} active onClick={() => toggle(n)}>
                {fmt(n)} ✕
              </Chip>
            ))}
          </div>
          <NumberField value={customNum} onChange={setCustomNum} onApply={addCustom} placeholder="alt număr, ex. 37" action="Adaugă" />
        </section>

        <section>
          <div className="mb-2 font-semibold">{names.limit}</div>
          <div className="flex flex-wrap gap-2">
            {LIMITS[op].map((l) => (
              <Chip key={l} active={conf.upTo === l} onClick={() => set({ upTo: l })}>
                {fmt(l)}
              </Chip>
            ))}
            {!LIMITS[op].includes(conf.upTo) && <Chip active>{fmt(conf.upTo)}</Chip>}
          </div>
          <NumberField value={customLimit} onChange={setCustomLimit} onApply={applyLimit} placeholder="altă limită, ex. 30" action="Setează" />
        </section>

        <section>
          <div className="mb-2 font-semibold">Câte</div>
          <div className="flex flex-wrap gap-2">
            {COUNTS.map((c) => (
              <Chip key={c} active={conf.count === c} onClick={() => set({ count: c })}>
                {c === 0 ? '∞' : c === -1 ? `⚡ 60 s${best ? ` · record ${best}` : ''}` : c}
              </Chip>
            ))}
          </div>
        </section>

        <div className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
          <span className="text-muted">Exemple: </span>
          <span className="font-semibold">{examples.map(([a, b]) => `${fmt(a)} ${OP_SYMBOL[op]} ${fmt(b)}`).join(' · ')}</span>
          <div className="text-xs text-muted">
            {fmt(Math.round(combos))} combinații {combos <= 3000 ? '· trec toate înainte să se repete' : '· aleatoare, fără repetări apropiate'}
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
          <p className="py-3 text-sm text-muted">Încă nimic aici. După primele exerciții, greșelile apar aici ca să le poți repeta.</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {weak.slice(0, 15).map((w) => {
                const [a, b] = w.pair;
                const isOpen = openKey === w.key;
                return (
                  <li key={w.key} className="py-2">
                    <button className="flex w-full items-baseline justify-between gap-3 text-left" onClick={() => setOpenKey(isOpen ? null : w.key)}>
                      <span className="text-lg font-semibold">
                        {fmt(a)} {OP_SYMBOL[op]} {fmt(b)} = <span className="text-good">{fmt(evalOp(op, a, b))}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-muted">
                        <span className="font-semibold text-bad">
                          {w.wrong} {w.wrong === 1 ? 'greșeală' : 'greșeli'}
                        </span>{' '}
                        din {w.total}
                        {w.lastWrong && (
                          <div>
                            ultima: <span className="line-through">{w.lastWrong}</span>
                          </div>
                        )}
                      </span>
                    </button>
                    <div className={cx(!isOpen && 'hidden')}>
                      <StepList steps={stepsFor(op, a, b)} className="mt-2" />
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
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-base outline-none focus:border-accent"
      />
      <Button type="submit" variant="secondary" className="px-3 py-2 text-sm" disabled={!value}>
        {action}
      </Button>
    </form>
  );
}
