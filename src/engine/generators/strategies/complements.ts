import { type Rng, jitter } from '../../rng';
import type { Core } from '../../types';
import { MINUS, fmt } from '../../format';

/** Regula „fiecare cifră până la 9, ultima (nenulă) până la 10”, descrisă cifră cu cifră. */
function digitRuleNote(n: number, width: number): string {
  const digits = String(n).padStart(width, '0').split('').map(Number);
  let last = digits.length - 1;
  while (last > 0 && digits[last] === 0) last--;
  const pairs = digits.slice(0, last + 1).map((dg, i) => `${dg}→${i === last ? 10 - dg : 9 - dg}`);
  return `fiecare cifră până la 9, ultima până la 10: ${pairs.join(', ')}`;
}

function powerComplement(R: number, n: number): Core {
  const width = String(R).length - 1;
  return {
    key: `cmp:${R}:${n}`,
    prompt: `${fmt(R)} ${MINUS} ${fmt(n)}`,
    value: R - n,
    input: 'int',
    steps: [{ expr: `${fmt(R)} ${MINUS} ${fmt(n)}`, value: R - n, note: digitRuleNote(n, width) }],
    errors: [R - n + 1, R - n - 1, R - n + 10, R - n - 10].filter((v) => v > 0),
  };
}

export function generateComplement(rng: Rng, d: number): Core {
  const e = jitter(rng, d);

  if (e < 0.35) {
    let n = rng.int(11, 99);
    if (n % 10 === 0) n += rng.int(1, 9);
    return powerComplement(100, Math.min(n, 99));
  }
  if (e < 0.6) {
    let n = rng.int(101, 999);
    if (n % 10 === 0 && rng.chance(0.7)) n += rng.int(1, 9);
    return powerComplement(1000, Math.min(n, 999));
  }
  if (e < 0.82) {
    // bază rotundă oarecare: R − n = (R − 1 − n) + 1, fără împrumut
    const R = rng.pick([200, 300, 400, 500, 600, 700, 800, 900, 2000, 5000]);
    let n = rng.int(Math.ceil(R / 4), R - 11);
    if (n % 10 === 0) n += 3;
    return {
      key: `cmp:${R}:${n}`,
      prompt: `${fmt(R)} ${MINUS} ${fmt(n)}`,
      value: R - n,
      input: 'int',
      steps: [
        { expr: `${fmt(R - 1)} ${MINUS} ${fmt(n)}`, value: R - 1 - n, note: `${fmt(R)} = ${fmt(R - 1)} + 1, deci fără împrumut` },
        { expr: `${fmt(R - 1 - n)} + 1`, value: R - n },
      ],
      errors: [R - n + 1, R - n - 1, R - n + 10, R - n - 100].filter((v) => v > 0),
    };
  }
  if (rng.chance(0.5)) {
    let n = rng.int(1001, 9999);
    if (n % 10 === 0) n += 7;
    return powerComplement(10000, Math.min(n, 9999));
  }
  // rest din 100 lei: lucrezi în bani (×100)
  let cents = rng.int(1001, 9899);
  if (cents % 10 === 0) cents += 3;
  const rest = 10000 - cents;
  return {
    key: `cmp:lei:${cents}`,
    prompt: `100 ${MINUS} ${fmt(cents / 100)}`,
    question: 'Restul din 100 lei?',
    value: rest / 100,
    input: 'decimal',
    steps: [
      { expr: `10.000 ${MINUS} ${cents} (în bani)`, value: rest, note: digitRuleNote(cents, 4) },
      { expr: `${rest} bani`, value: rest / 100, note: 'înapoi în lei' },
    ],
    errors: [(rest + 1) / 100, (rest - 1) / 100, (rest + 10) / 100, (rest - 100) / 100],
  };
}
