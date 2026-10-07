import type { ModuleId, SkillDef, TemplateId } from '../engine/types';
import { type MulBandId, mulCore, mulFacts } from '../engine/generators/facts/mulTable';
import { cubeCore, cubeFacts, squareCore, squareFacts } from '../engine/generators/facts/powers';
import { fracCore, fracFacts } from '../engine/generators/facts/fracPercent';
import { generateDoubleHalf } from '../engine/generators/strategies/doubleHalf';
import { generateComplement } from '../engine/generators/strategies/complements';
import { generateRoundAdd } from '../engine/generators/strategies/roundAdd';
import { generateDistributive } from '../engine/generators/strategies/distributive';
import { generateCompensateMul } from '../engine/generators/strategies/compensateMul';
import { generateFriendly } from '../engine/generators/strategies/friendly';

export interface ModuleInfo {
  id: ModuleId;
  letter: string;
  title: string;
  description: string;
  available: boolean;
  /** Pentru modulele viitoare: ce vor conține. */
  preview?: string[];
}

export const MODULES: ModuleInfo[] = [
  {
    id: 'facts',
    letter: 'A',
    title: 'Automatisme',
    description: 'Fapte pe care le știi instant, fără să calculezi.',
    available: true,
  },
  {
    id: 'decomp',
    letter: 'B',
    title: 'Descompunere',
    description: 'Desfaci numerele în bucăți ușoare, nu calculezi „ca pe hârtie”.',
    available: true,
  },
  {
    id: 'patterns',
    letter: 'C',
    title: 'Tipare speciale',
    description: 'Scurtături pentru forme care apar des.',
    available: false,
    preview: ['35² = 3×4 | 25', '43 × 47 = 45² − 4', '97 × 94 = 91 | 18', '×11, ×99, ×101', '672 ÷ 16 prin factorizare'],
  },
  {
    id: 'estimate',
    letter: 'D',
    title: 'Estimare business',
    description: 'Aproape exact, în câteva secunde.',
    available: false,
    preview: ['19.700 × 7,8% ≈ 20.000 × 8%', 'TVA invers', 'Marjă vs. adaos', 'Regula lui 72', '+20% apoi −20% = −4%'],
  },
  {
    id: 'memory',
    letter: 'E',
    title: 'Memorie numerică',
    description: 'Ții rezultatele intermediare în minte.',
    available: false,
    preview: ['Lanțuri de operații', 'Flash anzan', 'Digit span', 'Proba cu 9'],
  },
];

const FACT_TEMPLATES: Partial<Record<TemplateId, number>> = { direct: 60, variant: 25, choice: 15 };
const STRATEGY_TEMPLATES: Partial<Record<TemplateId, number>> = { direct: 65, choice: 13, truefalse: 10, compare: 12 };
const BASIC_TEMPLATES: Partial<Record<TemplateId, number>> = { direct: 75, choice: 15, truefalse: 10 };

const mulBand = (id: MulBandId, title: string, target: number, prerequisites: string[], tips: string[]): SkillDef => ({
  id,
  module: 'facts',
  kind: 'fact',
  title,
  short: `${mulFacts(id).length} produse de automatizat`,
  prerequisites,
  facts: mulFacts(id),
  coreForFact: mulCore,
  templates: FACT_TEMPLATES,
  targetMs: () => target,
  lesson: {
    paragraphs: [
      'Scopul nu e să poți calcula produsul, ci să-l vezi instant, cum îți citești numele.',
      'Un fapt urcă în nivel doar dacă răspunzi corect ȘI sub timpul-țintă. Faptele lente revin mai des.',
    ],
    tips,
  },
});

