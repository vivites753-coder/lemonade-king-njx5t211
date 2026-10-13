import { CONFIG } from '../core/config';

export interface Facing {
  /** Draw the picture seen from the front (the person faces the viewer) instead of from behind. */
  facingCam: boolean;
  /** Screen direction the person moves/looks: +1 right, -1 left. */
  dirX: number;
}

interface PedMotion {
  state: string;
  x: number;
  vx: number;
  vy: number;
}

/**
 * Which way a pedestrian is drawn.
 *  - Walking (also on the way to the line): along the movement.
 *  - Waiting in the line: looking along the line toward the stand. The queue on the right of the table faces up-left
 *    (the picture of a person seen from behind), the queue on its left faces down-right (seen from the front).
 */
export function pedFacing(p: PedMotion): Facing {
  if (p.state === 'queue') {
    const toStand = CONFIG.STAND.x - p.x;
    return toStand >= 0 ? { facingCam: true, dirX: 1 } : { facingCam: false, dirX: -1 };
  }
  return { facingCam: p.vx + p.vy >= 0, dirX: p.vx - p.vy >= 0 ? 1 : -1 };
}
