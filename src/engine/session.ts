import { type Rng, createRng } from './rng';
import type { Problem, SkillDef, TemplateId } from './types';
import { buildProblem } from './problem';
import { RecentKeys } from './recent';
import { type FactState, newFactState, reviewFact } from './srs';
import { type SkillState, applySkillResult } from './rating';
import { type Progress, factSummary, isPracticed, isUnlocked, skillStateOf } from './progress';
import { FACT_INTAKE_ORDER, FOCUS_ORDER, SKILLS, WARMUP_SKILLS, getSkill } from '../data/curriculum';

export type SessionMode = 'today' | 'practice' | 'sprint' | 'guided' | 'mistakes';
export type SegmentId = 'warmup' | 'facts' | 'focus' | 'mix';

export interface MistakeItem {
  skillId: string;
  factKey?: string;
  difficulty: number;
}

export interface SessionConfig {
  mode: SessionMode;
  skillIds?: string[];
  /** practice / guided: numărul de probleme (0 = până oprești tu). */
  count?: number;
  /** today / sprint: durata în ms. */
  durationMs?: number;
  mistakes?: MistakeItem[];
  seed: number;
}

export interface SessionSettings {
  paceFactor: number;
  maxLearning: number;
}

export type SessionItem =
  | { type: 'banner'; title: string; subtitle?: string }
  | { type: 'lesson'; skillId: string }
  | { type: 'problem'; problem: Problem; guided: boolean; segment?: SegmentId };

export interface RecordResult {
  fact?: FactState;
  skill: SkillState;
  newFact: boolean;
}

export const SPRINT_TEMPLATES: Partial<Record<TemplateId, number>> = { direct: 75, variant: 10, choice: 8, truefalse: 7 };
const GUIDED_TEMPLATES: Partial<Record<TemplateId, number>> = { direct: 1 };
const NO_COMPARE = (skill: SkillDef) => ({ ...skill.templates, compare: 0 });

const SEGMENTS: { id: SegmentId; share: number }[] = [
  { id: 'warmup', share: 0.1 },
  { id: 'facts', share: 0.4 },
  { id: 'focus', share: 0.35 },
  { id: 'mix', share: 0.15 },
];

/** Strategia de focus: prima din programă, deblocată și încă nestăpânită. */
export function chooseFocus(p: Progress): string {
  const below = (id: string) => skillStateOf(p, id).rating < 0.6;
  const unlocked = FOCUS_ORDER.filter((id) => isUnlocked(p, getSkill(id)));
  return (
    unlocked.find(below) ??
    FOCUS_ORDER.find(below) ??
    [...FOCUS_ORDER].sort((a, b) => skillStateOf(p, a).rating - skillStateOf(p, b).rating)[0]
  );
}

export function dueFacts(p: Progress, now: number): FactState[] {
  return [...p.facts.values()].filter((s) => s.dueAt <= now).sort((a, b) => a.box - b.box || a.dueAt - b.dueAt);
}

export function practicedSkillIds(p: Progress): string[] {
  return SKILLS.filter((s) => isPracticed(p, s)).map((s) => s.id);
}

export class Session {
  readonly rng: Rng;
  readonly focusSkillId: string;
  private served = 0;
  private pending: SessionItem[] = [];
  private requeue: { at: number; item: () => SessionItem }[] = [];
  private factQueue: string[];
  private lastFacts: string[] = [];
  private segment: SegmentId | null = null;
  private intakeRR = 0;
  private cycle: string[] = [];
  private mistakes: MistakeItem[];

  constructor(
    readonly cfg: SessionConfig,
    readonly progress: Progress,
    readonly settings: SessionSettings,
    readonly recent: RecentKeys = new RecentKeys(),
    now = Date.now(),
  ) {
    this.rng = createRng(cfg.seed);
    this.focusSkillId = chooseFocus(progress);
    this.factQueue = dueFacts(progress, now).map((s) => s.factKey);
    this.mistakes = cfg.mistakes?.slice() ?? [];
  }

  get servedCount() {
    return this.served;
  }

  get currentSegment() {
    return this.segment;
  }

  /** Următorul element sau null când sesiunea s-a terminat. */
  next(elapsedMs: number): SessionItem | null {
    const { mode, durationMs = 0, count = 0 } = this.cfg;
    if ((mode === 'today' || mode === 'sprint') && elapsedMs >= durationMs) return null;
    if ((mode === 'practice' || mode === 'guided') && count > 0 && this.served >= count && !this.pending.length) {
      return null;
    }

    if (this.pending.length) return this.serve(this.pending.shift()!);

    const due = this.requeue.findIndex((r) => r.at <= this.served);
    if (due >= 0) return this.serve(this.requeue.splice(due, 1)[0].item());

    switch (mode) {
      case 'today':
        return this.nextToday(elapsedMs);
      case 'practice':
        return this.serve(this.problemFor(this.nextFromCycle()));
      case 'sprint':
        return this.serve(this.problemFor(this.nextFromCycle(), { templates: SPRINT_TEMPLATES }));
      case 'guided':
        return this.serve(this.problemFor(this.cfg.skillIds?.[0] ?? this.focusSkillId, { guided: true }));
      case 'mistakes': {
        const m = this.mistakes.shift();
        if (!m) {
          return this.requeue.length ? this.serve(this.requeue.shift()!.item()) : null;
        }
        return this.serve(this.problemFor(m.skillId, { factKey: m.factKey, difficulty: m.difficulty }));
      }
    }
  }

