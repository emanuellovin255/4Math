import type { Attempt, SessionRecord } from '../../db/db';

export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Zile consecutive cu antrenament (azi sau ieri inclusiv, ca să nu se piardă dimineața). */
export function streak(sessions: SessionRecord[], now = Date.now()): number {
  const days = new Set(sessions.filter((s) => s.total > 0).map((s) => dayKey(s.startedAt)));
  let n = 0;
  const d = new Date(now);
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function minutesOn(sessions: SessionRecord[], day: string): number {
  return sessions.filter((s) => dayKey(s.startedAt) === day).reduce((m, s) => m + s.activeMs, 0) / 60000;
}

export function lastNDays(n: number, now = Date.now()): string[] {
  const out: string[] = [];
  const d = new Date(now);
  for (let i = 0; i < n; i++) {
    out.unshift(dayKey(d.getTime()));
    d.setDate(d.getDate() - 1);
  }
  return out;
}

export function skillStats(attempts: Attempt[]) {
  const recent = attempts.filter((a) => !a.guided).slice(-50);
  return {
    total: attempts.length,
    accuracy: recent.length ? recent.filter((a) => a.correct).length / recent.length : null,
    medianMs: median(recent.filter((a) => a.correct).map((a) => a.rtMs)),
  };
}

export const secs = (ms: number | null) => (ms === null ? '–' : `${(ms / 1000).toFixed(1).replace('.', ',')} s`);
export const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)}%`);