export const SKILLS: SkillDef[] = [
  // ───────────── A. Automatisme ─────────────
  mulBand('facts.mul-2-10', 'Tabla înmulțirii 2–10', 2000, [], [
    '×9 = ×10 − ×1   (7 × 9 = 70 − 7)',
    '×5 = ×10 ÷ 2   (8 × 5 = 80 ÷ 2)',
    '×4 = dublezi de două ori, ×8 = de trei ori',
  ]),
  mulBand('facts.mul-11-12', 'Tabla 11–12', 2500, ['facts.mul-2-10'], [
    '×11 = ×10 + ×1   (11 × 7 = 70 + 7)',
    '×12 = ×10 + ×2   (12 × 8 = 80 + 16)',
  ]),
  mulBand('facts.mul-13-15', 'Tabla 13–15', 3000, ['facts.mul-11-12'], [
    '13 × 7 = 10×7 + 3×7 = 70 + 21',
    '×15 = ×10 + jumătate din asta   (15 × 8 = 80 + 40)',
  ]),
  mulBand('facts.mul-16-20', 'Tabla 16–20', 3500, ['facts.mul-13-15'], [
    '18 × 17 = 18×10 + 18×7 = 180 + 126',
    '×19 = ×20 − ×1   (19 × 6 = 120 − 6)',
  ]),
  {
    id: 'facts.squares-1-30',
    module: 'facts',
    kind: 'fact',
    title: 'Pătrate până la 30²',
    short: 'De la 2² la 30², plus rădăcinile lor',
    prerequisites: [],
    facts: squareFacts(2, 30),
    coreForFact: (key) => squareCore(key),
    templates: FACT_TEMPLATES,
    targetMs: () => 2500,
    lesson: {
      paragraphs: [
        'Pătratele sunt ancore: multe calcule se reduc la un pătrat cunoscut plus o corecție.',
        'Terminate în 5: înmulțești zecile cu (zecile + 1) și lipești 25. 25² = 2×3 | 25 = 625.',
        'Restul: n² = (n − d)(n + d) + d², alegând d astfel încât un factor să fie rotund. 23² = 20 × 26 + 9 = 529.',
      ],
    },
  },
  {
    id: 'facts.squares-31-50',
    module: 'facts',
    kind: 'fact',
    title: 'Pătrate 31²–50²',
    short: 'Extinderea ancorelor până la 50²',
    prerequisites: ['facts.squares-1-30'],
    facts: squareFacts(31, 50),
    coreForFact: (key) => squareCore(key),
    templates: FACT_TEMPLATES,
    targetMs: () => 3500,
    lesson: {
      paragraphs: [
        'Lângă 50: 50² = 2500, iar (50 ± k)² = 2500 ± 100k + k². 47² = 2500 − 300 + 9 = 2209.',
        'Sau aceeași regulă: 47² = 50 × 44 + 3² = 2200 + 9.',
      ],
    },
  },
  {
    id: 'facts.cubes',
    module: 'facts',
    kind: 'fact',
    title: 'Cuburi până la 15³',
    short: 'De la 2³ la 15³, plus rădăcinile cubice',
    prerequisites: ['facts.squares-1-30'],
    facts: cubeFacts(),
    coreForFact: (key) => cubeCore(key),
    templates: FACT_TEMPLATES,
    targetMs: () => 3500,
    lesson: {
      paragraphs: [
        'n³ = n² × n. 13³ = 169 × 13 = 1690 + 507 = 2197.',
        'Rădăcina cubică exactă după ultima cifră: 2→8, 3→7, 7→3, 8→2, restul rămân la fel. ∛2197 se termină în 3 și e între 10 și 20, deci 13.',
      ],
    },
  },
  {
    id: 'facts.frac-percent',
    module: 'facts',
    kind: 'fact',
    title: 'Fracții ↔ procente',
    short: 'Jumătăți, treimi, optimi, douăzecimi… în %, zecimal și invers',
    prerequisites: [],
    facts: fracFacts(),
    coreForFact: fracCore,
    templates: FACT_TEMPLATES,
    targetMs: () => 3500,
    lesson: {
      paragraphs: [
        'Ține minte fracțiile unitare și construiești restul: n/d = n × (1/d).',
        '3/8 = 3 × 12,5% = 37,5%. 5/6 = 5 × 16,(6)% = 83,(3)%.',
      ],
      tips: [
        '1/2 = 50%   1/4 = 25%   1/5 = 20%',
        '1/3 = 33,(3)%   1/6 = 16,(6)%   1/9 = 11,(1)%',
        '1/8 = 12,5%   1/12 = 8,(3)%   1/16 = 6,25%   1/20 = 5%',
      ],
    },
  },
  {
    id: 'facts.double-half',
    module: 'facts',
    kind: 'strategy',
    title: 'Dublări și înjumătățiri',
    short: 'Pe bucăți, de la stânga la dreapta',
    prerequisites: [],
    generate: generateDoubleHalf,
    templates: BASIC_TEMPLATES,
    targetMs: (d) => 2500 + 2500 * d,
    lesson: {
      paragraphs: [
        'Lucrezi pe bucăți, de la stânga: 2 × 368 = 2×300 + 2×68 = 600 + 136 = 736.',
        'La jumătate alegi bucăți pare: 374 ÷ 2 = 300÷2 + 74÷2 = 150 + 37 = 187.',
        '×4 = dublezi de două ori, ÷4 = înjumătățești de două ori.',
      ],
    },
  },
  {
    id: 'facts.complements',
    module: 'facts',
    kind: 'strategy',
    title: 'Complemente',
    short: 'Cât lipsește până la 100, 1000 sau un număr rotund',
    prerequisites: [],
    generate: generateComplement,
    templates: BASIC_TEMPLATES,
    targetMs: (d) => 3000 + 3000 * d,
    lesson: {
      paragraphs: [
        'Până la 100, 1000, 10.000: fiecare cifră până la 9, ultima până la 10. 1000 − 367 → 6, 3, 3 → 633.',
        'Până la alt număr rotund: R − n = (R − 1 − n) + 1. 500 − 237 = 499 − 237 + 1 = 263, fără niciun împrumut.',
        'Asta e baza pentru calculul restului și pentru 998 + 467.',
      ],
    },
  },

  // ───────────── B. Descompunere ─────────────
  {
    id: 'decomp.round-add',
    module: 'decomp',
    kind: 'strategy',
    title: 'Rotunjire și compensare (+/−)',
    short: '998 + 467 = 1000 + 467 − 2',
    prerequisites: ['facts.complements'],
    generate: generateRoundAdd,
    templates: STRATEGY_TEMPLATES,
    targetMs: (d) => 5000 + 5000 * d,
    lesson: {
      paragraphs: [
        'Când un număr e aproape de unul rotund, calculezi cu numărul rotund și apoi corectezi diferența.',
        '998 + 467: 998 = 1000 − 2, deci 1000 + 467 = 1467, apoi − 2 = 1465.',
        'La scădere corecția merge invers: 645 − 198 = 645 − 200 + 2 = 447. Ai scăzut 2 în plus, deci îi adaugi înapoi.',
      ],
    },
  },
  {
    id: 'decomp.distributive',
    module: 'decomp',
    kind: 'strategy',
    title: 'Distributivitate',
    short: '47 × 6 = 40×6 + 7×6',
    prerequisites: ['facts.mul-2-10'],
    generate: generateDistributive,
    templates: STRATEGY_TEMPLATES,
    targetMs: (d) => 6000 + 9000 * d,
    lesson: {
      paragraphs: [
        'Desparți un factor în bucăți ușoare și aduni produsele parțiale, de la cel mai mare la cel mai mic.',
        '47 × 6 = 40×6 + 7×6 = 240 + 42 = 282.',
        '34 × 12 = 34×10 + 34×2 = 340 + 68 = 408.',
      ],
    },
  },
  {
    id: 'decomp.compensate-mul',
    module: 'decomp',
    kind: 'strategy',
    title: 'Compensare la înmulțire',
    short: '47 × 18 = 47 × 20 − 47 × 2',
    prerequisites: ['decomp.distributive'],
    generate: generateCompensateMul,
    templates: STRATEGY_TEMPLATES,
    targetMs: (d) => 7000 + 9000 * d,
    lesson: {
      paragraphs: [
        'Când un factor e aproape de un număr rotund, înmulțești cu numărul rotund și scazi (sau aduni) diferența.',
        '47 × 18: 18 = 20 − 2, deci 47×20 = 940, 47×2 = 94, 940 − 94 = 846.',
        '96 × 37: 96 = 100 − 4, deci 3700 − 148 = 3552.',
      ],
    },
  },
  {
    id: 'decomp.friendly',
    module: 'decomp',
    kind: 'strategy',
    title: 'Numere prietene',
    short: '125 × 48 = 1000 × 6',
    prerequisites: ['facts.double-half'],
    generate: generateFriendly,
    templates: STRATEGY_TEMPLATES,
    targetMs: (d) => 5000 + 6000 * d,
    lesson: {
      paragraphs: [
        'Perechi care dau numere rotunde: 5 × 2 = 10, 25 × 4 = 100, 125 × 8 = 1000. Rearanjezi factorii ca să le folosești.',
        '125 × 48 = 125 × 8 × 6 = 1000 × 6 = 6000.',
        'Scurtături: ×5 = ×10 ÷ 2, ×50 = ×100 ÷ 2, ×25 = ×100 ÷ 4, ×125 = ×1000 ÷ 8, ×15 = ×10 + jumătate.',
      ],
    },
  },
];

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): SkillDef {
  const s = SKILL_BY_ID[id];
  if (!s) throw new Error(`Abilitate necunoscută: ${id}`);
  return s;
}

/** Ordinea în care sesiunea zilnică introduce fapte noi (round-robin între abilitățile deblocate). */
export const FACT_INTAKE_ORDER = [
  'facts.mul-2-10',
  'facts.frac-percent',
  'facts.squares-1-30',
  'facts.mul-11-12',
  'facts.cubes',
  'facts.squares-31-50',
  'facts.mul-13-15',
  'facts.mul-16-20',
];

/** Strategiile din încălzire. */
export const WARMUP_SKILLS = ['facts.double-half', 'facts.complements'];

/** Ordinea strategiilor „de focus” din sesiunea zilnică. */
export const FOCUS_ORDER = ['decomp.round-add', 'decomp.distributive', 'decomp.compensate-mul', 'decomp.friendly'];
