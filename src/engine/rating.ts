// Dificultate adaptivă pentru strategii: o scară asimetrică (staircase).
// Corect și rapid → urci puțin; greșit → cobori de 4 ori mai mult.
// Echilibrul se stabilește unde p·UP = (1 − p)·DOWN, adică la ~80% răspunsuri corecte și rapide.

export const RATING = {
  start: 0.15,
  up: 0.025,
  slowUp: 0.005,
  down: 0.1,
} as const;

export interface SkillState {
  skillId: string;
  rating: number;
  attempts: number;
  correct: number;
  lastAt: number;
}

export function newSkillState(skillId: string): SkillState {
  return { skillId, rating: RATING.start, attempts: 0, correct: 0, lastAt: 0 };
}

export function updateRating(rating: number, correct: boolean, rtMs: number, targetMs: number): number {
  const delta = !correct ? -RATING.down : rtMs <= targetMs ? RATING.up : RATING.slowUp;
  return Math.min(1, Math.max(0, rating + delta));
}

export function applySkillResult(
  s: SkillState,
  r: { correct: boolean; rtMs: number; targetMs: number; now: number; adjustRating?: boolean },
): SkillState {
  return {
    ...s,
    rating: r.adjustRating === false ? s.rating : updateRating(s.rating, r.correct, r.rtMs, r.targetMs),
    attempts: s.attempts + 1,
    correct: s.correct + (r.correct ? 1 : 0),
    lastAt: r.now,
  };
}

/** Nivelul afișat utilizatorului (0–100). */
export const levelOf = (rating: number) => Math.round(rating * 100);
