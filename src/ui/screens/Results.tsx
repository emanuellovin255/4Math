import { getSkill } from '../../data/curriculum';
import { levelOf } from '../../engine/rating';
import { randomSeed } from '../../engine/rng';
import { useApp } from '../../store';
import { navigate } from '../lib/router';
import { pct, secs } from '../lib/stats';
import { Button, Card, Stat } from '../components/ui';
import { MistakeList } from '../components/MistakeList';
import { parseOpKey } from '../../engine/generators/operations';

export function Results() {
  const r = useApp((s) => s.lastResult);
  if (!r) {
    return (
      <div className="mx-auto max-w-md px-4 pt-20 text-center">
        <p className="text-muted">Nicio sesiune încheiată încă.</p>
        <Button className="mt-4" onClick={() => navigate('')}>
          Acasă
        </Button>
      </div>
    );
  }

  const accuracy = r.total ? r.correct / r.total : null;
  const minutes = Math.max(1, Math.round(r.activeMs / 60000));
  const headline =
    r.sprintKey
      ? r.isRecord
        ? 'Record nou! 🏆'
        : 'Sprint încheiat'
      : accuracy === null
        ? 'Sesiune încheiată'
        : accuracy >= 0.9
          ? 'Excelent! 🎯'
          : accuracy >= 0.75
            ? 'Bună sesiune 💪'
            : 'Ai muncit pe bune 🧠';

  const again = () => {
    useApp.getState().startSession({ ...r.config, seed: randomSeed() });
    navigate('run', { replace: true });
  };

  const replayPairs = r.config.op
    ? r.mistakes.map((m) => parseOpKey(m.key)?.pair).filter((p): p is [number, number] => !!p)
    : [];
  const replay = () => {
    if (!r.config.op || !replayPairs.length) return;
    useApp.getState().startSession({
      mode: 'ops',
      op: { ...r.config.op, pairs: replayPairs },
      // fiecare pereche greșită de 2 ori
      count: replayPairs.length * 2,
      seed: randomSeed(),
    });
    navigate('run', { replace: true });
  };

  return (
    <div className="safe-top mx-auto max-w-md space-y-4 px-4 pb-10">
      <div className="pop pt-6 text-center">
        <div className="text-3xl font-bold">{headline}</div>
        {r.sprintKey ? (
          <div className="mt-3">
            <div className="text-6xl font-bold text-accent">{r.correct}</div>
            <div className="text-muted">corecte în {Math.round((r.config.durationMs ?? 60000) / 1000)} s · record: {r.sprintBest}</div>
          </div>
        ) : (
          <div className="mt-3 text-6xl font-bold text-accent">{pct(accuracy)}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Răspunsuri" value={`${r.correct}/${r.total}`} />
        <Stat label="Timp" value={`${minutes} min`} />
        <Stat label="Timp median" value={secs(r.medianMs)} sub="la răspunsurile corecte" />
        <Stat label="Serie maximă" value={r.bestStreak} sub="corecte la rând" />
        {r.newFacts > 0 && <Stat label="Fapte noi" value={r.newFacts} />}
        {r.promotedFacts > 0 && <Stat label="Automatizate" value={`+${r.promotedFacts}`} sub="fapte ajunse rapide" />}
      </div>

      {r.bySkill.length > 0 && (
        <Card>
          <div className="mb-2 text-sm font-semibold text-muted">Pe abilități</div>
          <ul className="space-y-2">
            {r.bySkill.map((d) => {
              const skill = getSkill(d.skillId);
              const delta = d.levelAfter !== undefined && d.levelBefore !== undefined ? levelOf(d.levelAfter) - levelOf(d.levelBefore) : null;
              return (
                <li key={d.skillId} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{skill.title}</span>
                  <span className="shrink-0 text-sm tabular-nums">
                    <span className="text-muted">
                      {d.correct}/{d.total}
                    </span>
                    {d.levelAfter !== undefined && (
                      <span className="ml-2 font-semibold">
                        nivel {levelOf(d.levelAfter)}
                        {delta !== null && delta !== 0 && (
                          <span className={delta > 0 ? 'text-good' : 'text-bad'}> ({delta > 0 ? '+' : ''}{delta})</span>
                        )}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {r.mistakes.length > 0 ? (
        <Card>
          <div className="mb-1 flex items-baseline justify-between">
            <div className="font-semibold">Ce ai greșit ({r.mistakes.length})</div>
            <div className="text-xs text-muted">atinge pentru rezolvare</div>
          </div>
          <MistakeList items={r.mistakes} />
          {replayPairs.length > 0 && (
            <Button className="mt-3 w-full" onClick={replay}>
              Repetă doar greșelile
            </Button>
          )}
        </Card>
      ) : (
        r.total > 0 && <Card className="text-center font-semibold text-good">Nicio greșeală. 👌</Card>
      )}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="secondary" onClick={() => navigate(r.config.op ? `ops/${r.config.op.op}` : '', { replace: true })}>
          {r.config.op ? 'Înapoi' : 'Acasă'}
        </Button>
        <Button onClick={again}>{r.mode === 'today' ? 'Încă o rundă' : 'Din nou'}</Button>
      </div>
    </div>
  );
}
