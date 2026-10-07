import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { SKILL_BY_ID } from '../../data/curriculum';
import { db, getKV } from '../../db/db';
import { factSummary, isUnlocked, skillStateOf } from '../../engine/progress';
import { levelOf } from '../../engine/rating';
import { useProgress, startRun } from '../lib/hooks';
import { navigate } from '../lib/router';
import { pct, secs, skillStats } from '../lib/stats';
import { Button, Card, Icon, PageHeader, Stat } from '../components/ui';
import { FactChips, LevelLegend, MulHeatmap, factTitle } from '../components/FactGrid';

export function SkillDetail({ id }: { id: string }) {
  const skill = SKILL_BY_ID[id];
  const progress = useProgress();
  const attempts = useLiveQuery(() => db.attempts.where('skillId').equals(id).sortBy('ts'), [id]);
  const best = useLiveQuery(() => getKV<number>(`best:sprint:${id}`, 0), [id]);
  const [picked, setPicked] = useState<string | null>(null);

  if (!skill) {
    return (
      <div>
        <PageHeader title="Abilitate necunoscută" back={() => navigate('learn')} />
      </div>
    );
  }

  const stats = skillStats(attempts ?? []);
  const locked = progress ? !isUnlocked(progress, skill) : false;
  const facts = factSummary(progress ?? { facts: new Map(), skills: new Map() }, skill);
  const state = progress ? skillStateOf(progress, id) : null;
  const prereqNames = skill.prerequisites.map((p) => SKILL_BY_ID[p]?.title).filter(Boolean);

  return (
    <div className="space-y-4">
      <PageHeader title={skill.title} subtitle={skill.short} back={() => navigate('learn')} />

      {locked && (
        <Card className="flex gap-3 text-sm">
          <Icon name="lock" className="h-5 w-5 shrink-0 text-muted" />
          <div>
            <span className="font-semibold">Recomandat după:</span> {prereqNames.join(', ')}.{' '}
            <span className="text-muted">Poți exersa oricum, dar sesiunea zilnică o introduce mai târziu.</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        {skill.kind === 'fact' ? (
          <Stat label="Automat" value={`${facts.automated}/${facts.total}`} />
        ) : (
          <Stat label="Nivel" value={state ? levelOf(state.rating) : '–'} />
        )}
        <Stat label="Acuratețe" value={pct(stats.accuracy)} sub="ultimele 50" />
        <Stat label="Median" value={secs(stats.medianMs)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {skill.lesson && (
          <Button variant="secondary" onClick={() => navigate(`lesson/${id}`)}>
            Lecție
          </Button>
        )}
        {skill.kind === 'strategy' && (
          <Button variant="secondary" onClick={() => startRun({ mode: 'guided', skillIds: [id], count: 5 })}>
            Ghidat (5)
          </Button>
        )}
        <Button onClick={() => startRun({ mode: 'practice', skillIds: [id], count: 20 })}>Exersează (20)</Button>
        <Button variant="secondary" onClick={() => startRun({ mode: 'sprint', skillIds: [id], durationMs: 60_000 })}>
          Sprint 60 s{best ? ` · ${best}` : ''}
        </Button>
      </div>

      {skill.kind === 'fact' && progress && (
        <Card className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="font-semibold">Faptele tale</div>
            <div className="text-xs text-muted">{facts.due} scadente</div>
          </div>
          {id.startsWith('facts.mul') ? (
            <>
              <MulHeatmap facts={progress.facts} onPick={setPicked} />
              <FactChips keys={skill.facts ?? []} facts={progress.facts} onPick={setPicked} />
            </>
          ) : (
            <FactChips keys={skill.facts ?? []} facts={progress.facts} onPick={setPicked} />
          )}
          <LevelLegend />
          {picked && <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{factTitle(picked, progress.facts.get(picked))}</div>}
        </Card>
      )}
    </div>
  );
}
