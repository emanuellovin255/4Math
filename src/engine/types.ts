import type { Rng } from './rng';

export type ModuleId = 'facts' | 'decomp' | 'patterns' | 'estimate' | 'memory';
export type InputMode = 'int' | 'decimal' | 'fraction';
export type TemplateId = 'direct' | 'variant' | 'choice' | 'truefalse' | 'compare';

/** Un pas din soluție. Dacă are `value`, poate fi cerut în modul ghidat. */
export interface Step {
  expr: string;
  value?: number;
  /** Afișare alternativă pentru valoare (ex. „33,(3)”). */
  display?: string;
  note?: string;
}

/** Forma „brută” a unei probleme, înainte de șablonul de prezentare. */
export interface Core {
  key: string;
  prompt: string;
  question?: string;
  value: number;
  input: InputMode;
  /** Toleranță absolută (pentru răspunsuri rotunjite). */
  tolerance?: number;
  /** Răspunsul trebuie dat ca fracție ireductibilă. */
  requireFraction?: boolean;
  hint?: string;
  suffix?: string;
  steps: Step[];
  /** Răspunsuri greșite tipice, folosite ca variante în grile. */
  errors?: number[];
  /** Forme alternative ale aceleiași probleme (operand lipsă, invers, altă direcție). */
  variants?: Core[];
  /** Afișare specială a răspunsului corect (ex. fracție „3/8”). */
  answerDisplay?: string;
}

export interface Problem {
  uid: string;
  skillId: string;
  key: string;
  factKey?: string;
  template: TemplateId;
  prompt: string;
  question?: string;
  hint?: string;
  suffix?: string;
  input: InputMode | 'choice';
  value?: number;
  tolerance?: number;
  requireFraction?: boolean;
  choices?: string[];
  correctChoice?: number;
  answerText: string;
  steps: Step[];
  difficulty: number;
  targetMs: number;
}

export interface Lesson {
  paragraphs: string[];
  tips?: string[];
}

export interface SkillDef {
  id: string;
  module: ModuleId;
  kind: 'fact' | 'strategy';
  title: string;
  short: string;
  prerequisites: string[];
  lesson?: Lesson;
  /** Doar pentru fapte: lista completă, în ordinea de introducere. */
  facts?: string[];
  coreForFact?(factKey: string, rng: Rng): Core;
  /** Doar pentru strategii: generator parametric, dificultate în [0, 1]. */
  generate?(rng: Rng, difficulty: number): Core;
  templates: Partial<Record<TemplateId, number>>;
  targetMs(difficulty: number): number;
}
