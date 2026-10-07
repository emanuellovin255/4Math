import type { Rng } from './rng';
import type { Core, Problem, SkillDef, TemplateId } from './types';
import { fmt } from './format';
import { pickDistractors } from './distractors';
import type { RecentKeys } from './recent';

export interface BuildOptions {
  difficulty: number;
  factKey?: string;
  /** Problema „brută” gata construită (ex. perechea aleasă în rubrica Înmulțiri). */
  core?: Core;
  /** Suprascrie ponderile șabloanelor (ex. sprint fără comparații, ghidat doar direct). */
  templates?: Partial<Record<TemplateId, number>>;
  paceFactor?: number;
  recent?: RecentKeys;
}

const TEMPLATE_TIME: Record<TemplateId, number> = {
  direct: 1,
  variant: 1.1,
  choice: 0.85,
  truefalse: 0.8,
  compare: 1.8,
};

let uidCounter = 0;
const nextUid = () => `p${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

/** Câte zecimale arătăm pentru un răspuns rotunjit (toleranță 0,05 → 1 zecimală). */
const decimalsFor = (tol: number) => Math.max(0, Math.round(-Math.log10(2 * tol)));

function labelFor(core: Core) {
  return (v: number) => {
    const shown = core.tolerance ? fmt(Number(v.toFixed(decimalsFor(core.tolerance)))) : fmt(v);
    return `${shown}${core.suffix ?? ''}`;
  };
}

export function answerTextFor(core: Core): string {
  return core.answerDisplay ?? `${fmt(core.value)}${core.suffix ?? ''}`;
}

export function makeCore(skill: SkillDef, rng: Rng, difficulty: number, factKey?: string, recent?: RecentKeys): Core {
  if (skill.kind === 'fact') {
    const key = factKey ?? rng.pick(skill.facts ?? []);
    return skill.coreForFact!(key, rng);
  }
  let core = skill.generate!(rng, difficulty);
  for (let i = 0; i < 25 && recent?.has(core.key); i++) core = skill.generate!(rng, difficulty);
  return core;
}

export function buildProblem(skill: SkillDef, rng: Rng, opts: BuildOptions): Problem {
  const { difficulty } = opts;
  const core = opts.core ?? makeCore(skill, rng, difficulty, opts.factKey, opts.recent);
  const weights: Partial<Record<TemplateId, number>> = { ...(opts.templates ?? skill.templates) };
  if (!core.variants?.length) delete weights.variant;
  if (skill.kind === 'fact') delete weights.compare;
  if (core.requireFraction) {
    delete weights.choice;
    delete weights.truefalse;
  }
  if (!Object.values(weights).some((w) => (w ?? 0) > 0)) weights.direct = 1;

  let template = rng.weighted(weights);
  const base = skill.targetMs(difficulty) * (opts.paceFactor ?? 1);
  const make = (c: Core, t: TemplateId, extra: Partial<Problem> = {}): Problem => ({
    uid: nextUid(),
    skillId: skill.id,
    key: c.key,
    factKey: skill.kind === 'fact' ? core.key : undefined,
    template: t,
    prompt: c.prompt,
    question: c.question,
    hint: c.hint,
    suffix: c.suffix,
    input: c.input,
    value: c.value,
    tolerance: c.tolerance,
    requireFraction: c.requireFraction,
    answerText: answerTextFor(c),
    steps: c.steps,
    difficulty,
    targetMs: Math.round(base * TEMPLATE_TIME[t]),
    ...extra,
  });

  if (template === 'variant') {
    return make(rng.pick(core.variants!), 'variant');
  }

  if (template === 'choice' || template === 'truefalse') {
    const label = labelFor(core);
    const wrong = pickDistractors(core.value, core.errors, rng, 3);
    if (template === 'choice' && wrong.length >= 2) {
      const options = rng.shuffle([core.value, ...wrong]);
      return make(core, 'choice', {
        input: 'choice',
        question: core.question ?? 'Alege rezultatul',
        choices: options.map(label),
        correctChoice: options.indexOf(core.value),
        answerText: label(core.value),
        value: undefined,
      });
    }
    if (template === 'truefalse' && wrong.length >= 1) {
      const isTrue = rng.chance(0.5);
      const shown = isTrue ? core.value : wrong[0];
      return make(core, 'truefalse', {
        input: 'choice',
        prompt: `${core.prompt} = ${label(shown)}`,
        question: 'Adevărat sau fals?',
        choices: ['Adevărat', 'Fals'],
        correctChoice: isTrue ? 0 : 1,
        answerText: isTrue ? 'Adevărat' : `Fals (corect: ${label(core.value)})`,
        value: undefined,
      });
    }
    template = 'direct';
  }

  if (template === 'compare') {
    for (let i = 0; i < 10; i++) {
      const other = makeCore(skill, rng, difficulty, undefined, opts.recent);
      if (Math.abs(other.value - core.value) < 1e-9) continue;
      const firstBigger = core.value > other.value;
      return make(core, 'compare', {
        key: `${core.key}|${other.key}`,
        input: 'choice',
        prompt: '',
        question: 'Care e mai mare?',
        choices: [core.prompt, other.prompt],
        correctChoice: firstBigger ? 0 : 1,
        answerText: firstBigger ? core.prompt : other.prompt,
        steps: [
          { expr: core.prompt, value: core.value },
          { expr: other.prompt, value: other.value },
        ],
        value: undefined,
      });
    }
  }

  return make(core, 'direct');
}
