import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Progress } from '../../engine/progress';
import type { SessionConfig } from '../../engine/session';
import { randomSeed } from '../../engine/rng';
import { useApp } from '../../store';
import { navigate } from './router';

export function useProgress(): Progress | undefined {
  return useLiveQuery(async () => {
    const [facts, skills] = await Promise.all([db.factStates.toArray(), db.skillStates.toArray()]);
    return {
      facts: new Map(facts.map((f) => [f.factKey, f])),
      skills: new Map(skills.map((s) => [s.skillId, s])),
    };
  }, []);
}

export const useSessions = () => useLiveQuery(() => db.sessions.toArray(), []);

export function startRun(cfg: Omit<SessionConfig, 'seed'>) {
  useApp.getState().startSession({ ...cfg, seed: randomSeed() });
  navigate('run');
}
