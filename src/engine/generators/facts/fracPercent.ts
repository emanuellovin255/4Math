import type { Rng } from '../../rng';
import type { Core, Step } from '../../types';
import { TIMES, fmtPeriodic, gcd, isTerminating } from '../../format';

const DENOMS = [2, 4, 5, 10, 3, 8, 20, 6, 9, 12, 16];

export const fracKey = (n: number, d: number) => `fp:${n}/${d}`;

export function parseFracKey(key: string): [number, number] {
  const [n, d] = key.slice(3).split('/').map(Number);
  return [n, d];
}

/** Toate fracțiile ireductibile n/d < 1 pentru numitorii de bază, în ordinea de introducere. */
export function fracFacts(): string[] {
  const out: string[] = [];
  for (const d of DENOMS) {
    for (let n = 1; n < d; n++) if (gcd(n, d) === 1) out.push(fracKey(n, d));
  }
  return out;
}

/** Procentul lui n/d ca text: 3/8 → "37,5", 1/3 → "33,(3)". */
export const percentText = (n: number, d: number) => fmtPeriodic(100 * n, d);

function anchorSteps(n: number, d: number, target: 'percent' | 'decimal'): Step[] {
  const unit = target === 'percent' ? `${percentText(1, d)}%` : fmtPeriodic(1, d);
  const value = target === 'percent' ? (100 * n) / d : n / d;
  const display = (target === 'percent' ? percentText(n, d) : fmtPeriodic(n, d)) + (target === 'percent' ? '%' : '');
  if (n === 1) return [{ expr: `1/${d}`, value, display }];
  return [
    { expr: `1/${d}`, value: target === 'percent' ? 100 / d : 1 / d, display: unit },
    { expr: `${n} ${TIMES} ${unit}`, value, display, note: `${n}/${d} = ${n} ${TIMES} 1/${d}` },
  ];
}

export function fracCore(key: string, rng: Rng): Core {
  const [n, d] = parseFracKey(key);
  const exact = isTerminating(n, d);
  const pct = (100 * n) / d;
  const dec = n / d;

  const toPercent: Core = {
    key,
    prompt: `${n}/${d}`,
    question: 'Cât la sută?',
    value: pct,
    input: 'decimal',
    suffix: '%',
    tolerance: exact ? undefined : 0.05,
    hint: exact ? undefined : 'rotunjit la o zecimală',
    answerDisplay: `${percentText(n, d)}%`,
    steps: anchorSteps(n, d, 'percent'),
    errors: [pct + 5, pct - 5, pct + 2.5, (100 * n) / (d + 1), n * 10 + d].map((v) => Math.round(v * 10) / 10),
  };

  const toDecimal: Core = {
    key,
    prompt: `${n}/${d}`,
    question: 'Ca număr zecimal?',
    value: dec,
    input: 'decimal',
    tolerance: exact ? undefined : 0.0005,
    hint: exact ? undefined : 'rotunjit la 3 zecimale',
    answerDisplay: fmtPeriodic(n, d),
    steps: anchorSteps(n, d, 'decimal'),
    errors: [dec + 0.05, dec - 0.05, dec + 0.1, n / (d + 1)].map((v) => Math.round(v * 1000) / 1000),
  };

  const toFraction: Core = {
    key,
    prompt: `${percentText(n, d)}%`,
    question: 'Ca fracție ireductibilă?',
    value: dec,
    input: 'fraction',
    requireFraction: true,
    answerDisplay: `${n}/${d}`,
    steps: [
      { expr: `1/${d} = ${percentText(1, d)}%` },
      { expr: `${percentText(n, d)}% = ${n} ${TIMES} ${percentText(1, d)}%`, value: dec, display: `${n}/${d}` },
    ],
  };

  const [main, ...rest] = rng.shuffle([toPercent, toDecimal, toFraction]);
  return { ...main, variants: rest };
}