  /** Aplică rezultatul unui răspuns: repetiție spațiată, nivel, reluarea greșelilor. */
  record(item: Extract<SessionItem, { type: 'problem' }>, correct: boolean, rtMs: number, now = Date.now()): RecordResult {
    const { problem, guided } = item;
    const skill = getSkill(problem.skillId);
    let fact: FactState | undefined;
    let newFact = false;

    if (problem.factKey) {
      const prev = this.progress.facts.get(problem.factKey);
      newFact = !prev;
      if (!guided) {
        fact = reviewFact(prev ?? newFactState(problem.factKey, skill.id, now), {
          correct,
          rtMs,
          targetMs: problem.targetMs,
          now,
        });
        this.progress.facts.set(problem.factKey, fact);
      }
      this.lastFacts = [...this.lastFacts.slice(-4), problem.factKey];
    }

    const skillState = applySkillResult(skillStateOf(this.progress, skill.id), {
      correct,
      rtMs,
      targetMs: problem.targetMs,
      now,
      adjustRating: skill.kind === 'strategy' && !guided,
    });
    this.progress.skills.set(skill.id, skillState);

    // greșeala revine peste 2–3 itemi: același fapt, sau aceeași strategie cu alte numere
    if (!correct && this.cfg.mode !== 'sprint') {
      const at = this.served + 2 + this.rng.int(0, 1);
      const factKey = problem.factKey;
      const difficulty = problem.difficulty;
      this.requeue.push({
        at,
        item: () =>
          this.problemFor(skill.id, {
            factKey,
            difficulty,
            guided,
            templates: guided ? GUIDED_TEMPLATES : { direct: 1, variant: factKey ? 1 : 0 },
            segment: item.segment,
          }),
      });
    }

    return { fact, skill: skillState, newFact };
  }

  // ───────────────────────── interne ─────────────────────────

  private serve(item: SessionItem): SessionItem {
    if (item.type === 'problem') {
      this.served++;
      if (!item.problem.factKey) this.recent.add(item.problem.key);
    }
    return item;
  }

  private problemFor(
    skillId: string,
    opts: {
      guided?: boolean;
      factKey?: string;
      difficulty?: number;
      templates?: Partial<Record<TemplateId, number>>;
      segment?: SegmentId;
    } = {},
  ): SessionItem {
    const skill = getSkill(skillId);
    const factKey = skill.kind === 'fact' ? (opts.factKey ?? this.pickFact(skill)) : undefined;
    const difficulty = opts.difficulty ?? (skill.kind === 'strategy' ? skillStateOf(this.progress, skillId).rating : 0);
    const problem = buildProblem(skill, this.rng, {
      difficulty,
      factKey,
      templates: opts.guided ? GUIDED_TEMPLATES : opts.templates,
      paceFactor: this.settings.paceFactor,
      recent: this.recent,
    });
    return { type: 'problem', problem, guided: !!opts.guided, segment: opts.segment };
  }

  private nextFromCycle(): string {
    const ids = this.cfg.skillIds?.length ? this.cfg.skillIds : this.defaultMix();
    if (!this.cycle.length) this.cycle = this.rng.shuffle(ids);
    return this.cycle.shift()!;
  }

  private defaultMix(): string[] {
    const practiced = practicedSkillIds(this.progress);
    return practiced.length ? practiced : ['facts.mul-2-10', 'facts.double-half', 'facts.complements'];
  }

