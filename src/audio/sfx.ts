// Tiny synthesized sound effects (WebAudio) — no audio files needed for the prototype.
import type { SfxName } from '../sim/game';

let ac: AudioContext | null = null;
let enabled = true;

export function initAudio(): void {
  const unlock = () => {
    try {
      if (!ac) ac = new AudioContext();
      if (ac.state === 'suspended') void ac.resume();
    } catch {
      ac = null;
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, when = 0, slideTo?: number): void {
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, freq: number, vol = 0.12): void {
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(ac.destination);
  src.start();
}

export function play(name: SfxName): void {
  if (!enabled || !ac) return;
  switch (name) {
    case 'coin':
      tone(988, 0.08, 'square', 0.05);
      tone(1319, 0.16, 'square', 0.05, 0.07);
      break;
    case 'click':
      tone(620, 0.05, 'triangle', 0.08);
      break;
    case 'pop':
      tone(420, 0.09, 'sine', 0.12, 0, 880);
      break;
    case 'buzz':
      tone(150, 0.2, 'sawtooth', 0.05);
      break;
    case 'pour':
      noise(0.35, 1400, 0.08);
      tone(320, 0.3, 'sine', 0.04, 0, 640);
      break;
    case 'splash':
      noise(0.25, 900, 0.12);
      break;
    case 'alarm':
      for (let i = 0; i < 3; i++) {
        tone(880, 0.1, 'square', 0.05, i * 0.22);
        tone(660, 0.1, 'square', 0.05, i * 0.22 + 0.11);
      }
      break;
    case 'fanfare':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, i * 0.1));
      break;
    case 'mix':
      tone(180, 0.5, 'sawtooth', 0.03, 0, 260);
      noise(0.45, 600, 0.05);
      break;
    case 'break':
      tone(300, 0.12, 'square', 0.06, 0, 120);
      noise(0.2, 300, 0.12);
      break;
    case 'buy':
      tone(660, 0.1, 'triangle', 0.1);
      tone(990, 0.18, 'triangle', 0.1, 0.09);
      break;
  }
}
