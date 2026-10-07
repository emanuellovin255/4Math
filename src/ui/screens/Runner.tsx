import { useCallback, useEffect, useRef, useState } from 'react';
import { type SessionItem, Session } from '../../engine/session';
import { RecentKeys } from '../../engine/recent';
import { AUTOMATED_BOX } from '../../engine/srs';
import { getSkill } from '../../data/curriculum';
import { db, getKV, loadProgress, setKV } from '../../db/db';
import { type MistakeEntry, PACE_FACTOR, type SessionResult, type SkillDelta, useApp } from '../../store';
import { navigate } from '../lib/router';
import { median } from '../lib/stats';
import { Icon, ProgressBar } from '../components/ui';
import { type AnswerEvent, ProblemView } from '../run/ProblemView';
import { GuidedView } from '../run/GuidedView';
import { LessonStep } from '../run/LessonCard';

interface LogEntry {
  skillId: string;
  correct: boolean;
  rtMs: number;
  guided: boolean;
}

const MODE_TITLE = {
  today: 'Antrenamentul de azi',
  practice: 'Practică',
  sprint: 'Sprint',
  guided: 'Ghidat',
  mistakes: 'Greșelile mele',
  multiply: 'Înmulțiri',
} as const;

export function Runner() {
  const cfg = useApp((s) => s.pending);
  const settings = useApp((s) => s.settings);
  const finishSession = useApp((s) => s.finishSession);

  const sessionRef = useRef<Session | null>(null);
  const startSnapshot = useRef<{ ratings: Map<string, number>; boxes: Map<string, number> } | null>(null);
  const log = useRef<LogEntry[]>([]);
  const mistakes = useRef<Map<string, MistakeEntry>>(new Map());
  const sessionId = useRef(`s${Date.now().toString(36)}`);
  const startedAt = useRef(Date.now());
  const clock = useRef({ start: performance.now(), pausedAt: 0, paused: 0 });
  const finishing = useRef(false);

  const [item, setItem] = useState<SessionItem | null>(null);
  const [, setTick] = useState(0);
  const [score, setScore] = useState({ total: 0, correct: 0, streak: 0, best: 0 });

  const elapsed = () => {
    const c = clock.current;
    const now = c.pausedAt || performance.now();
    return now - c.start - c.paused;
  };

  // pauză automată când aplicația e în fundal
  useEffect(() => {
    const onVis = () => {
      const c = clock.current;
      if (document.hidden) c.pausedAt = performance.now();
      else if (c.pausedAt) {
        c.paused += performance.now() - c.pausedAt;
        c.pausedAt = 0;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(() => setTick((x) => x + 1), 500);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(t);
    };
  }, []);

  const finish = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !cfg || finishing.current) return;
    finishing.current = true;
    const entries = log.current;
    const activeMs = Math.round(elapsed());
    const scored = entries.filter((e) => !e.guided);
    const correct = scored.filter((e) => e.correct).length;

    const snap = startSnapshot.current!;
    const bySkillMap = new Map<string, SkillDelta>();
    for (const e of entries) {
      const d = bySkillMap.get(e.skillId) ?? { skillId: e.skillId, total: 0, correct: 0 };
      d.total++;
      if (e.correct) d.correct++;
      bySkillMap.set(e.skillId, d);
    }
    for (const d of bySkillMap.values()) {
      if (getSkill(d.skillId).kind === 'strategy') {
        d.levelBefore = snap.ratings.get(d.skillId) ?? session.progress.skills.get(d.skillId)?.rating;
        d.levelAfter = session.progress.skills.get(d.skillId)?.rating;
      }
    }
    let newFacts = 0;
    let promotedFacts = 0;
    for (const [key, s] of session.progress.facts) {
      const before = snap.boxes.get(key);
      if (before === undefined) newFacts++;
      if ((before ?? -1) < AUTOMATED_BOX && s.box >= AUTOMATED_BOX) promotedFacts++;
    }

    let streak = 0;
    let bestStreak = 0;
    for (const e of scored) {
      streak = e.correct ? streak + 1 : 0;
      bestStreak = Math.max(bestStreak, streak);
    }

    const result: SessionResult = {
      sessionId: sessionId.current,
      mode: cfg.mode,
      skillIds: [...bySkillMap.keys()],
      total: scored.length,
      correct,
      activeMs,
      medianMs: median(scored.filter((e) => e.correct).map((e) => e.rtMs)),
      bestStreak,
      newFacts,
      promotedFacts,
      bySkill: [...bySkillMap.values()],
      mistakes: [...mistakes.current.values()],
      config: cfg,
    };

    const timedMul = cfg.mode === 'multiply' && (cfg.durationMs ?? 0) > 0;
    if (cfg.mode === 'sprint' || timedMul) {
      const key = timedMul
        ? `best:mul:${[...(cfg.mul?.tables ?? [])].sort((a, b) => a - b).join('+')}:${cfg.mul?.upTo}`
        : `best:sprint:${cfg.skillIds?.length ? [...cfg.skillIds].sort().join('+') : 'mix'}`;
      const best = await getKV<number>(key, 0);
      result.sprintKey = key;
      result.sprintBest = Math.max(best, correct);
      result.isRecord = correct > best && correct > 0;
      if (result.isRecord) await setKV(key, correct).catch(() => undefined);
    }

    try {
      if (entries.length) {
        await db.sessions.put({
          id: sessionId.current,
          startedAt: startedAt.current,
          endedAt: Date.now(),
          mode: cfg.mode,
          activeMs,
          total: scored.length,
          correct,
          skillIds: result.skillIds,
          score: cfg.mode === 'sprint' || timedMul ? correct : undefined,
        });
      }
      await setKV('recent', session.recent.toJSON());
    } catch {
      // stocarea poate lipsi (mod privat); rezultatele rămân afișate
    }
    finishSession(result);
    navigate('results', { replace: true });
  }, [cfg, finishSession]);

  // pornire: încărcăm progresul și construim sesiunea
  useEffect(() => {
    if (!cfg) {
      navigate('', { replace: true });
      return;
    }
    let alive = true;
    (async () => {
      const [progress, recentKeys] = await Promise.all([
        loadProgress().catch(() => ({ facts: new Map(), skills: new Map() })),
        getKV<string[]>('recent', []),
      ]);
      if (!alive) return;
      startSnapshot.current = {
        ratings: new Map([...progress.skills].map(([k, s]) => [k, s.rating])),
        boxes: new Map([...progress.facts].map(([k, s]) => [k, s.box])),
      };
      const session = new Session(
        cfg,
        progress,
        { paceFactor: PACE_FACTOR[settings.pace], maxLearning: settings.maxLearning },
        new RecentKeys(300, recentKeys),
      );
      sessionRef.current = session;
      clock.current = { start: performance.now(), pausedAt: 0, paused: 0 };
      startedAt.current = Date.now();
      const first = session.next(0);
      if (first) setItem(first);
      else void finish();
    })();
    return () => {
      alive = false;
    };
    // sesiunea se construiește o singură dată, la montare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = useCallback(() => {
    const session = sessionRef.current;
    if (!session || finishing.current) return;
    const next = session.next(elapsed());
    if (next) setItem(next);
    else void finish();
  }, [finish]);

  const onAnswer = (it: Extract<SessionItem, { type: 'problem' }>, e: AnswerEvent) => {
    const session = sessionRef.current;
    if (!session) return;
    const now = Date.now();
    const r = session.record(it, e.correct, e.rtMs, now);
    log.current.push({ skillId: it.problem.skillId, correct: e.correct, rtMs: e.rtMs, guided: it.guided });
    if (!it.guided) {
      setScore((s) => {
        const streak = e.correct ? s.streak + 1 : 0;
        return { total: s.total + 1, correct: s.correct + (e.correct ? 1 : 0), streak, best: Math.max(s.best, streak) };
      });
    }
    const p = it.problem;
    if (!e.correct && !it.guided) {
      const prev = mistakes.current.get(p.key);
      mistakes.current.set(p.key, {
        key: p.key,
        prompt: p.prompt || (p.choices ?? []).join(' vs '),
        question: p.question,
        userText: e.userText,
        answerText: p.answerText,
        steps: p.steps,
        times: (prev?.times ?? 0) + 1,
      });
    }
    void Promise.all([
      r.fact ? db.factStates.put(r.fact) : null,
      db.skillStates.put(r.skill),
      db.attempts.add({
        ts: now,
        sessionId: sessionId.current,
        skillId: p.skillId,
        factKey: p.factKey,
        key: p.key,
        template: p.template,
        prompt: p.prompt || (p.choices ?? []).join(' vs '),
        question: p.question,
        answerText: p.answerText,
        userText: e.userText,
        correct: e.correct ? 1 : 0,
        rtMs: e.rtMs,
        targetMs: p.targetMs,
        difficulty: p.difficulty,
        guided: it.guided ? 1 : 0,
      }),
    ]).catch(() => undefined);
  };

  const exit = () => {
    if (log.current.length === 0) {
      useApp.setState({ pending: null });
      navigate('', { replace: true });
      return;
    }
    if (confirm('Termini sesiunea acum? Progresul de până aici se salvează.')) void finish();
  };

  if (!cfg) return null;

  const timed = cfg.mode === 'today' || cfg.mode === 'sprint' || (cfg.mode === 'multiply' && (cfg.durationMs ?? 0) > 0);
  const progress = timed
    ? elapsed() / (cfg.durationMs ?? 1)
    : cfg.count
      ? (sessionRef.current?.servedCount ?? 0) / cfg.count
      : 0;
  const remaining = timed ? Math.max(0, (cfg.durationMs ?? 0) - elapsed()) : 0;
  const segmentSkill =
    cfg.mode === 'multiply' && cfg.mul
      ? cfg.mul.pairs?.length
        ? 'Înmulțiri · greșelile tale'
        : `Înmulțiri cu ${cfg.mul.tables.join(', ')} · până la ${cfg.mul.upTo}`
      : item?.type === 'problem'
        ? getSkill(item.problem.skillId).title
        : null;

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col px-4">
      <header className="safe-top flex items-center gap-3 pb-2">
        <button onClick={exit} aria-label="Închide" className="-ml-2 rounded-full p-2 text-muted hover:bg-surface-2">
          <Icon name="close" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
            <span className="truncate">{segmentSkill ?? MODE_TITLE[cfg.mode]}</span>
            <span className="shrink-0 tabular-nums">
              {timed ? `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}` : null}
            </span>
          </div>
          <ProgressBar value={progress} className="mt-1" />
        </div>
        <div className="text-right text-sm font-semibold tabular-nums">
          <span className="text-good">{score.correct}</span>
          <span className="text-muted">/{score.total}</span>
          {score.streak >= 3 && <div className="text-xs text-warn">🔥 {score.streak}</div>}
        </div>
      </header>

      {!item && <div className="flex flex-1 items-center justify-center text-muted">Se pregătește…</div>}

      {item?.type === 'banner' && <Banner key={`${item.title}`} title={item.title} subtitle={item.subtitle} onDone={advance} />}

      {item?.type === 'lesson' && <LessonStep key={`lesson-${item.skillId}`} skillId={item.skillId} onDone={advance} />}

      {item?.type === 'problem' &&
        (item.guided ? (
          <GuidedView
            key={item.problem.uid}
            problem={item.problem}
            settings={settings}
            onAnswer={(e) => onAnswer(item, e)}
            onNext={advance}
          />
        ) : (
          <ProblemView
            key={item.problem.uid}
            problem={item.problem}
            settings={settings}
            quick={cfg.mode === 'sprint' || (cfg.mode === 'multiply' && (cfg.durationMs ?? 0) > 0)}
            onAnswer={(e) => onAnswer(item, e)}
            onNext={advance}
          />
        ))}
      <div className="safe-bottom" />
    </div>
  );
}

function Banner({ title, subtitle, onDone }: { title: string; subtitle?: string; onDone(): void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <button onClick={onDone} className="pop flex flex-1 flex-col items-center justify-center text-center">
      <div className="text-3xl font-bold">{title}</div>
      {subtitle && <div className="mt-2 text-muted">{subtitle}</div>}
      <div className="mt-6 text-xs text-muted">atinge ca să începi</div>
    </button>
  );
}
