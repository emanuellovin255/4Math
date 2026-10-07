import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createRng } from './rng';
import { fmt, fmtPeriodic, parseInput, prettyInput } from './format';
import { matchesValue } from './checker';
import { buildProblem } from './problem';
import { newFactState, reviewFact, DAY } from './srs';
import { RATING, updateRating } from './rating';
import { Session } from './session';
import { emptyProgress } from './progress';
import { SKILLS } from '../data/curriculum';
import type { Core, Step } from './types';
import { parseFracKey } from './generators/facts/fracPercent';

const STRATEGIES = SKILLS.filter((s) => s.kind === 'strategy');
const FACTS = SKILLS.filter((s) => s.kind === 'fact');
const DIFFICULTIES = Array.from({ length: 11 }, (_, i) => i / 10);
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

/** Evaluează o expresie afișată („47 × 18”, „10.000 − 3745”, „17²”, „√289”). */
function evalExpr(expr: string): number | null {
  let s = expr.trim();
  if (!/^[\d.,\s×÷+−²³√∛]+$/.test(s)) return null;
  s = s
    .replace(/(\d)\.(?=\d{3}\b)/g, '$1')
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/(\d+(?:\.\d+)?)²/g, '($1**2)')
    .replace(/(\d+(?:\.\d+)?)³/g, '($1**3)')
    .replace(/√(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)')
    .replace(/∛(\d+(?:\.\d+)?)/g, 'Math.cbrt($1)');
  return Function(`"use strict"; return (${s});`)() as number;
}

/** Verifică o ecuație cu necunoscută: „7 × ? = 56”. */
function checkMissing(prompt: string, value: number): boolean {
  const [lhs, rhs] = prompt.replace('?', fmt(value)).split('=');
  const l = evalExpr(lhs);
  const r = evalExpr(rhs);
  return l !== null && r !== null && Math.abs(l - r) < 1e-6;
}

function checkSteps(steps: Step[], value: number) {
  const valued = steps.filter((s) => s.value !== undefined);
  expect(valued.length).toBeGreaterThan(0);
  expect(near(valued.at(-1)!.value!, value)).toBe(true);
  for (const st of valued) {
    expect(Number.isFinite(st.value)).toBe(true);
    const ev = evalExpr(st.expr);
    if (ev !== null) expect(Math.abs(ev - st.value!)).toBeLessThan(1e-6);
  }
}

function checkStrategyCore(core: Core) {
  expect(Number.isFinite(core.value)).toBe(true);
  expect(core.value).toBeGreaterThan(0);
  // valori „curate”: cel mult 3 zecimale, fără artefacte de virgulă mobilă
  expect(Math.abs(core.value * 1000 - Math.round(core.value * 1000))).toBeLessThan(1e-6);
  if (core.input === 'int') expect(Number.isInteger(core.value)).toBe(true);
  const ev = evalExpr(core.prompt);
  expect(ev).not.toBeNull();
  expect(Math.abs(ev! - core.value)).toBeLessThan(1e-6);
  checkSteps(core.steps, core.value);
}

describe('format', () => {
  it('formatează românește', () => {
    expect(fmt(19700)).toBe('19.700');
    expect(fmt(1225)).toBe('1225');
    expect(fmt(7.8)).toBe('7,8');
    expect(fmt(0.1 + 0.2)).toBe('0,3');
    expect(fmt(-5)).toBe('−5');
    expect(fmt(1234567)).toBe('1.234.567');
  });
  it('scrie perioadele', () => {
    expect(fmtPeriodic(1, 3)).toBe('0,(3)');
    expect(fmtPeriodic(5, 12)).toBe('0,41(6)');
    expect(fmtPeriodic(100, 3)).toBe('33,(3)');
    expect(fmtPeriodic(300, 8)).toBe('37,5');
    expect(fmtPeriodic(100, 4)).toBe('25');
  });
  it('parsează inputul', () => {
    expect(parseInput('37,5')?.value).toBe(37.5);
    expect(parseInput('37.5')?.value).toBe(37.5);
    expect(parseInput('3/8')).toEqual({ value: 0.375, fraction: { n: 3, d: 8 } });
    expect(parseInput('−12')?.value).toBe(-12);
    expect(parseInput('')).toBeNull();
    expect(parseInput(',')).toBeNull();
    expect(parseInput('3/')).toBeNull();
    expect(prettyInput('19700')).toBe('19.700');
    expect(prettyInput('37,5')).toBe('37,5');
  });
});

