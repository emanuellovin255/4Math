import type { Core, Step } from '../../types';
import { TIMES, fmt } from '../../format';

export const squareKey = (n: number) => `sq:${n}`;
export const cubeKey = (n: number) => `cu:${n}`;
const keyNum = (key: string) => Number(key.split(':')[1]);

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const squareFacts = (from: number, to: number) => range(from, to).map(squareKey);
export const cubeFacts = () => range(2, 15).map(cubeKey);

/** n² = (n − d)(n + d) + d², unde n − d sau n + d e un multiplu de 10. */
export function squareSteps(n: number): Step[] {
  const sq = n * n;
  if (n <= 12) return [{ expr: `${n} ${TIMES} ${n}`, value: sq }];
  if (n % 10 === 0) {
    const t = n / 10;
    return [{ expr: `${t}² ${TIMES} 100`, value: sq }];
  }
  if (n % 10 === 5) {
    const t = (n - 5) / 10;
    return [
      { expr: `${t} ${TIMES} ${t + 1}`, value: t * (t + 1), note: 'zecile × (zecile + 1)' },
      { expr: `${t * (t + 1)} | 25`, value: sq, note: 'lipești 25 la final' },
    ];
  }
  const r = n % 10 < 5 ? n - (n % 10) : n + (10 - (n % 10));
  const d = Math.abs(n - r);
  const other = n < r ? n - d : n + d;
  return [
    { expr: `${n}² = ${r} ${TIMES} ${other} + ${d}²`, note: '(n − d)(n + d) + d²' },
    { expr: `${r} ${TIMES} ${other}`, value: r * other },
    { expr: `${fmt(r * other)} + ${d * d}`, value: sq },
  ];
}

export function squareCore(key: string): Core {
  const n = keyNum(key);
  const sq = n * n;
  return {
    key,
    prompt: `${n}²`,
    value: sq,
    input: 'int',
    steps: squareSteps(n),
    errors: [(n + 1) ** 2, (n - 1) ** 2, sq + 10, sq - 10, n * 2 * 10],
    variants: [
      {
        key,
        prompt: `√${fmt(sq)}`,
        value: n,
        input: 'int',
        steps: [{ expr: `√${fmt(sq)}`, value: n, note: `pentru că ${n}² = ${fmt(sq)}` }],
        errors: [n + 1, n - 1, n + 2],
      },
    ],
  };
}

const CUBE_LAST_DIGIT: Record<number, number> = { 0: 0, 1: 1, 2: 8, 3: 7, 4: 4, 5: 5, 6: 6, 7: 3, 8: 2, 9: 9 };

export function cubeCore(key: string): Core {
  const n = keyNum(key);
  const c = n ** 3;
  return {
    key,
    prompt: `${n}³`,
    value: c,
    input: 'int',
    steps: [
      { expr: `${n}²`, value: n * n },
      { expr: `${fmt(n * n)} ${TIMES} ${n}`, value: c },
    ],
    errors: [(n + 1) ** 3, (n - 1) ** 3, n * n * 3, c + 10],
    variants: [
      {
        key,
        prompt: `∛${fmt(c)}`,
        value: n,
        input: 'int',
        steps: [
          {
            expr: `∛${fmt(c)}`,
            value: n,
            note: `${fmt(c)} se termină în ${c % 10} → rădăcina se termină în ${CUBE_LAST_DIGIT[c % 10]}`,
          },
        ],
        errors: [n + 1, n - 1, n + 2],
      },
    ],
  };
}
