import { describe, expect, it } from 'vitest';
import { paceFrame } from '../src/core/pacing';

/** Frames drawn in one second of a screen with `hz` frames a second (a little jitter), at `fps`. */
function drawnIn(hz: number, fps: number): number {
  let drawn = -Infinity;
  let n = 0;
  for (let i = 1; i <= hz; i++) {
    const now = (i * 1000) / hz + Math.sin(i * 1.7) * 0.6;
    const next = paceFrame(now, drawn, fps);
    if (next === null) continue;
    drawn = next;
    n++;
  }
  return n;
}

describe('frame pacing', () => {
  it('draws as many frames as asked for on any screen, never more than the screen has', () => {
    for (const hz of [60, 90, 120, 144]) {
      for (const fps of [20, 30, 60]) {
        const n = drawnIn(hz, Math.min(fps, hz));
        expect(n, `${hz} Hz at ${fps} fps`).toBeGreaterThanOrEqual(Math.min(fps, hz) - 3);
        expect(n, `${hz} Hz at ${fps} fps`).toBeLessThanOrEqual(Math.min(fps, hz) + 1);
      }
    }
  });

  it('starts again from now after a long pause (a hidden tab)', () => {
    const d = paceFrame(100000, 0, 60)!;
    expect(d).toBe(100000);
    // the next screen frame (8 ms later at 120 Hz) is skipped, the one after it is drawn
    expect(paceFrame(100008.3, d, 60)).toBeNull();
    expect(paceFrame(100016.7, d, 60)).not.toBeNull();
  });
});
