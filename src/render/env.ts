import type { WeatherId } from '../core/types';

/** Per-frame values the procedural drawers may read (time, light). Set by the renderer each frame. */
export const ENV = {
  t: 0,
  hour: 9,
  weather: 'sunny' as WeatherId,
  reduceMotion: false,
  /** 0 = day, 1 = night (lamps glow). */
  dusk: 0,
};
