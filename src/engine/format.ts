// Format numeric românesc: virgulă zecimală, punct pentru mii (de la 10.000 în sus).
export const TIMES = '×';
export const MINUS = '−';
export const DIV = '÷';

export function fmt(x: number, maxDecimals = 6): string {
  if (!Number.isFinite(x)) return '?';
  const neg = x < 0;
  const fixed = Math.abs(x).toFixed(maxDecimals);
  let [intPart, decPart = ''] = fixed.split('.');
  decPart = decPart.replace(/0+$/, '');
  if (intPart.length >= 5) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const body = decPart ? `${intPart},${decPart}` : intPart;
  return neg && body !== '0' ? `${MINUS}${body}` : body;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

/** n/d ca zecimal cu perioadă în paranteze: 1/3 → "0,(3)", 5/12 → "0,41(6)". */
export function fmtPeriodic(n: number, d: number): string {
  if (d === 0) return '?';
  const neg = n * d < 0;
  n = Math.abs(n);
  d = Math.abs(d);
  const intPart = Math.floor(n / d);
  let rem = n % d;
  if (rem === 0) return (neg ? MINUS : '') + fmt(intPart);
  const digits: number[] = [];
  const seen = new Map<number, number>();
  while (rem !== 0 && !seen.has(rem) && digits.length < 30) {
    seen.set(rem, digits.length);
    rem *= 10;
    digits.push(Math.floor(rem / d));
    rem %= d;
  }
  let dec: string;
  if (rem === 0) dec = digits.join('');
  else {
    const start = seen.get(rem) ?? 0;
    dec = `${digits.slice(0, start).join('')}(${digits.slice(start).join('')})`;
  }
  return `${neg ? MINUS : ''}${fmt(intPart)},${dec}`;
}

/** Valoarea are reprezentare zecimală finită? (numitorul are doar factori 2 și 5) */
export function isTerminating(n: number, d: number): boolean {
  let q = d / gcd(n, d);
  while (q % 2 === 0) q /= 2;
  while (q % 5 === 0) q /= 5;
  return q === 1;
}

export interface ParsedInput {
  value: number;
  fraction?: { n: number; d: number };
}

/** Parsează ce a tastat utilizatorul: "37,5", "37.5", "−12", "3/8". */
export function parseInput(raw: string): ParsedInput | null {
  const s = raw.trim().replace(/\s/g, '').replace(MINUS, '-').replace(/%$/, '');
  if (!s) return null;
  if (s.includes('/')) {
    const m = /^(-?\d+)\/(\d+)$/.exec(s);
    if (!m) return null;
    const n = Number(m[1]);
    const d = Number(m[2]);
    if (d === 0) return null;
    return { value: n / d, fraction: { n, d } };
  }
  if (!/^-?\d*([.,]\d*)?$/.test(s) || /^-?[.,]?$/.test(s)) return null;
  const value = Number(s.replace(',', '.'));
  return Number.isFinite(value) ? { value } : null;
}

/** Afișează textul tastat cu separatori ro-RO (fără să schimbe ce a introdus utilizatorul). */
export function prettyInput(raw: string): string {
  const m = /^(-?)(\d*)(,?)(\d*)$/.exec(raw.replace(MINUS, '-'));
  if (!m) return raw.replace('-', MINUS);
  let [, sign, intPart, comma, dec] = m;
  if (intPart.length >= 5) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign ? MINUS : ''}${intPart}${comma}${dec}`;
}
