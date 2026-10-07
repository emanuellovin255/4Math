import { type Rng, jitter } from '../../rng';
import type { Core, Step } from '../../types';
import { MINUS, fmt } from '../../format';

/** Rotunjire și compensare la adunare/scădere: 998 + 467 = 1000 + 467 − 2. */
export function generateRoundAdd(rng: Rng, d: number): Core {
  const e = jitter(rng, d);
  let R: number;
  let k: number;
  let a: number;
  if (e < 0.3) {
    R = rng.int(3, 9) * 10;
    k = rng.int(1, 2);
    a = rng.int(21, 89);
  } else if (e < 0.6) {
    R = rng.int(1, 9) * 100;
    k = rng.int(1, 3);
    a = rng.int(120, 899);
  } else if (e < 0.85) {
    R = rng.pick([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000]);
    k = rng.int(1, 5);
    a = rng.int(300, 4999);
  } else {
    R = rng.pick([1000, 2000, 3000, 5000, 400, 700, 900]);
    k = rng.int(2, 9);
    a = rng.int(1000, 9999);
  }
  if (a % 10 === 0) a += 7;
  const below = e < 0.3 || rng.chance(0.7); // 998 (sub R) e cazul tipic
  const b = below ? R - k : R + k;
  const sub = rng.chance(0.45) && a > Math.max(b, R) + 5;

  const steps: Step[] = [{ expr: `${fmt(b)} = ${fmt(R)} ${below ? MINUS : '+'} ${k}` }];
  let value: number;
  let errors: number[];
  if (!sub) {
    value = a + b;
    steps.push({ expr: `${fmt(a)} + ${fmt(R)}`, value: a + R });
    steps.push({ expr: `${fmt(a + R)} ${below ? MINUS : '+'} ${k}`, value });
    errors = [below ? a + R + k : a + R - k, value + 10, value - 10, value + 100];
  } else {
    value = a - b;
    steps.push({ expr: `${fmt(a)} ${MINUS} ${fmt(R)}`, value: a - R });
    steps.push({
      expr: `${fmt(a - R)} ${below ? '+' : MINUS} ${k}`,
      value,
      note: below ? 'ai scăzut prea mult, adaugi înapoi' : 'mai scazi restul',
    });
    errors = [below ? a - R - k : a - R + k, value + 10, value - 10, value - 100];
  }
  const swap = !sub && rng.chance(0.5);
  const prompt = sub ? `${fmt(a)} ${MINUS} ${fmt(b)}` : swap ? `${fmt(b)} + ${fmt(a)}` : `${fmt(a)} + ${fmt(b)}`;
  return {
    key: sub ? `ra:-:${a}:${b}` : `ra:+:${Math.min(a, b)}:${Math.max(a, b)}`,
    prompt,
    value,
    input: 'int',
    steps,
    errors: errors.filter((v) => v > 0),
  };
}
