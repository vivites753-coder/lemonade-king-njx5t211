import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { pedFacing } from '../src/render/facing';

describe('which way people face', () => {
  it('the queue on the right of the table faces the stand (up-left, seen from behind)', () => {
    const f = pedFacing({ state: 'queue', x: CONFIG.STAND.x + 1.5, vx: 0, vy: 0 });
    expect(f).toEqual({ facingCam: false, dirX: -1 });
  });

  it('the queue on the left of the table faces down-right, toward the stand (seen from the front)', () => {
    const f = pedFacing({ state: 'queue', x: CONFIG.STAND.x - 1.2, vx: 0, vy: 0 });
    expect(f).toEqual({ facingCam: true, dirX: 1 });
  });

  it('walkers face their direction of movement', () => {
    expect(pedFacing({ state: 'walk', x: 3, vx: 1, vy: 0 })).toEqual({ facingCam: true, dirX: 1 }); // down-right
    expect(pedFacing({ state: 'walk', x: 3, vx: -1, vy: 0 })).toEqual({ facingCam: false, dirX: -1 }); // up-left
  });

  it('people on their way to the line face where they walk (no walking backwards)', () => {
    // from the near sidewalk up to the line: up the screen, seen from behind
    expect(pedFacing({ state: 'toQueue', x: 7, vx: 0, vy: -1 })).toEqual({ facingCam: false, dirX: 1 });
    expect(pedFacing({ state: 'toQueue', x: 7, vx: -1, vy: 0 })).toEqual({ facingCam: false, dirX: -1 });
    expect(pedFacing({ state: 'toQueue', x: 3, vx: 1, vy: 0 })).toEqual({ facingCam: true, dirX: 1 });
  });
});
