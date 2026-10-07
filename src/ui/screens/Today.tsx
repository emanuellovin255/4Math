import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { getSkill } from '../../data/curriculum';
import { todayPreview } from '../../engine/session';
import { levelOf } from '../../engine/rating';
import { useApp } from '../../store';
import { startRun, useProgress, useSessions } from '../lib/hooks';
import { navigate } from '../lib/router';
import { dayKey, minutesOn, streak } from '../lib/stats';
import { Button, Card, Icon, ProgressBar } from '../components/ui';

const MISTAKE_WINDOW = 14 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function Today() {
  const settings = useApp((s) => s.settings);
  const progress = useProgress();
  const sessions = useSessions();
  const mistakes = useLiveQuery(
    () => db.attempts.where('ts').above(Date.now() - MISTAKE_WINDOW).filter((a) => !a.correct && !a.guided).count(),
    [],
  );
  const [hideInstall, setHideInstall] = useState(() => readFlag('4math.hideInstall') || isStandalone());

  const today = dayKey(Date.now());
  const minutes = sessions ? minutesOn(sessions, today) : 0;
  const days = sessions ? streak(sessions) : 0;
  const preview = progress ? todayPreview(progress) : null;
  const focus = preview ? getSkill(preview.focusSkillId) : null;
  const goal = settings.dailyGoalMin;
  const done = minutes >= goal;

  const date = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4">
      <header className="safe-top flex items-center justify-between">
        <div>
          <div className="text-sm capitalize text-muted">{date}</div>
          <h1 className="text-3xl font-bold tracking-tight">4Math</h1>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold shadow-sm">
          <Icon name="flame" className={`h-5 w-5 ${days > 0 ? 'text-warn' : 'text-muted'}`} />
          {days} {days === 1 ? 'zi' : 'zile'}
        </div>
      </header>

      <Card className="space-y-4 border-accent/30">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">Antrenamentul de azi</div>
            <div className="text-xl font-bold">{goal} minute</div>
          </div>
          <div className="text-right text-sm text-muted">
            {Math.floor(minutes)}/{goal} min {done && '✓'}
          </div>
        </div>
        <ProgressBar value={minutes / goal} color={done ? 'bg-good' : 'bg-accent'} />
        <ol className="space-y-1.5 text-sm">
          <PlanRow n={1} title="Încălzire" detail="dublări și complemente" />
          <PlanRow
            n={2}
            title="Automatisme"
            detail={
              preview
                ? preview.dueFacts
                  ? `${preview.dueFacts} fapte de repetat + fapte noi`
                  : 'fapte noi și consolidare'
                : '…'
            }
          />
          <PlanRow n={3} title={focus ? focus.title : 'Strategie'} detail={preview ? `nivel ${levelOf(preview.focusLevel)}` : ''} />
          <PlanRow n={4} title="Mix" detail="tu alegi metoda" />
        </ol>
        <Button className="w-full py-4 text-lg" onClick={() => startRun({ mode: 'today', durationMs: goal * 60_000 })}>
          {done ? 'Încă o sesiune' : minutes > 0 ? 'Continuă antrenamentul' : 'Începe'}
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card onClick={() => startRun({ mode: 'sprint', durationMs: 60_000 })}>
          <Icon name="bolt" className="h-6 w-6 text-warn" />
          <div className="mt-2 font-semibold">Sprint 60 s</div>
          <div className="text-xs text-muted">cât de multe, cât de repede</div>
        </Card>
        <Card onClick={() => navigate('practice')}>
          <Icon name="play" className="h-6 w-6 text-accent" />
          <div className="mt-2 font-semibold">Practică liberă</div>
          <div className="text-xs text-muted">alegi ce exersezi</div>
        </Card>
      </div>

      <Card onClick={() => navigate('mistakes')} className="flex items-center gap-3">
        <Icon name="list" className="h-6 w-6 shrink-0 text-bad" />
        <div className="flex-1">
          <div className="font-semibold">Greșelile mele</div>
          <div className="text-xs text-muted">ultimele 14 zile</div>
        </div>
        <div className="text-xl font-bold tabular-nums">{mistakes ?? '–'}</div>
      </Card>

      {!hideInstall && (
        <Card className="text-sm">
          <div className="font-semibold">Instalează pe telefon</div>
          <p className="mt-1 text-muted">
            iPhone: Safari → Share → „Add to Home Screen”. Android: Chrome → meniul ⋮ → „Instalează aplicația”. Merge și offline.
          </p>
          <button
            className="mt-2 text-sm font-medium text-accent"
            onClick={() => {
              try {
                localStorage.setItem('4math.hideInstall', '1');
              } catch {
                /* fără stocare: ascundem doar acum */
              }
              setHideInstall(true);
            }}
          >
            Am înțeles
          </button>
        </Card>
      )}
    </div>
  );
}

function PlanRow({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold">{n}</span>
      <span className="font-medium">{title}</span>
      <span className="ml-auto truncate text-muted">{detail}</span>
    </li>
  );
}
