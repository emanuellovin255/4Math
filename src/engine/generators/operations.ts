import type { Rng } from '../rng';
import type { Core, Step } from '../types';
import { DIV, MINUS, TIMES, fmt } from '../format';
import { mulHint } from './facts/mulTable';

export type Op = 'add' | 'sub' | 'mul' | 'div';

/**
 * Configurația rubricii „Operații”.
 * `numbers` = numerele alese (tabla la ×, împărțitorul la ÷, ce aduni / scazi la + și −);
 * listă goală = „oricare”, adică ambii termeni aleatori până la limită.
 */
export interface OpConfig {
  op: Op;
  numbers: number[];
  upTo: number;
  /** Repetă exact aceste perechi (ex. greșelile din sesiunea trecută). */
  pairs?: [number, number][];
}

export const OP_SYMBOL: Record<Op, string> = { add: '+', sub: MINUS, mul: TIMES, div: DIV };

/** Perechea [a, b] înseamnă mereu expresia canonică: a + b, a − b, a × b, a ÷ b. */
export const opKey = (op: Op, a: number, b: number) => `op:${op}:${a}:${b}`;

export function parseOpKey(key: string): { op: Op; pair: [number, number] } | null {
  const legacy = /^cmul:(\d+):(\d+)$/.exec(key);
  if (legacy) return { op: 'mul', pair: [Number(legacy[1]), Number(legacy[2])] };
  const m = /^op:(add|sub|mul|div):(\d+):(\d+)$/.exec(key);
  return m ? { op: m[1] as Op, pair: [Number(m[2]), Number(m[3])] } : null;
}

export function evalOp(op: Op, a: number, b: number): number {
  switch (op) {
    case 'add':
      return a + b;
    case 'sub':
      return a - b;
    case 'mul':
      return a * b;
    case 'div':
      return a / b;
  }
}

/** Dificultatea (pentru timpul-țintă) după mărimea numerelor. */
export function opDifficulty(op: Op, a: number, b: number): number {
  if (op === 'add' || op === 'sub') {
    const m = Math.max(a, b);
    return m <= 20 ? 0 : m <= 100 ? 0.25 : m <= 1000 ? 0.55 : 0.85;
  }
  const m = op === 'div' ? a / b : Math.max(a, b);
  return m <= 10 ? 0 : m <= 20 ? 0.15 : m <= 100 ? 0.45 : 0.8;
}

const placeParts = (n: number) =>
  String(n)
    .split('')
    .map((dg, i, arr) => Number(dg) * 10 ** (arr.length - 1 - i))
    .filter((p) => p > 0);

// ───────────────────────── pași de rezolvare ─────────────────────────

export function addSteps(a: number, b: number): Step[] {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  if (small < 10) {
    const toTen = 10 - (big % 10);
    if (big % 10 !== 0 && small > toTen) {
      return [
        { expr: `${fmt(big)} + ${toTen}`, value: big + toTen, note: `completezi până la ${fmt(big + toTen)}` },
        { expr: `${fmt(big + toTen)} + ${small - toTen}`, value: big + small },
      ];
    }
    return [{ expr: `${fmt(big)} + ${small}`, value: big + small }];
  }
  const parts = placeParts(small);
  const steps: Step[] = [];
  let acc = big;
  parts.forEach((p, i) => {
    steps.push({ expr: `${fmt(acc)} + ${fmt(p)}`, value: acc + p, note: i === 0 ? `${fmt(small)} = ${parts.map(fmt).join(' + ')}` : undefined });
    acc += p;
  });
  return steps;
}

