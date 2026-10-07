import { useEffect } from 'react';
import { useApp } from '../store';
import { requestPersistence } from '../db/db';
import { useRoute } from './lib/router';
import { TabBar } from './components/TabBar';
import { Today } from './screens/Today';
import { Learn } from './screens/Learn';
import { SkillDetail } from './screens/SkillDetail';
import { LessonScreen } from './screens/LessonScreen';
import { Stats } from './screens/Stats';
import { Settings } from './screens/Settings';
import { PracticeSetup } from './screens/PracticeSetup';
import { Mistakes } from './screens/Mistakes';
import { Runner } from './screens/Runner';
import { Results } from './screens/Results';
import { Multiply } from './screens/Multiply';

export function App() {
  const ready = useApp((s) => s.ready);
  const { path, parts } = useRoute();

  useEffect(() => {
    void useApp.getState().init();
    void requestPersistence();
  }, []);

  if (!ready) return null;

  // ecrane pe tot ecranul, fără bara de jos
  if (path === 'run') return <Runner />;
  if (path === 'results') return <Results />;

  let screen;
  switch (path) {
    case 'mul':
      screen = <Multiply />;
      break;
    case 'learn':
      screen = <Learn />;
      break;
    case 'skill':
      screen = <SkillDetail key={parts[1]} id={parts[1] ?? ''} />;
      break;
    case 'lesson':
      screen = <LessonScreen key={parts[1]} id={parts[1] ?? ''} />;
      break;
    case 'stats':
      screen = <Stats />;
      break;
    case 'settings':
      screen = <Settings />;
      break;
    case 'practice':
      screen = <PracticeSetup />;
      break;
    case 'mistakes':
      screen = <Mistakes />;
      break;
    default:
      screen = <Today />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-24">
      {screen}
      <TabBar current={path} />
    </div>
  );
}
