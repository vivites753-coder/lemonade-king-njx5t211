// Background music (WebAudio): one track at a time, looping without a seam between the loop points of
// assets/audio/loops.json (made by tools/install_audio.py), crossfading when the track changes.
import loops from '../../assets/audio/loops.json';
import type { Game } from '../sim/game';
import { onAudioReady } from './sfx';

const URLS = import.meta.glob('/assets/audio/music/*.ogg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const LOOPS = loops as Record<string, { loopStart: number; loopEnd: number }>;
/** The music under the sounds: quieter than the effects. */
const VOLUME = 0.3;
/** Seconds of the crossfade between two tracks. */
const FADE = 1.2;
/** Decoded tracks kept in memory. */
const KEEP = 2;
/** The music has its own audio context at a low rate: a decoded track takes rate x 2 channels x 4 bytes a second,
 * so a 2-minute track is about 30 MB here instead of 45-90 MB at the device rate (48 or 96 kHz). */
const MUSIC_RATE = 32000;
let mctx: AudioContext | null = null;

const urlOf = (name: string): string | undefined => URLS[`/assets/audio/music/${name}.ogg`];

let wanted: string | null = null;
let enabled = true;
let master: GainNode | null = null;
let current: { name: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
const cache = new Map<string, AudioBuffer>();
const loading = new Set<string>();

/** The track for what the player sees now (more tracks come stage by stage, see docs/AUDIO.md). */
export function musicFor(g: Game): string {
  if (g.phase === 'title') return 'music_title';
  if (g.phase === 'sell') return 'music_sell_sunny';
  return 'music_morning';
}

/** Asks for a track (null = silence); cheap to call every frame. */
export function playMusic(name: string | null): void {
  if (name === wanted) return;
  wanted = name;
  apply();
}

export function setMusicEnabled(on: boolean): void {
  if (on === enabled) return;
  enabled = on;
  apply();
}

function apply(): void {
  const ac = mctx;
  if (!ac) return;
  const target = enabled && wanted && urlOf(wanted) ? wanted : null;
  if (current?.name === target) return;
  if (current) fadeOut(ac, current);
  current = null;
  if (!target) return;
  const buf = cache.get(target);
  if (buf) start(ac, target, buf);
  else void load(ac, target);
}

async function load(ac: AudioContext, name: string): Promise<void> {
  if (loading.has(name)) return;
  loading.add(name);
  try {
    const data = await (await fetch(urlOf(name)!)).arrayBuffer();
    const buf = await ac.decodeAudioData(data);
    cache.set(name, buf);
    while (cache.size > KEEP) cache.delete(cache.keys().next().value!);
  } catch {
    return;
  } finally {
    loading.delete(name);
  }
  // still the one the game wants?
  apply();
}

function start(ac: AudioContext, name: string, buf: AudioBuffer): void {
  if (!master) {
    master = ac.createGain();
    master.gain.value = VOLUME;
    master.connect(ac.destination);
  }
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ac.currentTime + FADE);
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lp = LOOPS[name];
  if (lp) {
    src.loopStart = lp.loopStart;
    src.loopEnd = Math.min(lp.loopEnd, buf.duration);
  }
  src.connect(gain).connect(master);
  src.start();
  current = { name, src, gain };
}

function fadeOut(ac: AudioContext, t: { src: AudioBufferSourceNode; gain: GainNode }): void {
  const now = ac.currentTime;
  t.gain.gain.cancelScheduledValues(now);
  t.gain.gain.setValueAtTime(Math.max(0.0001, t.gain.gain.value), now);
  t.gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE);
  t.src.stop(now + FADE + 0.05);
}

/** What plays now (for the developer console and checks). */
export function musicState(): { wanted: string | null; playing: string | null; enabled: boolean; cached: string[] } {
  return { wanted, playing: current?.name ?? null, enabled, cached: [...cache.keys()] };
}

// the first tap allows sound: start what the game wants by then
onAudioReady(() => {
  try {
    mctx = new AudioContext({ sampleRate: MUSIC_RATE });
  } catch {
    // a browser without a choice of rate
    mctx = new AudioContext();
  }
  document.addEventListener('visibilitychange', () => {
    if (!mctx) return;
    if (document.hidden) void mctx.suspend();
    else void mctx.resume();
  });
  apply();
});
