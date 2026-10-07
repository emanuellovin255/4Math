// PRNG determinist (mulberry32): aceeași sămânță → aceeași secvență de probleme.
export interface Rng {
  readonly seed: number;
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
  shuffle<T>(items: readonly T[]): T[];
  weighted<K extends string>(weights: Partial<Record<K, number>>): K;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    seed,
    next,
    int,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick() pe listă goală');
      return items[Math.floor(next() * items.length)];
    },
    chance: (p) => next() < p,
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    weighted: (weights) => {
      const entries = Object.entries(weights) as [string, number][];
      const total = entries.reduce((s, [, w]) => s + Math.max(0, w), 0);
      if (total <= 0) throw new Error('weighted() fără ponderi pozitive');
      let r = next() * total;
      for (const [k, w] of entries) {
        r -= Math.max(0, w);
        if (r < 0) return k as never;
      }
      return entries[entries.length - 1][0] as never;
    },
  };
}

export function randomSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

/** Dificultatea efectivă: nivelul cerut plus o mică variație, ca problemele să nu fie uniforme. */
export function jitter(rng: Rng, d: number, spread = 0.12): number {
  const noise = (rng.next() + rng.next() - 1) * spread;
  return Math.min(1, Math.max(0, d + noise));
}

/** Întreg aleator cu exact `digits` cifre, opțional fără 0 la final. */
export function intWithDigits(rng: Rng, digits: number, noTrailingZero = true): number {
  const min = digits === 1 ? 2 : 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  for (;;) {
    const n = rng.int(min, max);
    if (!noTrailingZero || n % 10 !== 0) return n;
  }
}
