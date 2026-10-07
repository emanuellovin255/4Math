import { MODULES, SKILLS } from '../../data/curriculum';
import { factSummary, isUnlocked, skillProgress, skillStateOf } from '../../engine/progress';
import { levelOf } from '../../engine/rating';
import { useProgress } from '../lib/hooks';
import { navigate } from '../lib/router';
import { Card, Icon, PageHeader, ProgressBar } from '../components/ui';

export function Learn() {
  const progress = useProgress();

  return (
    <div className="space-y-6">
      <PageHeader title="Învață" subtitle="Harta abilităților, în ordinea recomandată" />
      {MODULES.map((m) => {
        const skills = SKILLS.filter((s) => s.module === m.id);
        return (
          <section key={m.id} className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold">{m.letter}</span>
              <h2 className="text-lg font-bold">{m.title}</h2>
              {!m.available && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">în curând</span>}
            </div>
            <p className="text-sm text-muted">{m.description}</p>
            {m.available ? (
              <div className="space-y-2">
                {skills.map((s) => {
                  const locked = progress ? !isUnlocked(progress, s) : false;
                  const value = progress ? skillProgress(progress, s) : 0;
                  let detail = '';
                  if (progress) {
                    if (s.kind === 'fact') {
                      const f = factSummary(progress, s);
                      detail = `${f.automated}/${f.total} automatizate`;
                    } else {
                      const st = skillStateOf(progress, s.id);
                      detail = st.attempts ? `nivel ${levelOf(st.rating)}` : 'neînceput';
                    }
                  }
                  return (
                    <Card key={s.id} onClick={() => navigate(`skill/${s.id}`)} className={locked ? 'opacity-70' : ''}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-semibold">
                            {locked && <Icon name="lock" className="h-4 w-4 text-muted" />}
                            <span className="truncate">{s.title}</span>
                          </div>
                          <div className="truncate text-sm text-muted">{s.short}</div>
                        </div>
                        <div className="shrink-0 text-xs text-muted">{detail}</div>
                      </div>
                      <ProgressBar value={value} className="mt-3" color={value >= 0.8 ? 'bg-good' : 'bg-accent'} />
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {m.preview?.map((p) => (
                  <span key={p} className="rounded-xl border border-dashed border-border px-3 py-1.5 text-sm text-muted">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
