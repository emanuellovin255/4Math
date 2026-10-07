import { useEffect, useRef, useState } from 'react';
import type { Problem } from '../../engine/types';
import { isCorrectInput } from '../../engine/checker';
import { prettyInput } from '../../engine/format';
import type { Settings } from '../../store';
import { Keypad } from '../components/Keypad';
import { StepList } from '../components/StepList';
import { Button, cx } from '../components/ui';
import { feedbackCorrect, feedbackKey, feedbackWrong } from '../lib/feedback';

export interface AnswerEvent {
  correct: boolean;
  userText: string;
  rtMs: number;
}

interface Props {
  problem: Problem;
  settings: Settings;
  /** Sprint: la greșeală arătăm răspunsul scurt și trecem mai departe, fără explicații. */
  quick?: boolean;
  onAnswer(e: AnswerEvent): void;
  onNext(): void;
}

const TEMPLATE_LABEL: Record<string, string> = {
  variant: 'Altă formă',
  choice: 'Grilă',
  truefalse: 'Adevărat / fals',
  compare: 'Comparație',
};

export function ProblemView({ problem, settings, quick, onAnswer, onNext }: Props) {
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'answering' | 'correct' | 'wrong'>('answering');
  const [picked, setPicked] = useState<number | null>(null);
  const [shake, setShake] = useState(0);
  const [slow, setSlow] = useState(false);
  const started = useRef(performance.now());
  const done = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), problem.targetMs);
    return () => clearTimeout(t);
  }, [problem.targetMs]);

  const finish = (correct: boolean, userText: string) => {
    if (done.current) return;
    done.current = true;
    const rtMs = Math.round(performance.now() - started.current);
    onAnswer({ correct, userText, rtMs });
    if (correct) {
      setPhase('correct');
      feedbackCorrect(settings);
      setTimeout(onNext, 280);
    } else {
      setPhase('wrong');
      feedbackWrong(settings);
      if (quick) setTimeout(onNext, 1100);
    }
  };

  const change = (next: string) => {
    if (phase !== 'answering') return;
    setInput(next);
    // avans automat când răspunsul e corect (fără să apeși ✓)
    if (isCorrectInput(problem, next)) finish(true, next);
  };

  const submit = () => {
    if (phase === 'wrong' && !quick) return onNext();
    if (phase !== 'answering') return;
    if (!input) {
      setShake((s) => s + 1);
      return;
    }
    finish(isCorrectInput(problem, input), input);
  };

  const choose = (i: number) => {
    if (phase !== 'answering') return;
    setPicked(i);
    finish(i === problem.correctChoice, problem.choices?.[i] ?? '');
  };

  // Enter = „Continuă” după o greșeală; cifrele 1–4 aleg varianta în grile
  useEffect(() => {
    if (problem.input !== 'choice' && phase !== 'wrong') return;
    const onDown = (e: KeyboardEvent) => {
      if (phase === 'wrong' && !quick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onNext();
      } else if (problem.input === 'choice' && phase === 'answering') {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < (problem.choices?.length ?? 0)) choose(i);
      }
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  });

  const isChoice = problem.input === 'choice';
  const longChoices = (problem.choices ?? []).some((c) => c.length > 9);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-2 py-4 text-center">
        {problem.template !== 'direct' && (
          <div className="mb-2 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
            {TEMPLATE_LABEL[problem.template]}
          </div>
        )}
        {problem.prompt && (
          <div
            className={cx(
              'pop font-bold tracking-tight break-words',
              problem.prompt.length > 14 ? 'text-4xl' : 'text-5xl sm:text-6xl',
            )}
          >
            {problem.prompt}
          </div>
        )}
        {problem.question && <div className="mt-2 text-lg text-muted">{problem.question}</div>}
        {problem.hint && <div className="mt-1 text-sm text-muted">({problem.hint})</div>}

        {!isChoice && (
          <div
            key={shake}
            className={cx(
              'mt-5 flex min-h-16 min-w-40 items-center justify-center rounded-2xl border-2 px-5 text-4xl font-bold',
              shake > 0 && 'shake',
              phase === 'correct' && 'border-good bg-good-soft text-good',
              phase === 'wrong' && 'border-bad bg-bad-soft text-bad',
              phase === 'answering' && 'border-border bg-surface',
            )}
          >
            {input ? prettyInput(input) : <span className="text-muted/50">?</span>}
            {problem.suffix && <span className="ml-1 text-2xl text-muted">{problem.suffix}</span>}
          </div>
        )}

        <div className="mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cx('fill-bar h-full rounded-full', slow ? 'bg-warn' : 'bg-accent')}
            style={{
              animationDuration: `${problem.targetMs}ms`,
              animationPlayState: phase === 'answering' ? 'running' : 'paused',
            }}
          />
        </div>
      </div>

      {phase === 'wrong' && (
        <div className="slide-up mb-3 rounded-3xl border border-bad/40 bg-surface p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-bad">Răspuns corect</div>
              <div className="text-2xl font-bold">{problem.answerText}</div>
            </div>
            {!isChoice && input && <div className="text-sm text-muted line-through">{prettyInput(input)}</div>}
          </div>
          {!quick && (
            <>
              <StepList steps={problem.steps} className="mt-3 max-h-56 overflow-y-auto" />
              <Button className="mt-3 w-full" onClick={onNext}>
                Continuă
              </Button>
            </>
          )}
        </div>
      )}

      {isChoice ? (
        phase !== 'wrong' && (
          <div className={cx('grid gap-2 pb-2', longChoices || problem.choices!.length === 2 ? 'grid-cols-1' : 'grid-cols-2')}>
            {problem.choices!.map((c, i) => (
              <button
                key={i}
                onClick={() => choose(i)}
                className={cx(
                  'min-h-16 rounded-2xl border-2 px-3 py-3 text-2xl font-bold transition active:scale-[0.98]',
                  picked === i && phase === 'correct' ? 'border-good bg-good-soft text-good' : 'border-border bg-surface',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )
      ) : (
        phase !== 'wrong' && (
          <Keypad
            mode={problem.input as Exclude<Problem['input'], 'choice'>}
            value={input}
            onChange={change}
            onSubmit={submit}
            onSkip={() => finish(false, '')}
            layout={settings.keypad}
            disabled={phase !== 'answering'}
            onKey={() => feedbackKey(settings)}
          />
        )
      )}
    </div>
  );
}
