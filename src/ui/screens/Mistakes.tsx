import { useLiveQuery } from 'dexie-react-hooks';
import { getSkill } from '../../data/curriculum';
import { db } from '../../db/db';
import type { MistakeItem } from '../../engine/session';
import { prettyInput } from '../../engine/format';
import { startRun } from '../lib/hooks';
import { navigate } from '../lib/router';
import { Button, Card, PageHeader } from '../components/ui';

const WINDOW = 14 * 24 * 60 * 60 * 1000;

export function Mistakes() {
  const wrong = useLiveQuery(
    () =>
      db.attempts
        .where('ts')
        .above(Date.now() - WINDOW)
        .filter((a) => !a.correct && !a.guided)
        .reverse()
        .sortBy('ts'),
    [],
  );

  const practice = () => {
    if (!wrong?.length) return;
    // același fapt o singură dată; la strategii: probleme noi, la nivelul la care ai greșit
    const seen = new Set<string>();
    const items: MistakeItem[] = [];
    for (const a of wrong) {
      const key = a.factKey ?? `${a.skillId}:${a.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ skillId: a.skillId, factKey: a.factKey, difficulty: a.difficulty });
      if (items.length >= 20) break;
    }
    startRun({ mode: 'mistakes', mistakes: items });
  };

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="Greșelile mele" subtitle="Ultimele 14 zile" back={() => navigate('')} />
      {wrong && wrong.length > 0 && (
        <Button className="w-full" onClick={practice}>
          Exersează-le ({Math.min(20, wrong.length)})
        </Button>
      )}
      {wrong?.length === 0 && <p className="pt-10 text-center text-muted">Nicio greșeală recentă. 👌</p>}
      <div className="space-y-2">
        {wrong?.slice(0, 60).map((a) => (
          <Card key={a.id} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">{a.prompt}</div>
                <div className="truncate text-xs text-muted">
                  {getSkill(a.skillId).title}
                  {a.question ? ` · ${a.question}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-good">{a.answerText}</div>
                <div className="text-sm text-bad line-through">{a.userText ? prettyInput(a.userText) : 'nu știu'}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
