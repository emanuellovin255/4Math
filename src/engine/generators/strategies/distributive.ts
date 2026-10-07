import { type Rng, jitter } from '../../rng';
import type { Core, Step } from '../../types';
import { TIMES, fmt } from '../../format';

/** Distributivitate: desparți un factor în bucăți ușoare. 47 × 6 = 40×6 + 7×6. */
export function generateDistributive(rng: Rng, d: number): Core {
  const e = jitter(rng, d);
  let a: number;
  let m: number;
  let steps: Step[];
  let errors: number[];

  if (e < 0.5) {
    // multi-cifră × o cifră: desparți pe ordine (sute, zeci, unități)
    a = e < 0.25 ? rng.int(12, 98) : rng.int(102, 989);
    if (a % 10 === 0) a += 3;
    m = rng.int(3, 9);
    const parts = String(a)
      .split('')
      .map((dg, i, arr) => Number(dg) * 10 ** (arr.length - 1 - i))
      .filter((p) => p > 0);
    steps = parts.map((p) => ({ expr: `${p} ${TIMES} ${m}`, value: p * m }));
    let acc = parts[0] * m;
    for (const p of parts.slice(1)) {
      steps.push({ expr: `${fmt(acc)} + ${fmt(p * m)}`, value: acc + p * m });
      acc += p * m;
    }
    errors = [a * m + 10, a * m - 10, parts[0] * m + (parts.at(-1) ?? 0) * m, a * m + 100];
  } else {
    // două cifre × două cifre: desparți al doilea factor în zeci + unități
    if (e < 0.75) {
      a = rng.int(13, 99);
      m = rng.int(11, 19);
    } else {
      a = rng.int(23, 99);
      m = rng.int(21, 99);
    }
    if (a % 10 === 0) a += 1;
    if (m % 10 === 0) m += 2;
    if (a === m) m += m % 10 === 9 ? -1 : 1;
    const mt = m - (m % 10);
    const mu = m % 10;
    steps = [
      { expr: `${a} ${TIMES} ${mt}`, value: a * mt, note: `${m} = ${mt} + ${mu}` },
      { expr: `${a} ${TIMES} ${mu}`, value: a * mu },
      { expr: `${fmt(a * mt)} + ${fmt(a * mu)}`, value: a * m },
    ];
    errors = [a * (mt / 10) + a * mu, a * m + 10, a * m - 10, a * mt + mu];
  }

  const value = a * m;
  const swap = rng.chance(0.4);
  return {
    key: `dist:${Math.min(a, m)}x${Math.max(a, m)}`,
    prompt: swap ? `${m} ${TIMES} ${fmt(a)}` : `${fmt(a)} ${TIMES} ${m}`,
    value,
    input: 'int',
    steps,
    errors: errors.filter((v) => v > 0),
  };
}