export function subSteps(a: number, b: number): Step[] {
  if (b < 10) {
    const down = a % 10;
    if (down !== 0 && b > down) {
      return [
        { expr: `${fmt(a)} ${MINUS} ${down}`, value: a - down, note: `cobori până la ${fmt(a - down)}` },
        { expr: `${fmt(a - down)} ${MINUS} ${b - down}`, value: a - b },
      ];
    }
    return [{ expr: `${fmt(a)} ${MINUS} ${b}`, value: a - b }];
  }
  const parts = placeParts(b);
  const steps: Step[] = [];
  let acc = a;
  parts.forEach((p, i) => {
    steps.push({ expr: `${fmt(acc)} ${MINUS} ${fmt(p)}`, value: acc - p, note: i === 0 ? `${fmt(b)} = ${parts.map(fmt).join(' + ')}` : undefined });
    acc -= p;
  });
  return steps;
}

export function mulSteps(a: number, b: number): Step[] {
  const small = Math.min(a, b);
  const big = Math.max(a, b);
  if (big <= 20) return mulHint(a, b);
  const parts = placeParts(big);
  if (parts.length === 1) {
    const lead = Number(String(big)[0]);
    const zeros = big / lead;
    return [
      { expr: `${fmt(small)} ${TIMES} ${lead}`, value: small * lead },
      { expr: `${fmt(small * lead)} ${TIMES} ${fmt(zeros)}`, value: small * big, note: 'adaugi zerourile' },
    ];
  }
  const steps: Step[] = parts.map((p, i) => ({
    expr: `${fmt(small)} ${TIMES} ${fmt(p)}`,
    value: small * p,
    note: i === 0 ? `${fmt(big)} = ${parts.map(fmt).join(' + ')}` : undefined,
  }));
  let acc = small * parts[0];
  for (const p of parts.slice(1)) {
    steps.push({ expr: `${fmt(acc)} + ${fmt(small * p)}`, value: acc + small * p });
    acc += small * p;
  }
  return steps;
}

/** Împărțire exactă prin bucăți („chunking”): 378 ÷ 7 = 350 ÷ 7 + 28 ÷ 7. */
export function divSteps(dividend: number, d: number): Step[] {
  const q = dividend / d;
  if (q <= 10 || placeParts(q).length === 1) {
    return [{ expr: `${fmt(dividend)} ${DIV} ${fmt(d)}`, value: q, note: `pentru că ${fmt(d)} ${TIMES} ${fmt(q)} = ${fmt(dividend)}` }];
  }
  const qParts = placeParts(q);
  const chunks = qParts.map((p) => p * d);
  const steps: Step[] = qParts.map((p, i) => ({
    expr: `${fmt(chunks[i])} ${DIV} ${fmt(d)}`,
    value: p,
    note: i === 0 ? `${fmt(dividend)} = ${chunks.map(fmt).join(' + ')}` : undefined,
  }));
  steps.push({ expr: qParts.map(fmt).join(' + '), value: q });
  return steps;
}

// ───────────────────────── probleme ─────────────────────────

export function opCore(op: Op, a: number, b: number, rng: Rng): Core {
  const value = evalOp(op, a, b);
  const sym = OP_SYMBOL[op];
  // la + și × ordinea nu contează, deci o variem uneori
  const swap = (op === 'add' || op === 'mul') && rng.chance(0.25);
  const prompt = swap ? `${fmt(b)} ${sym} ${fmt(a)}` : `${fmt(a)} ${sym} ${fmt(b)}`;
  const steps =
    op === 'add' ? addSteps(a, b) : op === 'sub' ? subSteps(a, b) : op === 'mul' ? mulSteps(a, b) : divSteps(a, b);
  const near = op === 'mul' ? [a, b] : op === 'div' ? [1, 2] : [1, 10];
  return {
    key: opKey(op, a, b),
    prompt,
    value,
    input: 'int',
    steps,
    errors: [value + near[0], value - near[0], value + near[1], value - near[1]].filter((v) => v >= 0 && v !== value),
  };
}