describe('checker', () => {
  it('acceptă forme echivalente', () => {
    expect(matchesValue('37,5', 37.5)).toBe(true);
    expect(matchesValue('37.5', 37.5)).toBe(true);
    expect(matchesValue('37,50', 37.5)).toBe(true);
    expect(matchesValue('37', 37.5)).toBe(false);
    expect(matchesValue('0,375', 3 / 8)).toBe(true);
  });
  it('cere fracție ireductibilă când e cazul', () => {
    expect(matchesValue('3/8', 0.375, { requireFraction: true })).toBe(true);
    expect(matchesValue('6/16', 0.375, { requireFraction: true })).toBe(false);
    expect(matchesValue('0,375', 0.375, { requireFraction: true })).toBe(false);
  });
  it('respectă toleranța la rotunjire', () => {
    expect(matchesValue('33,3', 100 / 3, { tolerance: 0.05 })).toBe(true);
    expect(matchesValue('33,33', 100 / 3, { tolerance: 0.05 })).toBe(true);
    expect(matchesValue('33', 100 / 3, { tolerance: 0.05 })).toBe(false);
    expect(matchesValue('33,4', 100 / 3, { tolerance: 0.05 })).toBe(false);
  });
});

describe('generatoare de strategii', () => {
  for (const skill of STRATEGIES) {
    it(`${skill.id}: răspuns corect și pași consistenți pe orice seed și dificultate`, () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), fc.constantFrom(...DIFFICULTIES), (seed, d) => {
          checkStrategyCore(skill.generate!(createRng(seed), d));
        }),
        { numRuns: 2500 },
      );
    });

    it(`${skill.id}: are varietate (multe probleme distincte)`, () => {
      // la nivel mic spațiul e natural mai mic (ex. 100 − n are doar 81 de forme); crește cu nivelul
      const minDistinct: [number, number][] = [
        [0.1, 60],
        [0.5, 150],
        [0.9, 250],
      ];
      for (const [d, min] of minDistinct) {
        const rng = createRng(1234 + Math.round(d * 100));
        const keys = new Set<string>();
        for (let i = 0; i < 1000; i++) keys.add(skill.generate!(rng, d).key);
        expect(keys.size, `${skill.id} @ ${d}`).toBeGreaterThan(min);
      }
    });
  }
});

describe('fapte', () => {
  for (const skill of FACTS) {
    it(`${skill.id}: fiecare fapt și fiecare variantă e corect`, () => {
      const rng = createRng(7);
      expect(new Set(skill.facts).size).toBe(skill.facts!.length);
      for (const key of skill.facts!) {
        const core = skill.coreForFact!(key, rng);
        for (const c of [core, ...(core.variants ?? [])]) {
          expect(Number.isFinite(c.value)).toBe(true);
          if (key.startsWith('fp:')) {
            const [n, d] = parseFracKey(key);
            const ok = [n / d, (100 * n) / d].some((v) => near(v, c.value));
            expect(ok, `${key} ${c.prompt}`).toBe(true);
          } else if (c.prompt.includes('?')) {
            expect(checkMissing(c.prompt, c.value), c.prompt).toBe(true);
          } else {
            const ev = evalExpr(c.prompt);
            expect(ev, c.prompt).not.toBeNull();
            expect(Math.abs(ev! - c.value)).toBeLessThan(1e-6);
          }
          checkSteps(c.steps, c.value);
        }
      }
    });
  }

  it('benzile tablei nu se suprapun și acoperă 2–20', () => {
    const all = FACTS.filter((s) => s.id.startsWith('facts.mul')).flatMap((s) => s.facts!);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe((19 * 20) / 2); // perechi a ≤ b din 2..20
  });
});

describe('șabloane de prezentare', () => {
  it('produc probleme valide pentru toate abilitățile', () => {
    const rng = createRng(99);
    const templates = ['direct', 'variant', 'choice', 'truefalse', 'compare'] as const;
    for (const skill of SKILLS) {
      for (const t of templates) {
        for (let i = 0; i < 40; i++) {
          const p = buildProblem(skill, rng, { difficulty: i / 40, templates: { [t]: 1 } });
          expect(p.targetMs).toBeGreaterThan(0);
          expect(p.answerText.length).toBeGreaterThan(0);
          if (p.input === 'choice') {
            expect(p.choices!.length).toBeGreaterThanOrEqual(2);
            expect(new Set(p.choices).size).toBe(p.choices!.length);
            expect(p.correctChoice).toBeGreaterThanOrEqual(0);
            expect(p.correctChoice).toBeLessThan(p.choices!.length);
          } else {
            expect(p.value).toBeDefined();
          }
          if (p.template === 'compare') {
            const [a, b] = p.steps.map((s) => s.value!);
            expect(p.correctChoice).toBe(a > b ? 0 : 1);
          }
        }
      }
    }
  });
});

