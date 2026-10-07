import type { Rng } from '../rng';
import type { Core, Step } from '../types';
import { TIMES, fmt } from '../format';
import { mulHint } from './facts/mulTable';

/** Configurația rubricii „Înmulțiri”: ce tabele și până la ce număr. */
export interface MulConfig {
  tables: number[];
  upTo: number;
  /** Repetă exact aceste perechi (ex. greșelile din sesiunea trecută). */
  pairs?: [number, number][];
}

export const cmulKey = (table: number, n: number) => `cmul:${table}:${n}`;

export function parseCmulKey(key: string): [number, number] | null {
  const m = /^cmul:(\d+):(\d+)$/.exec(key);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** Dificultatea (pentru timpul-țintă) după cât de mari sunt numerele. */
export function mulDifficulty(upTo: number): number {
  if (upTo <= 10) return 0;
  if (upTo <= 20) return 0.15;
  if (upTo <= 100) return 0.45;
  return 0.8;
}

/** Pașii de rezolvare: la numere mici un truc cunoscut, la numere mari desparți pe ordine. */
export function multiplySteps(a: number, b: number): Step[] {
  const small = Math.min(a, b);
  const big = Math.max(a, b);
  if (big <= 20) return mulHint(a, b);
  const parts = String(big)
    .split('')
    .map((dg, i, arr) => Number(dg) * 10 ** (arr.length - 1 - i))
    .filter((p) => p > 0);
  if (parts.length === 1) {
    const zeros = big / Number(String(big)[0]);
    const lead = big / zeros;
    return [
      { expr: `${small} ${TIMES} ${lead}`, value: small * lead },
      { expr: `${fmt(small * lead)} ${TIMES} ${fmt(zeros)}`, value: small * big, note: 'adaugi zerourile' },
    ];
  }
  const steps: Step[] = parts.map((p, i) => ({
    expr: `${small} ${TIMES} ${fmt(p)}`,
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

export function multiplyCore(table: number, n: number, rng: Rng): Core {
  const value = table * n;
  // de obicei tabela aleasă e prima (7 × 54), uneori invers, ca să nu fie mecanic
  const prompt = rng.chance(0.75) ? `${table} ${TIMES} ${fmt(n)}` : `${fmt(n)} ${TIMES} ${table}`;
  return {
    key: cmulKey(table, n),
    prompt,
    value,
    input: 'int',
    steps: multiplySteps(table, n),
    errors: [value + table, value - table, value + 10, value - 10].filter((v) => v > 0),
  };
}

/**
 * Sursa de perechi: la intervale mici trece prin toate combinațiile înainte să repete,
 * la intervale mari alege aleator și evită repetițiile recente.
 */
export class MulDeck {
  private deck: [number, number][] = [];
  private recent: string[] = [];
  private readonly total: number;

  constructor(
    private cfg: MulConfig,
    private rng: Rng,
  ) {
    this.total = cfg.tables.length * Math.max(1, cfg.upTo - 1);
  }

  next(): [number, number] {
    const { tables, upTo, pairs } = this.cfg;
    if (pairs?.length) {
      if (!this.deck.length) this.deck = this.rng.shuffle(pairs);
      return this.deck.shift()!;
    }
    if (this.total <= 3000) {
      if (!this.deck.length) {
        const all: [number, number][] = [];
        for (const t of tables) for (let n = 2; n <= upTo; n++) all.push([t, n]);
        this.deck = this.rng.shuffle(all);
      }
      return this.deck.shift()!;
    }
    for (let i = 0; i < 30; i++) {
      const t = this.rng.pick(tables);
      let n = this.rng.int(2, upTo);
      // multiplii de 10 sunt prea ușori la intervale mari: îi rărim
      if (n % 10 === 0 && upTo > 20 && this.rng.chance(0.7)) n = this.rng.int(2, upTo);
      const key = cmulKey(t, n);
      if (this.recent.includes(key)) continue;
      this.recent = [...this.recent.slice(-50), key];
      return [t, n];
    }
    return [this.rng.pick(tables), this.rng.int(2, upTo)];
  }
}
