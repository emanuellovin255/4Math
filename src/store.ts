import { create } from 'zustand';
import { getKV, setKV } from './db/db';
import type { SessionConfig } from './engine/session';

export type Pace = 'relaxed' | 'normal' | 'fast';

export interface Settings {
  dailyGoalMin: number;
  pace: Pace;
  maxLearning: number;
  sound: boolean;
  haptics: boolean;
  keypad: 'phone' | 'calculator';
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoalMin: 10,
  pace: 'normal',
  maxLearning: 8,
  sound: true,
  haptics: true,
  keypad: 'phone',
};

export const PACE_FACTOR: Record<Pace, number> = { relaxed: 1.5, normal: 1, fast: 0.75 };

export interface SkillDelta {
  skillId: string;
  total: number;
  correct: number;
  levelBefore?: number;
  levelAfter?: number;
}

export interface SessionResult {
  sessionId: string;
  mode: SessionConfig['mode'];
  skillIds: string[];
  total: number;
  correct: number;
  activeMs: number;
  medianMs: number | null;
  bestStreak: number;
  newFacts: number;
  promotedFacts: number;
  bySkill: SkillDelta[];
  sprintKey?: string;
  sprintBest?: number;
  isRecord?: boolean;
  config: SessionConfig;
}

interface AppState {
  ready: boolean;
  settings: Settings;
  pending: SessionConfig | null;
  lastResult: SessionResult | null;
  init(): Promise<void>;
  updateSettings(patch: Partial<Settings>): void;
  startSession(cfg: SessionConfig): void;
  finishSession(result: SessionResult): void;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  pending: null,
  lastResult: null,
  async init() {
    const saved = await getKV<Partial<Settings>>('settings', {});
    set({ settings: { ...DEFAULT_SETTINGS, ...saved }, ready: true });
  },
  updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void setKV('settings', settings).catch(() => undefined);
  },
  startSession(cfg) {
    set({ pending: cfg });
  },
  finishSession(result) {
    set({ pending: null, lastResult: result });
  },
}));
