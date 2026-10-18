// The order the scene is drawn in, back to front.

/** The road of the streets with cars: tile rows 6 and 7 (the lane to the left at y = 6.5, the one to the right at 7.5). */
export const ROAD = { y0: 6, y1: 8 };

/**
 * The sort key of a thing in the scene: its depth (x + y), and on a street with cars three layers. Everything behind
 * the road comes first, then the cars, lane by lane (the far lane, then the near one) and along each lane by depth,
 * then everything in front of the road. A car is long: sorted by its middle among people and other cars, a bus in the
 * far lane could come out in front of a car in the near lane. For things that can overlap on the screen the layers
 * give the same order as the depth, so nothing else changes.
 */
export function drawKey(depth: number, y: number, road: boolean): number {
  if (!road || y < ROAD.y0) return depth;
  if (y < ROAD.y1) return 1000 + y * 100 + depth;
  return 3000 + depth;
}
