import type { SkillDef } from './types';
import { type FactState, AUTOMATED_BOX } from './srs';
import { type SkillState, newSkillState } from './rating';
import { SKILL_BY_ID } from '../data/curriculum';

export interface Progress {
  facts: Map<string, FactState>;
  skills: Map<string, SkillState>;
}

export const emptyProgress = (): Progress => ({ facts: new Map(), skills: new Map() });

export function skillStateOf(p: Progress, id: string): SkillState {
  return p.skills.get(id) ?? newSkillState(id);
}

export interface FactSummary {
  total: number;
  seen: number;
  learning: number;
  known: number; // cutia ≥ 2
  automated: number; // cutia ≥ 3
  due: number;
}

export function factSummary(p: Progress, skill: SkillDef, now = Date.now()): FactSummary {
  const out: FactSummary = { total: skill.facts?.length ?? 0, seen: 0, learning: 0, known: 0, automated: 0, due: 0 };
  for (const key of skill.facts ?? []) {
    const s = p.facts.get(key);
    if (!s) continue;
    out.seen++;
    if (s.box <= 1) out.learning++;
    if (s.box >= 2) out.known++;
    if (s.box >= AUTOMATED_BOX) out.automated++;
    if (s.dueAt <= now) out.due++;
  }
  return out;
}

/** Progresul unei abilități în [0, 1]: fapte automatizate / total, sau nivelul strategiei. */
export function skillProgress(p: Progress, skill: SkillDef): number {
  if (skill.kind === 'fact') {
    const s = factSummary(p, skill);
    return s.total ? s.automated / s.total : 0;
  }
  return skillStateOf(p, skill.id).rating;
}

export function isPrereqMet(p: Progress, id: string): boolean {
  const skill = SKILL_BY_ID[id];
  if (!skill) return true;
  if (skill.kind === 'fact') {
    const s = factSummary(p, skill);
    return s.total > 0 && s.known / s.total >= 0.6;
  }
  return skillStateOf(p, id).rating >= 0.3;
}

export function isUnlocked(p: Progress, skill: SkillDef): boolean {
  return skill.prerequisites.every((id) => isPrereqMet(p, id));
}

export function isPracticed(p: Progress, skill: SkillDef): boolean {
  if (skill.kind === 'fact') return (skill.facts ?? []).some((k) => p.facts.has(k));
  return skillStateOf(p, skill.id).attempts > 0;
}
