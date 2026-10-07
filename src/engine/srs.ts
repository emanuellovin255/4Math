// Repetiție spațiată pentru fapte (Leitner, 6 cutii).
// Un fapt urcă o cutie DOAR dacă e corect ȘI sub timpul-țintă: automatizat înseamnă rapid, nu doar corect.

export const DAY = 24 * 60 * 60 * 1000;
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35] as const;
export const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;
/** De la această cutie în sus faptul e considerat automatizat. */
export const AUTOMATED_BOX = 3;

export interface FactState {
  factKey: string;
  skillId: string;
  box: number;
  dueAt: number;
  seen: number;
  correct: number;
  lapses: number;
  ewmaMs: number | null;
  lastMs: number | null;
  introducedAt: number;
  lastAt: number;
}

export function newFactState(factKey: string, skillId: string, now: number): FactState {
  return {
    factKey,
    skillId,
    box: 0,
    dueAt: now,
    seen: 0,
    correct: 0,
    lapses: 0,
    ewmaMs: null,
    lastMs: null,
    introducedAt: now,
    lastAt: 0,
  };
}

export interface ReviewInput {
  correct: boolean;
  rtMs: number;
  targetMs: number;
  now: number;
}

export function reviewFact(s: FactState, { correct, rtMs, targetMs, now }: ReviewInput): FactState {
  const fast = correct && rtMs <= targetMs;
  const first = s.seen === 0;
  const wasDue = s.dueAt <= now;
  let box = s.box;
  let dueAt = s.dueAt;

  if (!correct) {
    box = 0;
    dueAt = now;
  } else if (first && fast) {
    box = 2; // îl știai deja: nu-l mai tratăm ca nou
    dueAt = now + BOX_INTERVAL_DAYS[box] * DAY;
  } else if (fast && (wasDue || s.box === 0)) {
    box = Math.min(MAX_BOX, s.box + 1);
    dueAt = now + BOX_INTERVAL_DAYS[box] * DAY;
  } else if (s.box === 0) {
    box = 1; // corect, dar lent: îl revedem mâine
    dueAt = now + BOX_INTERVAL_DAYS[box] * DAY;
  } else if (wasDue) {
    dueAt = now + BOX_INTERVAL_DAYS[box] * DAY;
  }

  const ewmaMs = correct ? (s.ewmaMs === null ? rtMs : Math.round(0.7 * s.ewmaMs + 0.3 * rtMs)) : s.ewmaMs;
  return {
    ...s,
    box,
    dueAt,
    seen: s.seen + 1,
    correct: s.correct + (correct ? 1 : 0),
    lapses: s.lapses + (!correct && !first ? 1 : 0),
    ewmaMs,
    lastMs: rtMs,
    lastAt: now,
  };
}

export const isAutomated = (s: FactState | undefined) => !!s && s.box >= AUTOMATED_BOX;
export const isLearning = (s: FactState | undefined) => !!s && s.box <= 1;
