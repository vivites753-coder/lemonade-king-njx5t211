// Sound effects (WebAudio): the recorded sounds of assets/audio/sfx (installed stage by stage with
// tools/install_audio.py) and tiny synthesized ones for the game sounds that have no recording yet.
import type { SfxName } from '../sim/game';

let ac: AudioContext | null = null;
let enabled = true;
const readyHooks: ((ac: AudioContext) => void)[] = [];

/** The audio context, once the player has touched the page (browsers allow sound only after that). */
export function audioContext(): AudioContext | null {
  return ac;
}

/** Runs when sound can play (the first tap or key), or at once if it already can. */
export function onAudioReady(cb: (ac: AudioContext) => void): void {
  if (ac) cb(ac);
  else readyHooks.push(cb);
}

export function initAudio(): void {
  const unlock = () => {
    try {
      const first = !ac;
      if (!ac) ac = new AudioContext();
      if (ac.state === 'suspended') void ac.resume();
      if (first) {
        preloadRecorded();
        for (const cb of readyHooks.splice(0)) cb(ac);
      }
    } catch {
      ac = null;
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  // the game in the background (another app, a hidden tab): no sound and no music
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) void ac.suspend();
    else void ac.resume();
  });
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

// ---------------------------------------------------------------- recorded sounds

const SFX_URLS = import.meta.glob('/assets/audio/sfx/*.ogg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** A sound (file name without its variant number) and its variants: coin_1, coin_2, coin_3 → coin. */
const VARIANTS = new Map<string, string[]>();
for (const [path, url] of Object.entries(SFX_URLS)) {
  const base = path.split('/').pop()!.replace(/\.ogg$/, '').replace(/_\d+$/, '');
  VARIANTS.set(base, [...(VARIANTS.get(base) ?? []), url]);
}

/**
 * The recording of a game sound and its loudness; vary = a small random change of pitch, so repeats sound alive;
 * rate = played slower or faster (a bigger pour); jingle = a short tune, the music gets quieter under it.
 */
const RECORDED: Partial<Record<SfxName, { file: string; vol: number; vary?: number; rate?: number; jingle?: boolean }>> = {
  coin: { file: 'coin', vol: 0.5, vary: 0.05 },
  serve: { file: 'pour_cup', vol: 0.55, vary: 0.04 },
  click: { file: 'ui_tap', vol: 0.45 },
  buy: { file: 'buy', vol: 0.55 },
  buzz: { file: 'ui_error', vol: 0.4 },
  // the kitchen
  squeeze: { file: 'lemon_squeeze', vol: 0.55, vary: 0.05 },
  water: { file: 'pour_cup', vol: 0.55, rate: 0.8, vary: 0.03 },
  sugar: { file: 'sugar_pour', vol: 0.5, vary: 0.04 },
  stir: { file: 'stir_spoon', vol: 0.5, vary: 0.06 },
  mixStart: { file: 'mixer_start', vol: 0.4 },
  mixLoop: { file: 'mixer_loop', vol: 0.3 },
  mixPerfect: { file: 'mixer_perfect', vol: 0.5 },
  mixOver: { file: 'mixer_over', vol: 0.55 },
  jugReady: { file: 'jug_ready', vol: 0.5 },
  pick: { file: 'pick_item', vol: 0.4, vary: 0.05 },
  drop: { file: 'drop_item', vol: 0.45, vary: 0.05 },
  spill: { file: 'spill', vol: 0.55, vary: 0.04 },
  ice: { file: 'ice_clink', vol: 0.5, vary: 0.05 },
  // the jingles of the day
  dayStart: { file: 'jingle_day_start', vol: 0.45, jingle: true },
  profit: { file: 'jingle_profit', vol: 0.45, jingle: true },
  loss: { file: 'jingle_loss', vol: 0.45, jingle: true },
  repUp: { file: 'jingle_rep_up', vol: 0.45, jingle: true },
  unlock: { file: 'jingle_unlock', vol: 0.45, jingle: true },
  king: { file: 'jingle_king', vol: 0.5, jingle: true },
};

/** Makes the music quieter for a while (set by the music: a jingle plays over it). */
let duckMusic: ((seconds: number) => void) | null = null;
export function setMusicDucker(fn: (seconds: number) => void): void {
  duckMusic = fn;
}

/** Decoded recordings by URL: undefined = not loaded yet, null = could not be decoded. */
const buffers = new Map<string, AudioBuffer | null>();
const loading = new Set<string>();
const lastVariant = new Map<SfxName, number>();
const lastAt = new Map<SfxName, number>();

function load(url: string): void {
  if (!ac || buffers.has(url) || loading.has(url)) return;
  const ctx = ac;
  loading.add(url);
  fetch(url)
    .then((r) => r.arrayBuffer())
    .then((b) => ctx.decodeAudioData(b))
    .then((buf) => buffers.set(url, buf))
    .catch(() => buffers.set(url, null))
    .finally(() => loading.delete(url));
}

function preloadRecorded(): void {
  for (const r of Object.values(RECORDED)) for (const url of VARIANTS.get(r!.file) ?? []) load(url);
}

/** Plays the recording of a game sound; false when there is none (yet), then the synthesized one plays. */
function playRecorded(name: SfxName): boolean {
  const r = RECORDED[name];
  const urls = r ? VARIANTS.get(r.file) : undefined;
  if (!ac || !r || !urls?.length) return false;
  // the same sound twice within a moment (helpers pouring at x3): once is enough
  const now = ac.currentTime;
  if (now - (lastAt.get(name) ?? -1) < 0.035) return true;
  // another variant than last time
  let i = Math.floor(Math.random() * urls.length);
  if (urls.length > 1 && i === lastVariant.get(name)) i = (i + 1) % urls.length;
  const buf = buffers.get(urls[i]);
  if (!buf) {
    load(urls[i]);
    return false;
  }
  lastVariant.set(name, i);
  lastAt.set(name, now);
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = (r.rate ?? 1) * (1 + (Math.random() * 2 - 1) * (r.vary ?? 0));
  const g = ac.createGain();
  g.gain.value = r.vol;
  src.connect(g).connect(ac.destination);
  src.start();
  if (r.jingle) duckMusic?.(buf.duration);
  return true;
}

/**
 * Plays a recorded sound once and gives a function that cuts it short with a quick fade (the pour sound stops
 * when the player lets go of the button). Nothing plays while the sound is off or not loaded yet.
 */
export function playHeld(name: SfxName): () => void {
  const r = RECORDED[name];
  const urls = r ? VARIANTS.get(r.file) : undefined;
  if (!enabled || !ac || !r || !urls?.length) return () => {};
  const url = urls[Math.floor(Math.random() * urls.length)];
  const buf = buffers.get(url);
  if (!buf) {
    load(url);
    return () => {};
  }
  const ctx = ac;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = (r.rate ?? 1) * (1 + (Math.random() * 2 - 1) * (r.vary ?? 0));
  const g = ctx.createGain();
  g.gain.value = r.vol;
  src.connect(g).connect(ctx.destination);
  src.start();
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    try {
      src.stop(now + 0.1);
    } catch {
      // it has ended by itself already
    }
  };
}

