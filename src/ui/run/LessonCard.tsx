import { type ReactNode, useMemo, useState } from 'react';
import { getSkill } from '../../data/curriculum';
import { createRng, randomSeed } from '../../engine/rng';
import { makeCore } from '../../engine/problem';
import { StepList } from '../components/StepList';
import { Button } from '../components/ui';
import { fmt } from '../../engine/format';

/** Explicația unei abilități + un exemplu desfăcut pas cu pas (generat, deci mereu altul). */
export function LessonCard({ skillId, children }: { skillId: string; children?: ReactNode }) {
  const skill = getSkill(skillId);
  const [seed, setSeed] = useState(() => randomSeed());
  const example = useMemo(() => {
    const rng = createRng(seed);
    return makeCore(skill, rng, 0.35);
  }, [seed, skill]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-accent">Lecție</div>
        <h2 className="text-2xl font-bold">{skill.title}</h2>
      </div>
      {skill.lesson?.paragraphs.map((p, i) => (
        <p key={i} className="leading-relaxed">
          {p}
        </p>
      ))}
      {skill.lesson?.tips && (
        <ul className="space-y-1 rounded-2xl bg-accent-soft p-3 text-sm font-medium">
          {skill.lesson.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <div className="rounded-3xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Exemplu</div>
          <button className="text-sm font-medium text-accent" onClick={() => setSeed(randomSeed())}>
            Alt exemplu ↻
          </button>
        </div>
        <div className="mt-1 text-3xl font-bold">
          {example.prompt}
          {example.question && <span className="ml-2 text-base font-normal text-muted">{example.question}</span>}
        </div>
        <StepList steps={example.steps} className="mt-3" />
        <div className="mt-2 text-right text-lg font-semibold">
          = <span className="text-good">{example.answerDisplay ?? `${fmt(example.value)}${example.suffix ?? ''}`}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function LessonStep({ skillId, onDone }: { skillId: string; onDone(): void }) {
  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <LessonCard skillId={skillId}>
        <Button className="w-full" onClick={onDone}>
          Am înțeles, să încercăm ghidat
        </Button>
      </LessonCard>
    </div>
  );
}
