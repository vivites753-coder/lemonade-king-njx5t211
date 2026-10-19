// The room of the own store (level 4): where its walls and its door are, for the people who walk in and out and for
// the drawing (src/render/proc/store.ts).
import { CONFIG } from '../core/config';
import type { Vec } from '../core/types';

/** The room: x from 0 to 12 along the back wall, y from 0 to ROOM_D. Its low front wall stands at y = ROOM_D, its
 * low side wall at x = 12. */
export const ROOM_D = 5;
/** The doorway in the front wall (tile x): on the left of the counter, so that its frame hides nothing of it. */
export const DOOR = { x0: 2.4, x1: 3.2, x: 2.8 };
/** Where people step through the doorway: just inside and just outside. */
export const DOOR_IN: Vec = { x: DOOR.x, y: ROOM_D - 0.45 };
export const DOOR_OUT: Vec = { x: DOOR.x, y: ROOM_D + 0.4 };
/**
 * The counter of the store stands at the back, in front of the shelves (elsewhere the stand is at CONFIG.STAND): the
 * whole stand (the counter, the sellers, what stands at it) and its queues are this much further back (tiles). What
 * passers-by notice stays at the front: the shop window and the door.
 */
export const STORE_COUNTER_DY = -1.85;
/** The ends of the counter along the back wall (tile x; see storeCounter in src/render/proc/stand.ts). */
export const COUNTER_X: [number, number] = [CONFIG.STAND.x - 2.0, CONFIG.STAND.x + 0.8];
/** The aisle of the room: people walk along it between the door, the queues and the tables, which stand behind the
 * queues or in front of the aisle. */
export const AISLE_Y = 3.0;
export const AISLE_IN: Vec = { x: DOOR.x, y: AISLE_Y };
/** The chairs stand this far from their table (tiles): one on its left, one behind it. */
export const CHAIR_DX = 0.42;
/** The seat of a chair: this high above the floor (world px). People sit on it. */
export const SEAT_H = 14.5;

/** A chair of the store: on the left of its table (side −1: its sitter faces the table to the lower right) or behind
 * it (side 1: the sitter faces the table to the lower left). Both sitters face the camera. */
export interface Seat {
  x: number;
  y: number;
  side: -1 | 1;
}

/** The table of a chair. */
export function seatTable(s: Seat): Vec {
  return s.side < 0 ? { x: s.x + CHAIR_DX, y: s.y } : { x: s.x, y: s.y + CHAIR_DX };
}

/**
 * The last steps to a chair from the open floor (and the first ones when getting up), round its table and never across
 * it: the left chair from in front of it (from behind, at a table in front of the aisle), the chair behind the table
 * from its right side.
 */
export function seatApproach(s: Seat): Vec[] {
  const t = seatTable(s);
  const front = t.y > AISLE_Y;
  if (s.side < 0) return [{ x: s.x, y: front ? t.y - 0.55 : t.y + 0.55 }];
  const side = { x: t.x + 0.55, y: s.y };
  return front ? [side] : [{ x: t.x + 0.55, y: t.y + 0.55 }, side];
}

/** How far back the stand stands (tiles): in the own store at its back wall, elsewhere where it always is. */
export function counterDy(store: boolean): number {
  return store ? STORE_COUNTER_DY : 0;
}

/** Inside the room (behind its front wall). */
export function inRoom(p: Vec): boolean {
  return p.y < ROOM_D;
}
