import { type ReactNode, useEffect, useRef, useState } from 'react';
import { exportBackup, importBackup, requestPersistence, resetAll } from '../../db/db';
import { type Pace, type Theme, useApp } from '../../store';
import { Button, Card, Chip, PageHeader } from '../components/ui';

export function Settings() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const fileRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(false));
  }, []);

  const doExport = async () => {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `4math-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Backup descărcat.');
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!confirm('Importul înlocuiește tot progresul de pe acest dispozitiv. Continui?')) return;
      await importBackup(data);
      await useApp.getState().init();
      setMessage('Progres importat.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import eșuat.');
    }
  };

  const doReset = async () => {
    if (!confirm('Ștergi tot progresul (fapte, niveluri, istoric)? Setările rămân. Nu se poate anula.')) return;
    await resetAll();
    setMessage('Progresul a fost resetat.');
  };

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="Setări" />

      <Card className="space-y-4">
        <Row title="Temă">
          {(
            [
              ['light', '☀️ Luminos'],
              ['dark', '🌙 Întunecat'],
              ['auto', 'Ca telefonul'],
            ] as [Theme, string][]
          ).map(([v, l]) => (
            <Chip key={v} active={settings.theme === v} onClick={() => update({ theme: v })}>
              {l}
            </Chip>
          ))}
        </Row>
        <Row title="Obiectiv zilnic" hint="Durata antrenamentului de azi">
          {[5, 10, 15, 20].map((m) => (
            <Chip key={m} active={settings.dailyGoalMin === m} onClick={() => update({ dailyGoalMin: m })}>
              {m} min
            </Chip>
          ))}
        </Row>
        <Row title="Ritm" hint="Cât de strict e timpul-țintă pentru „automatizat”">
          {(
            [
              ['relaxed', 'Relaxat'],
              ['normal', 'Normal'],
              ['fast', 'Rapid'],
            ] as [Pace, string][]
          ).map(([v, l]) => (
            <Chip key={v} active={settings.pace === v} onClick={() => update({ pace: v })}>
              {l}
            </Chip>
          ))}
        </Row>
        <Row title="Fapte noi simultan" hint="Câte fapte „în lucru” pot exista deodată">
          {[5, 8, 12].map((n) => (
            <Chip key={n} active={settings.maxLearning === n} onClick={() => update({ maxLearning: n })}>
              {n}
            </Chip>
          ))}
        </Row>
        <Row title="Tastatură">
          <Chip active={settings.keypad === 'phone'} onClick={() => update({ keypad: 'phone' })}>
            Telefon (1-2-3 sus)
          </Chip>
          <Chip active={settings.keypad === 'calculator'} onClick={() => update({ keypad: 'calculator' })}>
            Calculator (7-8-9 sus)
          </Chip>
        </Row>
        <Row title="Feedback">
          <Chip active={settings.sound} onClick={() => update({ sound: !settings.sound })}>
            Sunet {settings.sound ? 'pornit' : 'oprit'}
          </Chip>
          <Chip active={settings.haptics} onClick={() => update({ haptics: !settings.haptics })}>
            Vibrații {settings.haptics ? 'pornite' : 'oprite'}
          </Chip>
        </Row>
      </Card>

      <Card className="space-y-3">
        <div>
          <div className="font-semibold">Datele tale</div>
          <p className="text-sm text-muted">
            Totul stă doar pe acest dispozitiv. Fă din când în când un backup, mai ales pe iPhone, unde browserul poate șterge datele
            aplicațiilor nefolosite.
          </p>
          <p className="mt-1 text-xs text-muted">
            Stocare persistentă:{' '}
            {persisted === null ? '…' : persisted ? 'activă ✓' : 'neactivă'}
            {persisted === false && (
              <button className="ml-2 font-medium text-accent" onClick={async () => setPersisted(await requestPersistence())}>
                activează
              </button>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={doExport}>
            Exportă JSON
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Importă JSON
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
        <Button variant="danger" className="w-full" onClick={doReset}>
          Resetează progresul
        </Button>
        {message && <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{message}</div>}
      </Card>

      <p className="text-center text-xs text-muted">4Math v0.1 · Faza 1 (automatisme + descompunere)</p>
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
