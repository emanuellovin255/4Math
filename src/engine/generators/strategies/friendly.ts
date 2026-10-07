import { type Rng, jitter } from '../../rng';
import type { Core, Step } from '../../types';
import { DIV, TIMES, fmt } from '../../format';

type Variant = {
  id: string;
  minE: number;
  make(rng: Rng): { factors: number[]; n: number; value: number; steps: Step[] };
};

const x = (a: number, b: number) => `${fmt(a)} ${TIMES} ${fmt(b)}`;

/** „Numere prietene”: 5×2 = 10, 25×4 = 100, 125×8 = 1000 și scurtăturile ×5, ×15, ×25, ×50, ×125. */
const VARIANTS: Variant[] = [
  {
    id: 'x5even',
    minE: 0,
    make: (rng) => {
      const n = 2 * rng.int(6, 99);
      return {
        factors: [n, 5],
        n,
        value: n * 5,
        steps: [
          { expr: `${fmt(n)} ${DIV} 2`, value: n / 2, note: `${TIMES}5 = ${DIV}2, apoi ${TIMES}10` },
          { expr: x(n / 2, 10), value: n * 5 },
        ],
      };
    },
  },
  {
    id: 'pair5',
    minE: 0,
    make: (rng) => {
      const n = rng.int(13, 99);
      return {
        factors: [5, n, 2],
        n,
        value: n * 10,
        steps: [
          { expr: x(5, 2), value: 10, note: 'grupezi perechea prietenă' },
          { expr: x(n, 10), value: n * 10 },
        ],
      };
    },
  },
  {
    id: 'x50',
    minE: 0.15,
    make: (rng) => {
      const n = rng.int(12, 98);
      return {
        factors: [n, 50],
        n,
        value: n * 50,
        steps: [
          { expr: x(n, 100), value: n * 100, note: `${TIMES}50 = ${TIMES}100, apoi ${DIV}2` },
          { expr: `${fmt(n * 100)} ${DIV} 2`, value: n * 50 },
        ],
      };
    },
  },
  {
    id: 'x25m4',
    minE: 0.25,
    make: (rng) => {
      const q = rng.int(3, 30);
      const n = 4 * q;
      return {
        factors: [n, 25],
        n,
        value: n * 25,
        steps: [
          { expr: `${fmt(n)} ${DIV} 4`, value: q, note: `${TIMES}25 = ${DIV}4, apoi ${TIMES}100` },
          { expr: x(q, 100), value: n * 25 },
        ],
      };
    },
  },
  {
    id: 'pair25',
    minE: 0.3,
    make: (rng) => {
      const n = rng.int(13, 99);
      return {
        factors: [25, n, 4],
        n,
        value: n * 100,
        steps: [
          { expr: x(25, 4), value: 100, note: 'grupezi perechea prietenă' },
          { expr: x(n, 100), value: n * 100 },
        ],
      };
    },
  },
  {
    id: 'x15',
    minE: 0.45,
    make: (rng) => {
      const n = rng.int(12, 98);
      return {
        factors: [n, 15],
        n,
        value: n * 15,
        steps: [
          { expr: x(n, 10), value: n * 10, note: `${TIMES}15 = ${TIMES}10 + jumătate din asta` },
          { expr: `${fmt(n * 10)} ${DIV} 2`, value: n * 5 },
          { expr: `${fmt(n * 10)} + ${fmt(n * 5)}`, value: n * 15 },
        ],
      };
    },
  },
  {
    id: 'x125m8',
    minE: 0.5,
    make: (rng) => {
      const q = rng.int(2, 15);
      const n = 8 * q;
      return {
        factors: [n, 125],
        n,
        value: n * 125,
        steps: [
          { expr: `${fmt(n)} ${DIV} 8`, value: q, note: `125 ${TIMES} 8 = 1000` },
          { expr: x(q, 1000), value: n * 125 },
        ],
      };
    },
  },
  {
    id: 'pair125',
    minE: 0.55,
    make: (rng) => {
      const n = rng.int(3, 49);
      return {
        factors: [125, n, 8],
        n,
        value: n * 1000,
        steps: [
          { expr: x(125, 8), value: 1000, note: 'grupezi perechea prietenă' },
          { expr: x(n, 1000), value: n * 1000 },
        ],
      };
    },
  },
  {
    id: 'x5odd',
    minE: 0.6,
    make: (rng) => {
      const n = 2 * rng.int(51, 499) + 1;
      return {
        factors: [n, 5],
        n,
        value: n * 5,
        steps: [
          { expr: x(n, 10), value: n * 10, note: `${TIMES}5 = ${TIMES}10, apoi ${DIV}2` },
          { expr: `${fmt(n * 10)} ${DIV} 2`, value: n * 5 },
        ],
      };
    },
  },
  {
    id: 'x25any',
    minE: 0.7,
    make: (rng) => {
      let n = rng.int(13, 99);
      if (n % 4 === 0) n += 1;
      return {
        factors: [n, 25],
        n,
        value: n * 25,
        steps: [
          { expr: x(n, 100), value: n * 100, note: `${TIMES}25 = ${TIMES}100, apoi ${DIV}4` },
          { expr: `${fmt(n * 100)} ${DIV} 4`, value: n * 25 },
        ],
      };
    },
  },
  {
    id: 'x125any',
    minE: 0.85,
    make: (rng) => {
      let n = 2 * rng.int(6, 48);
      if (n % 8 === 0) n += 2;
      return {
        factors: [n, 125],
        n,
        value: n * 125,
        steps: [
          { expr: x(n, 1000), value: n * 1000, note: `${TIMES}125 = ${TIMES}1000, apoi ${DIV}8` },
          { expr: `${fmt(n * 1000)} ${DIV} 8`, value: n * 125 },
        ],
      };
    },
  },
];

export function generateFriendly(rng: Rng, d: number): Core {
  const e = jitter(rng, d);
  const eligible = VARIANTS.filter((v) => v.minE <= e);
  // variantele de nivelul curent apar mai des decât cele deja ușoare
  const weights = eligible.map((v) => (e - v.minE < 0.25 ? 2 : 1));
  let r = rng.next() * weights.reduce((s, w) => s + w, 0);
  let chosen = eligible[0];
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r < 0) {
      chosen = eligible[i];
      break;
    }
  }
  const { factors, n, value, steps } = chosen.make(rng);
  const shown = rng.shuffle(factors);
  return {
    key: `fr:${chosen.id}:${n}`,
    prompt: shown.map((f) => fmt(f)).join(` ${TIMES} `),
    value,
    input: 'int',
    steps,
    errors: [value * 10, value / 10, value + 10, value - 10, value * 2].filter(
      (v) => Number.isInteger(v) && v > 0 && v !== value,
    ),
  };
}
