import { type Rng, jitter } from '../../rng';
import type { Core } from '../../types';
import { MINUS, TIMES, fmt } from '../../format';

/** Compensare la înmulțire: 47 × 18 = 47 × 20 − 47 × 2. */
export function generateCompensateMul(rng: Rng, d: number): Core {
  const e = jitter(rng, d);
  let n: number;
  let R: number;
  let k: number;
  let below = true;

  if (e < 0.3) {
    n = rng.int(12, 49);
    R = rng.int(2, 9) * 10;
    k = e > 0.2 && rng.chance(0.3) ? 2 : 1;
  } else if (e < 0.55) {
    n = rng.int(12, 99);
    R = rng.int(2, 9) * 10;
    below = rng.chance(0.75);
    k = below ? rng.int(1, 3) : 1;
  } else if (e < 0.8) {
    n = rng.int(12, 99);
    if (rng.chance(0.6)) {
      R = 100;
      k = rng.int(1, 4);
      below = rng.chance(0.7);
    } else {
      R = rng.pick([200, 300, 400, 500]);
      k = rng.int(1, 2);
    }
  } else {
    n = rng.chance(0.5) ? rng.int(12, 99) : rng.int(101, 999);
    R = rng.pick([100, 200, 500, 1000]);
    k = rng.int(1, 4);
    below = rng.chance(0.7);
  }
  if (n % 10 === 0) n += 3;
  const m = below ? R - k : R + k;
  const nR = n * R;
  const nk = n * k;
  const value = n * m;
  const op = below ? MINUS : '+';
  const swap = rng.chance(0.4);

  return {
    key: `cm:${n}x${m}`,
    prompt: swap ? `${fmt(m)} ${TIMES} ${fmt(n)}` : `${fmt(n)} ${TIMES} ${fmt(m)}`,
    value,
    input: 'int',
    steps: [
      { expr: `${fmt(m)} = ${fmt(R)} ${op} ${k}` },
      { expr: `${fmt(n)} ${TIMES} ${fmt(R)}`, value: nR },
      { expr: `${fmt(n)} ${TIMES} ${k}`, value: nk },
      { expr: `${fmt(nR)} ${op} ${fmt(nk)}`, value },
    ],
    errors: [below ? nR + nk : nR - nk, below ? nR - k : nR + k, value + 10, value - 10].filter(
      (v) => v > 0 && v !== value,
    ),
  };
}
