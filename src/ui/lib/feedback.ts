// Sunet (WebAudio) și vibrații. Pe iOS, PWA-urile nu au acces la vibrație.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.06) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + ms / 1000);
  osc.connect(g).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + ms / 1000);
}

export function feedbackCorrect(opts: { sound: boolean; haptics: boolean }) {
  if (opts.sound) {
    tone(880, 90);
    setTimeout(() => tone(1320, 110), 70);
  }
  if (opts.haptics) navigator.vibrate?.(12);
}

export function feedbackWrong(opts: { sound: boolean; haptics: boolean }) {
  if (opts.sound) tone(196, 220, 'triangle', 0.08);
  if (opts.haptics) navigator.vibrate?.([40, 40, 40]);
}

export function feedbackKey(opts: { haptics: boolean }) {
  if (opts.haptics) navigator.vibrate?.(5);
}
