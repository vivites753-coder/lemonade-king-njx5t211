/**
 * Frame pacing: a phone screen asks for up to 120 frames a second, the game draws only `fps` of them. Given the time
 * of the screen's frame (`now`, ms) and when the last drawn frame was due (`drawn`), returns when this frame counts as
 * drawn, or null to skip it. The rhythm holds when the screen's frames do not divide it evenly (90 or 144 a second),
 * and after a pause (a hidden tab, a slow frame) it starts again from now.
 */
export function paceFrame(now: number, drawn: number, fps: number): number | null {
  const gap = 1000 / fps;
  const since = now - drawn;
  // a few ms of slack: the screen's frames come a little early or late
  if (since < gap - 3) return null;
  return since < 2 * gap ? drawn + gap : now;
}
