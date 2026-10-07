import { type Rng, intWithDigits, jitter } from '../../rng';
import type { Core, Step } from '../../types';
import { DIV, TIMES, fmt } from '../../format';

/** Bucăți ușor de dublat/înjumătățit: 3748 → [3700, 48], 368 → [300, 68], 74 → [70, 4]. */
function chunks(n: number): number[] {
  if (n < 100) return [n - (n % 10), n % 10].filter((p) => p > 0);
  return [n - (n % 100), n % 100].filter((p) => p > 0);
}

/** Pentru jumătate alegem bucăți pare: 74 → [60, 14], 374 → [300, 74]. */
function halfChunks(n: number): number[] {
  if (n < 100) {
    const hi = Math.floor(n / 20) * 20;
    return [hi, n - hi].filter((p) => p > 0);
  }
  return [n - (n % 100), n % 100].filter((p) => p > 0);
}

function doubleSteps(n: number): Step[] {
  const parts = chunks(n);
  if (parts.length === 1) return [{ expr: `2 ${TIMES} ${fmt(n)}`, value: 2 * n }];
  return [
    ...parts.map((p) => ({ expr: `2 ${TIMES} ${fmt(p)}`, value: 2 * p })),
    { expr: parts.map((p) => fmt(2 * p)).join(' + '), value: 2 * n },
  ];
}

function halfSteps(n: number): Step[] {
  const parts = halfChunks(n);
  if (parts.length === 1) return [{ expr: `${fmt(n)} ${DIV} 2`, value: n / 2 }];
  return [
    ...parts.map((p) => ({ expr: `${fmt(p)} ${DIV} 2`, value: p / 2 })),
    { expr: parts.map((p) => fmt(p / 2)).join(' + '), value: n / 2 },
  ];
}

export function generateDoubleHalf(rng: Rng, d: number): Core {
  const e = jitter(rng, d);

  if (e > 0.75 && rng.chance(0.35)) {
    // lanț: ×4 = dublezi de două ori, ÷4 = înjumătățești de două ori
    if (rng.chance(0.5)) {
      const n = intWithDigits(rng, e > 0.9 ? 3 : 2);
      return {
        key: `dh:x4:${n}`,
        prompt: `4 ${TIMES} ${fmt(n)}`,
        value: 4 * n,
        input: 'int',
        steps: [
          { expr: `2 ${TIMES} ${fmt(n)}`, value: 2 * n, note: `${TIMES}4 = dublezi de două ori` },
          { expr: `2 ${TIMES} ${fmt(2 * n)}`, value: 4 * n },
        ],
        errors: [4 * n + 10, 4 * n - 10, 2 * n, 4 * n + 20],
      };
    }
    const n = 4 * rng.int(26, e > 0.9 ? 2400 : 240);
    return {
      key: `dh:d4:${n}`,
      prompt: `${fmt(n)} ${DIV} 4`,
      value: n / 4,
      input: 'int',
      steps: [
        { expr: `${fmt(n)} ${DIV} 2`, value: n / 2, note: `${DIV}4 = înjumătățești de două ori` },
        { expr: `${fmt(n / 2)} ${DIV} 2`, value: n / 4 },
      ],
      errors: [n / 4 + 5, n / 4 - 5, n / 2, n / 4 + 50],
    };
  }

  if (rng.chance(0.5)) {
    const digits = e < 0.3 ? 2 : e < 0.6 ? 3 : 4;
    let n = intWithDigits(rng, digits);
    // la nivel mic preferăm cifre ≥ 5 (cu transport), altfel e prea ușor
    if (digits === 2 && n % 10 < 5) n += 5;
    return {
      key: `dh:x2:${n}`,
      prompt: `2 ${TIMES} ${fmt(n)}`,
      value: 2 * n,
      input: 'int',
      steps: doubleSteps(n),
      errors: [2 * n + 10, 2 * n - 10, 2 * n + 100, 2 * n - 1].filter((v) => v > 0),
    };
  }

  let n: number;
  if (e < 0.3) n = 2 * rng.int(13, 49);
  else if (e < 0.6) n = 2 * rng.int(51, 499);
  else if (e < 0.8) n = 2 * rng.int(51, 499) + 1;
  else n = rng.int(1001, 9999);
  const half = n / 2;
  return {
    key: `dh:h2:${n}`,
    prompt: `${fmt(n)} ${DIV} 2`,
    value: half,
    input: Number.isInteger(half) ? 'int' : 'decimal',
    steps: halfSteps(n),
    errors: [half + 5, half - 5, half + 50, half - 50, half + 10].filter((v) => v > 0),
  };
}
