import Dexie, { type Table } from 'dexie';
import type { FactState } from '../engine/srs';
import type { SkillState } from '../engine/rating';
import type { Progress } from '../engine/progress';
import type { SessionMode } from '../engine/session';
import type { TemplateId } from '../engine/types';

export interface Attempt {
  id?: number;
  ts: number;
  sessionId: string;
  skillId: string;
  factKey?: string;
  template: TemplateId;
  prompt: string;
  question?: string;
  answerText: string;
  userText: string;
  correct: 0 | 1;
  rtMs: number;
  targetMs: number;
  difficulty: number;
  guided: 0 | 1;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  mode: SessionMode;
  activeMs: number;
  total: number;
  correct: number;
  skillIds: string[];
  score?: number;
}

export interface KV {
  key: string;
  value: unknown;
}

class MathDB extends Dexie {
  attempts!: Table<Attempt, number>;
  factStates!: Table<FactState, string>;
  skillStates!: Table<SkillState, string>;
  sessions!: Table<SessionRecord, string>;
  kv!: Table<KV, string>;

  constructor() {
    super('4math');
    this.version(1).stores({
      attempts: '++id, ts, skillId, factKey, correct, sessionId',
      factStates: 'factKey, skillId',
      skillStates: 'skillId',
      sessions: 'id, startedAt',
      kv: 'key',
    });
  }
}

export const db = new MathDB();

export async function loadProgress(): Promise<Progress> {
  const [facts, skills] = await Promise.all([db.factStates.toArray(), db.skillStates.toArray()]);
  return {
    facts: new Map(facts.map((f) => [f.factKey, f])),
    skills: new Map(skills.map((s) => [s.skillId, s])),
  };
}

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await db.kv.get(key);
    return row ? (row.value as T) : fallback;
  } catch {
    return fallback;
  }
}

export const setKV = (key: string, value: unknown) => db.kv.put({ key, value });

/** Cere browserului să nu șteargă datele (important pe iOS). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// ───────────────────────── backup ─────────────────────────

const BACKUP_VERSION = 1;

export interface Backup {
  app: '4math';
  version: number;
  exportedAt: string;
  attempts: Attempt[];
  factStates: FactState[];
  skillStates: SkillState[];
  sessions: SessionRecord[];
  kv: KV[];
}

export async function exportBackup(): Promise<Backup> {
  const [attempts, factStates, skillStates, sessions, kv] = await Promise.all([
    db.attempts.toArray(),
    db.factStates.toArray(),
    db.skillStates.toArray(),
    db.sessions.toArray(),
    db.kv.toArray(),
  ]);
  return {
    app: '4math',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    attempts,
    factStates,
    skillStates,
    sessions,
    kv,
  };
}

export async function importBackup(data: unknown): Promise<void> {
  const b = data as Partial<Backup>;
  if (!b || b.app !== '4math' || typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new Error('Fișierul nu este un backup 4Math valid.');
  }
  await db.transaction('rw', [db.attempts, db.factStates, db.skillStates, db.sessions, db.kv], async () => {
    await Promise.all([db.attempts.clear(), db.factStates.clear(), db.skillStates.clear(), db.sessions.clear(), db.kv.clear()]);
    await db.attempts.bulkAdd(b.attempts ?? []);
    await db.factStates.bulkPut(b.factStates ?? []);
    await db.skillStates.bulkPut(b.skillStates ?? []);
    await db.sessions.bulkPut(b.sessions ?? []);
    await db.kv.bulkPut(b.kv ?? []);
  });
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', [db.attempts, db.factStates, db.skillStates, db.sessions, db.kv], async () => {
    await Promise.all([db.attempts.clear(), db.factStates.clear(), db.skillStates.clear(), db.sessions.clear()]);
    // setările rămân; doar recordurile și memoria anti-repetiție se șterg
    const keys = (await db.kv.toCollection().primaryKeys()).filter((k) => k !== 'settings');
    await db.kv.bulkDelete(keys);
  });
}
