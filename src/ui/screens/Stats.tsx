import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { SKILLS, getSkill } from '../../data/curriculum';
import { db } from '../../db/db';
import { factSummary, skillStateOf } from '../../engine/progress';
import { levelOf } from '../../engine/rating';
import { useProgress, useSessions } from '../lib/hooks';
import { navigate } from '../lib/router';
import { lastNDays, minutesOn, pct, secs, skillStats, streak } from '../lib/stats';
import { Card, PageHeader, Stat } from '../components/ui';
import { FactChips, LevelLegend, MulHeatmap, factTitle } from '../components/FactGrid';
import type { Attempt } from '../../db/db';

export function Stats() {
  const progress = useProgress();
  const sessions = useSessions();
  const attempts = useLiveQuery(() => db.attempts.toArray(), []);
  const [picked, setPicked] = useState<string | null>(null);

  const days = lastNDays(14);
  const perDay = days.map((d) => (sessions ? minutesOn(sessions, d) : 0));
  const maxDay = Math.max(5, ...perDay);
  const totalMin = sessions ? sessions.reduce((m, s) => m + s.activeMs, 0) / 60000 : 0;
  const scored = (attempts ?? []).filter((a) => !a.guided);
  const week = scored.filter((a) => a.ts > Date.now() - 7 * 864e5);

  const bySkill = new Map<string, Attempt[]>();
  for (const a of attempts ?? []) {
    const list = bySkill.get(a.skillId) ?? [];
    list.push(a);
    bySkill.set(a.skillId, list);
  }

  const factSkill = (id: string) => getSkill(id);

  return (
    <div className="space-y-4">
      <PageHeader title="Statistici" />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Serie" value={sessions ? streak(sessions) : '–'} sub="zile la rând" />
        <Stat label="Total" value={`${Math.round(totalMin)} min`} />
        <Stat label="7 zile" value={pct(week.length ? week.filter((a) => a.correct).length / week.length : null)} sub={`${week.length} răspunsuri`} />
      </div>

      <Card>
        <div className="mb-3 font-semibold">Minute pe zi</div>
        <div className="flex h-24 items-end gap-1">
          {perDay.map((m, i) => (
            <div key={days[i]} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md ${m > 0 ? 'bg-accent' : 'bg-surface-2'}`}
                style={{ height: `${Math.max(4, (m / maxDay) * 80)}px` }}
                title={`${days[i]}: ${Math.round(m)} min`}
              />
              <span className="text-[9px] text-muted">{Number(days[i].slice(-2))}</span>
            </div>
          ))}
        </div>
      </Card>

      {progress && (
        <Card className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="font-semibold">Tabla înmulțirii 2–20</div>
            <div className="text-xs text-muted">atinge o celulă</div>
          </div>
          <MulHeatmap facts={progress.facts} onPick={setPicked} />
          <LevelLegend />
          {picked && <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{factTitle(picked, progress.facts.get(picked))}</div>}
        </Card>
      )}

      {progress && (
        <Card className="space-y-3">
          <div className="font-semibold">Pătrate, cuburi, fracții</div>
          {['facts.squares-1-30', 'facts.squares-31-50', 'facts.cubes', 'facts.frac-percent'].map((id) => (
            <div key={id}>
              <div className="mb-1 text-xs font-medium text-muted">{factSkill(id).title}</div>
              <FactChips keys={factSkill(id).facts ?? []} facts={progress.facts} onPick={setPicked} />
            </div>
          ))}
        </Card>
      )}

      {progress && (
        <Card>
          <div className="mb-2 font-semibold">Pe abilități</div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 gap-y-2 text-sm">
            <span className="text-xs text-muted">Abilitate</span>
            <span className="text-right text-xs text-muted">Nivel</span>
            <span className="text-right text-xs text-muted">Acur.</span>
            <span className="text-right text-xs text-muted">Median</span>
            {SKILLS.map((s) => {
              const st = skillStats(bySkill.get(s.id) ?? []);
              const level =
                s.kind === 'fact'
                  ? `${factSummary(progress, s).automated}/${s.facts?.length ?? 0}`
                  : skillStateOf(progress, s.id).attempts
                    ? String(levelOf(skillStateOf(progress, s.id).rating))
                    : '–';
              return (
                <button key={s.id} onClick={() => navigate(`skill/${s.id}`)} className="contents text-left">
                  <span className="truncate">{s.title}</span>
                  <span className="text-right font-semibold tabular-nums">{level}</span>
                  <span className="text-right tabular-nums">{pct(st.accuracy)}</span>
                  <span className="text-right tabular-nums">{secs(st.medianMs)}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