describe('repetiție spațiată', () => {
  const now = 1_000_000_000_000;
  const base = newFactState('mul:7:8', 'facts.mul-2-10', now);
  it('un fapt știut din prima sare în cutia 2', () => {
    expect(reviewFact(base, { correct: true, rtMs: 900, targetMs: 2000, now }).box).toBe(2);
  });
  it('greșit → cutia 0, scadent imediat', () => {
    const s = reviewFact({ ...base, box: 3, seen: 5 }, { correct: false, rtMs: 900, targetMs: 2000, now });
    expect(s.box).toBe(0);
    expect(s.dueAt).toBe(now);
    expect(s.lapses).toBe(1);
  });
  it('corect dar lent nu promovează', () => {
    const s = reviewFact({ ...base, box: 2, seen: 3, dueAt: now }, { correct: true, rtMs: 5000, targetMs: 2000, now });
    expect(s.box).toBe(2);
    const s0 = reviewFact({ ...base, seen: 1 }, { correct: true, rtMs: 5000, targetMs: 2000, now });
    expect(s0.box).toBe(1);
  });
  it('promovează doar dacă e scadent', () => {
    const notDue = { ...base, box: 2, seen: 3, dueAt: now + 2 * DAY };
    expect(reviewFact(notDue, { correct: true, rtMs: 500, targetMs: 2000, now }).box).toBe(2);
    const due = { ...notDue, dueAt: now - 1 };
    expect(reviewFact(due, { correct: true, rtMs: 500, targetMs: 2000, now }).box).toBe(3);
  });
});

describe('dificultate adaptivă', () => {
  it('converge spre ~80% răspunsuri corecte și rapide', () => {
    const rng = createRng(5);
    // un elev simulat: probabilitatea de succes scade liniar cu dificultatea
    const pSuccess = (d: number) => Math.min(0.99, Math.max(0.05, 1 - 0.9 * d));
    let r: number = RATING.start;
    let ok = 0;
    let total = 0;
    for (let i = 0; i < 20000; i++) {
      const success = rng.chance(pSuccess(r));
      r = updateRating(r, success, success ? 1000 : 3000, 2000);
      if (i > 5000) {
        total++;
        if (success) ok++;
      }
    }
    expect(ok / total).toBeGreaterThan(0.75);
    expect(ok / total).toBeLessThan(0.85);
  });
});

describe('sesiunea zilnică', () => {
  it('parcurge toate segmentele, introduce fapte noi și reia greșelile', () => {
    const progress = emptyProgress();
    const session = new Session(
      { mode: 'today', durationMs: 10 * 60_000, seed: 42 },
      progress,
      { paceFactor: 1, maxLearning: 8 },
    );
    const rng = createRng(1);
    const segments = new Set<string>();
    const kinds = new Set<string>();
    let t = 0;
    let problems = 0;
    let wrongKey: string | undefined;
    let sawRequeue = false;
    for (let guard = 0; guard < 2000; guard++) {
      const item = session.next(t);
      if (!item) break;
      kinds.add(item.type);
      if (item.type !== 'problem') {
        t += 2000;
        continue;
      }
      problems++;
      if (item.segment) segments.add(item.segment);
      if (wrongKey && item.problem.factKey === wrongKey) sawRequeue = true;
      const correct = rng.chance(0.85);
      if (!correct && item.problem.factKey && !wrongKey) wrongKey = item.problem.factKey;
      session.record(item, correct, 1500, Date.now());
      t += 4000;
    }
    expect([...segments].sort()).toEqual(['facts', 'focus', 'mix', 'warmup']);
    expect(kinds.has('banner')).toBe(true);
    expect(kinds.has('lesson')).toBe(true);
    expect(problems).toBeGreaterThan(100);
    expect(progress.facts.size).toBeGreaterThan(5);
    expect(sawRequeue).toBe(true);
  });

  it('modul practică se oprește după numărul cerut', () => {
    const session = new Session(
      { mode: 'practice', skillIds: ['decomp.compensate-mul', 'facts.squares-1-30'], count: 15, seed: 3 },
      emptyProgress(),
      { paceFactor: 1, maxLearning: 8 },
    );
    let n = 0;
    for (let item = session.next(0); item; item = session.next(0)) {
      if (item.type === 'problem') {
        session.record(item, true, 1000);
        n++;
      }
    }
    expect(n).toBe(15);
  });
});

describe('rubrica Înmulțiri', () => {
  it('respectă tabela și limita, iar pașii duc la rezultat', async () => {
    const { MulDeck, multiplyCore } = await import('./generators/multiply');
    for (const [tables, upTo] of [
      [[7], 10],
      [[7], 100],
      [[3, 17], 1000],
      [[25], 50],
    ] as [number[], number][]) {
      const rng = createRng(upTo);
      const deck = new MulDeck({ tables, upTo }, rng);
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) {
        const [t, n] = deck.next();
        expect(tables).toContain(t);
        expect(n).toBeGreaterThanOrEqual(2);
        expect(n).toBeLessThanOrEqual(upTo);
        const core = multiplyCore(t, n, rng);
        expect(evalExpr(core.prompt)).toBe(t * n);
        checkSteps(core.steps, t * n);
        seen.add(core.key);
      }
      // la intervale mici trec toate combinațiile înainte de repetare
      if (tables.length * (upTo - 1) <= 400) expect(seen.size).toBe(tables.length * (upTo - 1));
    }
  });
});
