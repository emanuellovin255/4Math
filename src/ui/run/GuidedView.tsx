import { useRef, useState } from 'react';
import type { Problem } from '../../engine/types';
import { matchesValue } from '../../engine/checker';
import { prettyInput } from '../../engine/format';
import type { Settings } from '../../store';
import { Keypad } from '../components/Keypad';
import { stepValueText } from '../components/StepList';
import { Button, cx } from '../components/ui';
import { feedbackCorrect, feedbackKey, feedbackWrong } from '../lib/feedback';
import type { AnswerEvent } from './ProblemView';

type StepStatus = 'ok' | 'wrong';

/** Modul ghidat: aplicația îți cere rezultatele intermediare, pas cu pas. */
export function GuidedView({
  problem,
  settings,
  onAnswer,
  onNext,
}: {
  problem: Problem;
  settings: Settings;
  onAnswer(e: AnswerEvent): void;
  onNext(): void;
}) {
  const steps = problem.steps;
  const firstAsk = (from: number) => {
    let i = from;
    while (i < steps.length && steps[i].value === undefined) i++;
    return i;
  };
  const [current, setCurrent] = useState(() => firstAsk(0));
  const [status, setStatus] = useState<Record<number, StepStatus>>({});
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const started = useRef(performance.now());
  const finished = current >= steps.length;

  const advance = (from: number, nextStatus: Record<number, StepStatus>) => {
    const next = firstAsk(from + 1);
    setCurrent(next);
    setInput('');
    setWaiting(false);
    if (next >= steps.length) {
      const allOk = Object.values(nextStatus).every((s) => s === 'ok');
      onAnswer({ correct: allOk, userText: '', rtMs: Math.round(performance.now() - started.current) });
    }
  };

  const step = steps[current];
  const mode = step && step.value !== undefined && !Number.isInteger(step.value) ? 'decimal' : 'int';

  const change = (next: string) => {
    if (waiting || !step) return;
    setInput(next);
    if (matchesValue(next, step.value!)) {
      feedbackCorrect(settings);
      const st = { ...status, [current]: 'ok' as const };
      setStatus(st);
      setInputs({ ...inputs, [current]: next });
      setTimeout(() => advance(current, st), 220);
      setWaiting(true);
    }
  };

  const submit = () => {
    if (!step) return;
    if (waiting && status[current] === 'wrong') return advance(current, status);
    if (waiting || !input) return;
    feedbackWrong(settings);
    setStatus({ ...status, [current]: 'wrong' });
    setInputs({ ...inputs, [current]: input });
    setWaiting(true);
  };

  const allOk = Object.values(status).every((s) => s === 'ok');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-1 pt-2 text-center">
        <div className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted inline-block">Ghidat</div>
        <div className="mt-2 text-4xl font-bold tracking-tight">{problem.prompt}</div>
      </div>

      <ol className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {steps.map((s, i) => {
          if (i > current) return null;
          const st = status[i];
          const isAsk = s.value !== undefined;
          const active = i === current && !finished;
          return (
            <li
              key={i}
              className={cx(
                'pop rounded-xl px-3 py-2',
                active ? 'border-2 border-accent bg-surface' : 'bg-surface-2',
              )}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 text-xl font-semibold">
                <span>{s.expr}</span>
                {isAsk && (
                  <>
                    <span className="text-muted">=</span>
                    {st === 'ok' && <span className="text-good">{stepValueText(s)}</span>}
                    {st === 'wrong' && (
                      <>
                        <span className="text-bad line-through">{prettyInput(inputs[i] ?? '')}</span>
                        <span className="text-good">{stepValueText(s)}</span>
                      </>
                    )}
                    {!st && active && <span className="min-w-12 border-b-2 border-accent text-accent">{prettyInput(input) || '?'}</span>}
                  </>
                )}
              </div>
              {s.note && <div className="text-sm text-muted">{s.note}</div>}
            </li>
          );
        })}
      </ol>

      {finished ? (
        <div className="slide-up pb-2 pt-3">
          <div className={cx('mb-3 text-center text-lg font-semibold', allOk ? 'text-good' : 'text-warn')}>
            {allOk ? 'Perfect, toți pașii corecți!' : 'Gata. Uită-te încă o dată la pașii marcați.'}
          </div>
          <Button className="w-full" onClick={onNext}>
            Următoarea
          </Button>
        </div>
      ) : waiting && status[current] === 'wrong' ? (
        <Button className="mt-3 mb-2 w-full" onClick={() => advance(current, status)}>
          Continuă
        </Button>
      ) : (
        <div className="pt-3">
          <Keypad
            mode={mode}
            value={input}
            onChange={change}
            onSubmit={submit}
            layout={settings.keypad}
            disabled={waiting}
            onKey={() => feedbackKey(settings)}
          />
        </div>
      )}
    </div>
  );
}
