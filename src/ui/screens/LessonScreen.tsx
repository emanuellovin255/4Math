import { SKILL_BY_ID } from '../../data/curriculum';
import { startRun } from '../lib/hooks';
import { navigate } from '../lib/router';
import { Button, PageHeader } from '../components/ui';
import { LessonCard } from '../run/LessonCard';

export function LessonScreen({ id }: { id: string }) {
  const skill = SKILL_BY_ID[id];
  if (!skill) return <PageHeader title="Lecție inexistentă" back={() => navigate('learn')} />;
  return (
    <div className="pb-6">
      <PageHeader title="" back={() => navigate(skill.practiceRoute ? 'learn' : `skill/${id}`)} />
      <LessonCard skillId={id}>
        <div className="grid grid-cols-2 gap-2">
          {skill.practiceRoute ? (
            <div />
          ) : skill.kind === 'strategy' ? (
            <Button variant="secondary" onClick={() => startRun({ mode: 'guided', skillIds: [id], count: 5 })}>
              Încearcă ghidat
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={() =>
              skill.practiceRoute ? navigate(skill.practiceRoute) : startRun({ mode: 'practice', skillIds: [id], count: 20 })
            }
          >
            Exersează
          </Button>
        </div>
      </LessonCard>
    </div>
  );
}