  /** Fapt pentru practică liberă: cele slabe și scadente au prioritate, iar cele noi intră treptat. */
  private pickFact(skill: SkillDef): string {
    const now = Date.now();
    const facts = skill.facts ?? [];
    const candidates = facts.filter((k) => !this.lastFacts.includes(k));
    const pool = candidates.length ? candidates : facts;
    const weights = pool.map((k) => {
      const s = this.progress.facts.get(k);
      if (!s) return 3;
      const base = [6, 4, 2, 1, 0.5, 0.4][s.box] ?? 0.4;
      return s.dueAt <= now ? base * 1.5 : base;
    });
    let r = this.rng.next() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r < 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  private nextToday(elapsedMs: number): SessionItem | null {
    const duration = this.cfg.durationMs ?? 1;
    const frac = elapsedMs / duration;
    let acc = 0;
    let seg: SegmentId = 'mix';
    for (const s of SEGMENTS) {
      acc += s.share;
      if (frac < acc) {
        seg = s.id;
        break;
      }
    }

    if (seg !== this.segment) {
      this.segment = seg;
      this.pending.push(this.bannerFor(seg));
      if (seg === 'focus' && skillStateOf(this.progress, this.focusSkillId).attempts === 0) {
        this.pending.push({ type: 'lesson', skillId: this.focusSkillId });
        for (let i = 0; i < 3; i++) {
          this.pending.push(this.problemFor(this.focusSkillId, { guided: true, segment: 'focus' }));
        }
      }
      return this.serve(this.pending.shift()!);
    }

    switch (seg) {
      case 'warmup':
        return this.serve(this.problemFor(WARMUP_SKILLS[this.served % WARMUP_SKILLS.length], { segment: seg }));
      case 'facts':
        return this.serve(this.nextFactItem(seg));
      case 'focus':
        return this.serve(this.problemFor(this.focusSkillId, { segment: seg }));
      case 'mix': {
        const strategies = SKILLS.filter(
          (s) => s.kind === 'strategy' && s.id !== this.focusSkillId && isPracticed(this.progress, s),
        ).map((s) => s.id);
        const factSkills = SKILLS.filter((s) => s.kind === 'fact' && isPracticed(this.progress, s)).map((s) => s.id);
        if (strategies.length && (this.rng.chance(0.65) || !factSkills.length)) {
          const id = this.rng.pick(strategies);
          return this.serve(this.problemFor(id, { segment: seg, templates: NO_COMPARE(getSkill(id)) }));
        }
        if (factSkills.length) return this.serve(this.problemFor(this.rng.pick(factSkills), { segment: seg }));
        return this.serve(this.problemFor(this.focusSkillId, { segment: seg }));
      }
    }
  }

  private bannerFor(seg: SegmentId): SessionItem {
    switch (seg) {
      case 'warmup':
        return { type: 'banner', title: 'Încălzire', subtitle: 'Dublări, înjumătățiri și complemente' };
      case 'facts': {
        const n = this.factQueue.length;
        return {
          type: 'banner',
          title: 'Automatisme',
          subtitle: n ? `${n} ${n === 1 ? 'fapt scadent' : 'fapte scadente'} + fapte noi` : 'Fapte noi și consolidare',
        };
      }
      case 'focus': {
        const s = getSkill(this.focusSkillId);
        return { type: 'banner', title: s.title, subtitle: s.short };
      }
      case 'mix':
        return { type: 'banner', title: 'Mix', subtitle: 'Tu alegi metoda potrivită' };
    }
  }

  private learningCount(): number {
    let n = 0;
    for (const s of this.progress.facts.values()) if (s.box <= 1) n++;
    return n;
  }

  private nextNewFact(): { skillId: string; factKey: string } | null {
    const open = FACT_INTAKE_ORDER.map(getSkill).filter(
      (s) => isUnlocked(this.progress, s) && (s.facts ?? []).some((k) => !this.progress.facts.has(k)),
    );
    if (!open.length) return null;
    for (let i = 0; i < open.length; i++) {
      const skill = open[(this.intakeRR + i) % open.length];
      const key = (skill.facts ?? []).find((k) => !this.progress.facts.has(k) && !this.lastFacts.includes(k));
      if (key) {
        this.intakeRR = (this.intakeRR + i + 1) % open.length;
        return { skillId: skill.id, factKey: key };
      }
    }
    return null;
  }

  private nextFactItem(segment: SegmentId): SessionItem {
    while (this.factQueue.length) {
      const key = this.factQueue.shift()!;
      const s = this.progress.facts.get(key);
      if (s && !this.lastFacts.includes(key)) return this.problemFor(s.skillId, { factKey: key, segment });
    }
    if (this.learningCount() < this.settings.maxLearning) {
      const fresh = this.nextNewFact();
      if (fresh) return this.problemFor(fresh.skillId, { factKey: fresh.factKey, segment });
    }
    // consolidare: cele mai slabe fapte deja introduse (cutie mică, timp mare)
    const weakest = [...this.progress.facts.values()]
      .filter((s) => !this.lastFacts.includes(s.factKey))
      .sort((a, b) => a.box - b.box || (b.ewmaMs ?? 0) - (a.ewmaMs ?? 0))
      .slice(0, 6);
    if (weakest.length) {
      const s = this.rng.pick(weakest);
      return this.problemFor(s.skillId, { factKey: s.factKey, segment });
    }
    const fresh = this.nextNewFact();
    if (fresh) return this.problemFor(fresh.skillId, { factKey: fresh.factKey, segment });
    return this.problemFor('facts.mul-2-10', { segment });
  }
}

/** Ce conține sesiunea de azi (pentru ecranul principal). */
export function todayPreview(p: Progress, now = Date.now()) {
  const focusSkillId = chooseFocus(p);
  const unlockedFactSkills = FACT_INTAKE_ORDER.map(getSkill).filter((s) => isUnlocked(p, s));
  const newAvailable = unlockedFactSkills.reduce((n, s) => n + (factSummary(p, s, now).total - factSummary(p, s, now).seen), 0);
  return {
    focusSkillId,
    focusLevel: skillStateOf(p, focusSkillId).rating,
    dueFacts: dueFacts(p, now).length,
    newAvailable,
  };
}
