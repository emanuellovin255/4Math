import type { Rng } from './rng';
import { fmt } from './format';

/** Inversează ultimele două cifre: 846 → 864 (greșeală tipică de transcriere). */
function swapLastDigits(v: number): number | null {
  if (!Number.isInteger(v) || v < 10) return null;
  const s = String(v);
  const sw = s.slice(0, -2) + s.at(-1) + s.at(-2);
  const out = Number(sw);
  return out === v ? null : out;
}

/**
 * Variante greșite plauzibile: întâi erorile specifice tehnicii, apoi erori generice
 * (±10, ±1, cifre inversate). Toate diferite de răspuns și între ele, pozitive dacă răspunsul e pozitiv.
 */
export function pickDistractors(value: number, specific: number[] = [], rng: Rng, count = 3): number[] {
  const isInt = Number.isInteger(value);
  const step = isInt ? 1 : value < 1 ? 0.01 : 0.5;
  const raw =
    isInt || value >= 1
      ? [value + 10, value - 10, value + step, value - step, value + 2 * step, swapLastDigits(value), value + 100, value - 9]
      : [value + step, value - step, value + 2 * step, value - 2 * step, value + 5 * step];
  const generic = rng.shuffle(raw.filter((v): v is number => v !== null).map((v) => Math.round(v * 1e6) / 1e6));
  const out: number[] = [];
  const seen = new Set([fmt(value)]);
  for (const c of [...rng.shuffle(specific), ...generic]) {
    if (!Number.isFinite(c)) continue;
    if (value >= 0 && c <= 0) continue;
    if (isInt && !Number.isInteger(c)) continue;
    const label = fmt(c);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(c);
    if (out.length === count) break;
  }
  return out;
}
