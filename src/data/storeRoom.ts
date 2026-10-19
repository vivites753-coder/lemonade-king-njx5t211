// The room of the own store (level 4): where its walls and its door are, for the people who walk in and out and for
// the drawing (src/render/proc/store.ts).
import type { Vec } from '../core/types';

/** The room: x from 0 to 12 along the back wall, y from 0 to ROOM_D. Its low front wall stands at y = ROOM_D, its
 * low side wall at x = 12. */
export const ROOM_D = 5;
/** The doorway in the front wall (tile x): on the left of the counter, so that its frame hides nothing of it. */
export const DOOR = { x0: 2.4, x1: 3.2, x: 2.8 };
/** Where people step through the doorway: just inside and just outside. */
export const DOOR_IN: Vec = { x: DOOR.x, y: ROOM_D - 0.45 };
export const DOOR_OUT: Vec = { x: DOOR.x, y: ROOM_D + 0.4 };
/** The chairs stand this far on the left and on the right of their table (tiles). */
export const CHAIR_DX = 0.42;

/** A chair of the store: on the left of its table (side −1, its sitter faces the camera) or on the right (side 1). */
export interface Seat {
  x: number;
  y: number;
  side: -1 | 1;
}

/** Inside the room (behind its front wall). */
export function inRoom(p: Vec): boolean {
  return p.y < ROOM_D;
}
