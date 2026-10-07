import type { Problem } from './types';
import { gcd, parseInput } from './format';

const EPS = 1e-9;

/** Valoarea tastată se potrivește cu răspunsul (cu toleranță la rotunjire, dacă e cazul)? */
export function matchesValue(
  raw: string,
  value: number,
  opts: { tolerance?: number; requireFraction?: boolean } = {},
): boolean {
  const parsed = parseInput(raw);
  if (!parsed) return false;
  if (opts.requireFraction) {
    const f = parsed.fraction;
    if (!f || f.d <= 0 || gcd(f.n, f.d) !== 1) return false;
  }
  const tol = (opts.tolerance ?? 0) + EPS * Math.max(1, Math.abs(value));
  return Math.abs(parsed.value - value) <= tol;
}

export function isCorrectInput(problem: Problem, raw: string): boolean {
  if (problem.value === undefined) return false;
  return matchesValue(raw, problem.value, {
    tolerance: problem.tolerance,
    requireFraction: problem.requireFraction,
  });
}
