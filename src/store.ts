import { create } from 'zustand';
import { getKV, setKV } from './db/db';
import type { SessionConfig } from './engine/session';
import type { Step } from './engine/types';
import type { Op } from './engine/generators/operations';

export type Pace = 'relaxed' | 'normal' | 'fast';
export type Theme = 'light' | 'dark' | 'auto';

/** Aplică tema pe <html> și o ține minte și în localStorage (citită din index.html la pornire). */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1020' : '#f5f6fb');
  try {
    localStorage.setItem('4math.theme', theme);
  } catch {
    /* fără stocare: tema rămâne doar pentru sesiunea curentă */
  }
}

export interface Settings {
  dailyGoalMin: number;
  pace: Pace;
  maxLearning: number;
  sound: boolean;
  haptics: boolean;
  keypad: 'phone' | 'calculator';
  theme: Theme;
  /** Ultima alegere din rubrica Operații, separat pentru fiecare operație. */
  ops: Record<Op, OpSettings>;
}

export interface OpSettings {
  /** Listă goală = „oricare”. */
  numbers: number[];
  upTo: number;
  /** 0 = nelimitat, -1 = 60 de secunde. */
  count: number;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoalMin: 10,
  pace: 'normal',
  maxLearning: 8,
  sound: true,
  haptics: true,
  keypad: 'phone',
  theme: 'light',
  ops: {
    add: { numbers: [9], upTo: 100, count: 20 },
    sub: { numbers: [7], upTo: 100, count: 20 },
    mul: { numbers: [7], upTo: 10, count: 20 },
    div: { numbers: [7], upTo: 10, count: 20 },
  },
};

export const PACE_FACTOR: Record<Pace, number> = { relaxed: 1.5, normal: 1, fast: 0.75 };

export interface SkillDelta {
  skillId: string;
  total: number;
  correct: number;
  levelBefore?: number;
  levelAfter?: number;
}

export interface MistakeEntry {
  key: string;
  prompt: string;
  question?: string;
  userText: string;
  answerText: string;
  steps: Step[];
  /** De câte ori a fost greșită în sesiune. */
  times: number;
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
  mistakes: MistakeEntry[];
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
    const settings = { ...DEFAULT_SETTINGS, ...saved, ops: { ...DEFAULT_SETTINGS.ops, ...(saved.ops ?? {}) } };
    applyTheme(settings.theme);
    set({ settings, ready: true });
  },
  updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    if (patch.theme) applyTheme(patch.theme);
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
