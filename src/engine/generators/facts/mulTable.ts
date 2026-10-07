import type { Rng } from '../../rng';
import type { Core, Step } from '../../types';
import { DIV, TIMES, fmt } from '../../format';

export const MUL_BANDS = {
  'facts.mul-2-10': { tables: [2, 10, 5, 3, 4, 9, 6, 7, 8], maxOther: 10 },
  'facts.mul-11-12': { tables: [11, 12], maxOther: 12 },
  'facts.mul-13-15': { tables: [13, 14, 15], maxOther: 15 },
  'facts.mul-16-20': { tables: [16, 17, 18, 19, 20], maxOther: 20 },
} as const;

export type MulBandId = keyof typeof MUL_BANDS;

export const mulKey = (a: number, b: number) => `mul:${Math.min(a, b)}:${Math.max(a, b)}`;

export function parseMulKey(key: string): [number, number] {
  const [, a, b] = key.split(':');
  return [Number(a), Number(b)];
}

/** Faptele unei benzi, în ordinea de introducere, fără dubluri (7×8 = 8×7). */
export function mulFacts(band: MulBandId): string[] {
  const { tables, maxOther } = MUL_BANDS[band];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tables) {
    for (let k = 2; k <= maxOther; k++) {
      // un fapt aparține benzii factorului său maxim
      if (band !== 'facts.mul-2-10' && Math.max(t, k) !== t) continue;
      const key = mulKey(t, k);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
  }
  return out;
}

/** Pași de sprijin pentru un fapt: cum îl reconstruiești din ceva ce știi deja. */
export function mulHint(x: number, y: number): Step[] {
  const a = Math.min(x, y);
  const b = Math.max(x, y);
  const p = a * b;
  if (a === 10 || b === 10 || a <= 2) return [{ expr: `${a} ${TIMES} ${b}`, value: p }];
  if (a === 9 || b === 9) {
    const o = a === 9 ? b : a;
    return [
      { expr: `${o} ${TIMES} 10`, value: o * 10, note: `${TIMES}9 = ${TIMES}10 − ${TIMES}1` },
      { expr: `${o * 10} − ${o}`, value: p },
    ];
  }
  if (a === 5 || b === 5) {
    const o = a === 5 ? b : a;
    return [
      { expr: `${o} ${TIMES} 10`, value: o * 10, note: `${TIMES}5 = ${TIMES}10 ${DIV} 2` },
      { expr: `${o * 10} ${DIV} 2`, value: p },
    ];
  }
  if (a === 11 || b === 11) {
    const o = a === 11 ? b : a;
    return [
      { expr: `${o} ${TIMES} 10`, value: o * 10, note: `${TIMES}11 = ${TIMES}10 + ${TIMES}1` },
      { expr: `${o * 10} + ${o}`, value: p },
    ];
  }
  if (b > 10) {
    const tens = b - (b % 10);
    const units = b % 10;
    if (units === 0) {
      return [
        { expr: `${a} ${TIMES} ${tens / 10}`, value: a * (tens / 10) },
        { expr: `${a * (tens / 10)} ${TIMES} 10`, value: p },
      ];
    }
    return [
      { expr: `${a} ${TIMES} ${tens}`, value: a * tens, note: `${b} = ${tens} + ${units}` },
      { expr: `${a} ${TIMES} ${units}`, value: a * units },
      { expr: `${fmt(a * tens)} + ${fmt(a * units)}`, value: p },
    ];
  }
  if (b % 2 === 0) {
    return [
      { expr: `${a} ${TIMES} ${b / 2}`, value: a * (b / 2), note: 'jumătate din factor, apoi dublezi' },
      { expr: `${a * (b / 2)} ${TIMES} 2`, value: p },
    ];
  }
  return [
    { expr: `${a} ${TIMES} ${b - 1}`, value: a * (b - 1), note: 'un pas mai jos, apoi adaugi' },
    { expr: `${a * (b - 1)} + ${a}`, value: p },
  ];
}

export function mulCore(key: string, rng: Rng): Core {
  const [a, b] = parseMulKey(key);
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
  const p = a * b;
  const errors = [(a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), p + 10, p - 10];
  const missingSteps = (known: number, unknown: number): Step[] => [
    { expr: `${fmt(p)} ${DIV} ${known}`, value: unknown, note: `pentru că ${known} ${TIMES} ${unknown} = ${fmt(p)}` },
  ];
  const missErrors = (u: number) => [u + 1, u - 1, u + 2].filter((v) => v > 0);
  return {
    key,
    prompt: `${x} ${TIMES} ${y}`,
    value: p,
    input: 'int',
    steps: mulHint(a, b),
    errors,
    variants: [
      { key, prompt: `${x} ${TIMES} ? = ${fmt(p)}`, value: y, input: 'int', steps: missingSteps(x, y), errors: missErrors(y) },
      { key, prompt: `? ${TIMES} ${y} = ${fmt(p)}`, value: x, input: 'int', steps: missingSteps(y, x), errors: missErrors(x) },
      { key, prompt: `${fmt(p)} ${DIV} ${x}`, value: y, input: 'int', steps: missingSteps(x, y), errors: missErrors(y) },
    ],
  };
}