/**
 * Plays a recorded sound over and over (the mixer motor) from `delay` seconds on, until the returned function
 * stops it. Nothing plays while the sound is off or the recording is not loaded yet.
 */
export function loopSfx(name: SfxName, delay = 0): () => void {
  const r = RECORDED[name];
  const url = r ? VARIANTS.get(r.file)?.[0] : undefined;
  if (!enabled || !ac || !r || !url) return () => {};
  const buf = buffers.get(url);
  if (!buf) {
    load(url);
    return () => {};
  }
  const ctx = ac;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(r.vol, t0 + 0.12);
  src.connect(g).connect(ctx.destination);
  src.start(t0);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(Math.max(0.0001, now < t0 ? 0.0001 : g.gain.value), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    src.stop(Math.max(now, t0) + 0.12);
  };
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
  if (playRecorded(name)) return;
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
    case 'serve':
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
    case 'crash':
      noise(0.35, 2400, 0.14);
      tone(520, 0.08, 'square', 0.05, 0.02, 1400);
      tone(900, 0.06, 'triangle', 0.05, 0.12, 1800);
      break;
    case 'zap':
      tone(1200, 0.25, 'sawtooth', 0.05, 0, 80);
      noise(0.2, 3000, 0.06);
      break;
    case 'woof':
      for (let i = 0; i < 2; i++) {
        tone(240, 0.11, 'sawtooth', 0.07, i * 0.22, 140);
        noise(0.08, 500, 0.06);
      }
      break;
    case 'ice':
      tone(2400, 0.05, 'triangle', 0.05);
      tone(3100, 0.06, 'triangle', 0.04, 0.05);
      tone(2700, 0.05, 'triangle', 0.04, 0.1);
      break;
    case 'meow':
      tone(620, 0.35, 'triangle', 0.07, 0, 880);
      tone(880, 0.25, 'triangle', 0.05, 0.3, 520);
      break;
  }
}
