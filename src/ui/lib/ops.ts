import type { Op, OpConfig } from '../../engine/generators/operations';
import { fmt } from '../../engine/format';

export const OP_NAMES: Record<Op, { title: string; with: string; limit: string; symbol: string; blurb: string }> = {
  add: { title: 'Adunări', with: 'Adunări cu', limit: 'Până la', symbol: '+', blurb: 'aduni pe bucăți, completezi până la zece' },
  sub: { title: 'Scăderi', with: 'Scăderi cu', limit: 'Din numere până la', symbol: '−', blurb: 'scazi pe bucăți, cobori până la rotund' },
  mul: { title: 'Înmulțiri', with: 'Înmulțiri cu', limit: 'Până la', symbol: '×', blurb: 'tabla, apoi numere mari pe ordine' },
  div: { title: 'Împărțiri', with: 'Împărțiri la', limit: 'Rezultat până la', symbol: '÷', blurb: 'înmulțirea pe dos, pe bucăți' },
};

export const OP_ORDER: Op[] = ['add', 'sub', 'mul', 'div'];

export function opLabel(cfg: OpConfig): string {
  const n = OP_NAMES[cfg.op];
  if (cfg.pairs?.length) return `${n.title} · greșelile tale`;
  const nums = cfg.numbers.length ? `${n.with.split(' ')[1]} ${cfg.numbers.join(', ')}` : 'oricare';
  return `${n.title} ${nums} · ${n.limit.toLowerCase()} ${fmt(cfg.upTo)}`;
}

export const opBestKey = (cfg: OpConfig) =>
  `best:op:${cfg.op}:${cfg.numbers.length ? [...cfg.numbers].sort((a, b) => a - b).join('+') : 'any'}:${cfg.upTo}`;