/** Toate perechile posibile pentru o configurație (dacă sunt puține) sau null (dacă sunt prea multe). */
function enumerate(cfg: OpConfig, cap = 3000): [number, number][] | null {
  const { op, numbers, upTo } = cfg;
  const any = numbers.length === 0;
  const xs = any ? null : numbers;
  const out: [number, number][] = [];
  const push = (p: [number, number]) => {
    out.push(p);
    return out.length <= cap;
  };
  if (any) {
    const n = upTo;
    const size = op === 'div' ? 19 * Math.max(1, n - 1) : n * n;
    if (size > cap) return null;
    for (let a = 2; a <= n; a++) {
      for (let b = op === 'div' ? 2 : op === 'sub' ? 1 : 2; b <= (op === 'div' ? 20 : op === 'sub' ? a - 1 : n); b++) {
        if (op === 'div' && !push([a * b, b])) return null;
        if (op === 'sub' && !push([a, b])) return null;
        if ((op === 'add' || op === 'mul') && b >= a && !push([a, b])) return null;
      }
    }
    return out;
  }
  for (const x of xs!) {
    if (op === 'sub') {
      // scăderi cu x „din numere până la upTo”; dacă upTo ≤ x, mergem până la x + upTo
      const to = upTo > x ? upTo : x + upTo;
      for (let m = x + 1; m <= to; m++) if (!push([m, x])) return null;
      continue;
    }
    for (let n = op === 'add' ? 1 : 2; n <= upTo; n++) {
      const p: [number, number] = op === 'mul' ? [x, n] : op === 'div' ? [x * n, x] : [n, x];
      if (!push(p)) return null;
    }
  }
  return out;
}

function randomPair(cfg: OpConfig, rng: Rng): [number, number] {
  const { op, numbers, upTo } = cfg;
  const any = numbers.length === 0;
  const x = any ? 0 : rng.pick(numbers);
  const n = rng.int(2, Math.max(2, upTo));
  switch (op) {
    case 'mul':
      return any ? [rng.int(2, upTo), rng.int(2, upTo)] : [x, n];
    case 'div': {
      const d = any ? rng.int(2, 20) : x;
      return [d * n, d];
    }
    case 'add':
      return any ? [rng.int(2, upTo), rng.int(2, upTo)] : [rng.int(1, upTo), x];
    case 'sub': {
      if (any) {
        const a = rng.int(3, upTo);
        return [a, rng.int(1, a - 1)];
      }
      const to = upTo > x ? upTo : x + upTo;
      return [rng.int(x + 1, to), x];
    }
  }
}

/**
 * Sursa de perechi: la configurații mici trece prin toate combinațiile înainte să repete,
 * la cele mari alege aleator și evită repetițiile recente.
 */
export class OpDeck {
  private deck: [number, number][] = [];
  private recent: string[] = [];
  private all: [number, number][] | null | undefined;

  constructor(
    private cfg: OpConfig,
    private rng: Rng,
  ) {}

  /** Câte combinații distincte are configurația (aproximativ, dacă sunt foarte multe). */
  size(): number {
    if (this.all === undefined) this.all = enumerate(this.cfg);
    if (this.all) return this.all.length;
    const { op, numbers, upTo } = this.cfg;
    if (numbers.length === 0) return op === 'div' ? 19 * upTo : op === 'sub' ? (upTo * upTo) / 2 : (upTo * upTo) / 2;
    return numbers.length * upTo;
  }

  next(): [number, number] {
    if (this.cfg.pairs?.length) {
      if (!this.deck.length) this.deck = this.rng.shuffle(this.cfg.pairs);
      return this.deck.shift()!;
    }
    if (this.all === undefined) this.all = enumerate(this.cfg);
    if (this.all) {
      if (!this.deck.length) this.deck = this.rng.shuffle(this.all);
      return this.deck.shift()!;
    }
    for (let i = 0; i < 30; i++) {
      let p = randomPair(this.cfg, this.rng);
      // numerele rotunde sunt prea ușoare la intervale mari: le rărim
      if (p.some((v) => v % 10 === 0 && v > 10) && this.rng.chance(0.6)) p = randomPair(this.cfg, this.rng);
      const key = opKey(this.cfg.op, ...p);
      if (this.recent.includes(key)) continue;
      this.recent = [...this.recent.slice(-60), key];
      return p;
    }
    return randomPair(this.cfg, this.rng);
  }
}
