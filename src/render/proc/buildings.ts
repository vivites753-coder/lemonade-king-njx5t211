// Procedural buildings: grandma's house, the school, the park fountain, the lifeguard tower.
import { t } from '../../i18n';
import { registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, faceX, faceY, line, P, poly, rrect, shade, text, type Ctx } from '../iso';

function house(ctx: Ctx, c: SpriteCall): void {
  const x = c.x;
  const y = c.y;
  const w = (c.w as number) ?? 3;
  const d = (c.d as number) ?? 2.4;
  const h = 58;
  const wall = '#fff1d6';
  box(ctx, x, y, w, d, h, 0, wall);
  // door and windows on the front (+y) face
  faceY(ctx, x, y + d, 0, () => {
    rrect(ctx, 44, -34, 18, 34, 3, '#a0522d');
    circle(ctx, 58, -17, 1.6, '#ffd43b');
    for (const wx of [10, 74]) {
      rrect(ctx, wx, -44, 16, 16, 2, '#74c0fc', '#ffffff', 2);
      line(ctx, wx + 8, -44, wx + 8, -28, '#ffffff', 1.5);
      rrect(ctx, wx - 2, -27, 20, 4, 1.5, '#ff8787');
    }
  });
  faceX(ctx, x + w, y + d, 0, () => {
    rrect(ctx, 22, -44, 16, 16, 2, '#74c0fc', '#ffffff', 2);
  });
  // roof: ridge along x
  const rh = 30;
  const zt = h;
  poly(ctx, [P(x - 0.1, y + d + 0.15, zt - 2), P(x + w + 0.1, y + d + 0.15, zt - 2), P(x + w + 0.1, y + d / 2, zt + rh), P(x - 0.1, y + d / 2, zt + rh)], '#e2574c');
  poly(ctx, [P(x + w, y + d, zt), P(x + w, y, zt), P(x + w, y + d / 2, zt + rh)], shade(wall, 0.78));
  poly(ctx, [P(x + w + 0.1, y + d + 0.15, zt - 2), P(x + w + 0.1, y - 0.15, zt - 2), P(x + w + 0.1, y + d / 2, zt + rh)], 'rgba(0,0,0,0)', '#c0392b', 2);
  box(ctx, x + w * 0.7, y + d * 0.25, 0.3, 0.3, 26, zt + 10, '#b5651d');
  if (!ENV.reduceMotion) {
    const [cx, cy] = P(x + w * 0.7 + 0.15, y + d * 0.25 + 0.15, zt + 40);
    for (let i = 0; i < 3; i++) {
      const k = (ENV.t * 0.5 + i / 3) % 1;
      circle(ctx, cx + k * 10, cy - k * 30, 3 + k * 5, `rgba(255,255,255,${0.5 * (1 - k)})`);
    }
  }
}

function school(ctx: Ctx, c: SpriteCall): void {
  const x = c.x;
  const y = c.y;
  const w = (c.w as number) ?? 8;
  const d = (c.d as number) ?? 2.3;
  const h = 84;
  const wall = '#f4c7a1';
  box(ctx, x, y, w, d, h, 0, wall);
  box(ctx, x - 0.05, y - 0.05, w + 0.1, d + 0.1, 6, h, '#c97c5d');
  const front = w * 32;
  faceY(ctx, x, y + d, 0, () => {
    // windows: two floors
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 9; i++) {
        const wx = 10 + i * ((front - 20) / 9);
        if (row === 0 && i === 4) continue;
        rrect(ctx, wx, -76 + row * 36, 18, 20, 2, '#a5d8ff', '#ffffff', 2);
      }
    }
    // door
    rrect(ctx, front / 2 - 14, -34, 28, 34, 3, '#1971c2');
    line(ctx, front / 2, -34, front / 2, 0, '#ffffff', 1.5);
    // sign plate
    rrect(ctx, front / 2 - 40, -54, 80, 16, 4, '#ffffff', '#1971c2', 2);
    text(ctx, t('world.school'), front / 2, -46, 11, '#1971c2');
    // clock
    circle(ctx, front / 2, -70, 7, '#ffffff', '#495057', 1.5);
    line(ctx, front / 2, -70, front / 2, -75, '#212529', 1.4);
    line(ctx, front / 2, -70, front / 2 + 4, -70, '#212529', 1.4);
  });
  faceX(ctx, x + w, y + d, 0, () => {
    for (let i = 0; i < 2; i++) for (let row = 0; row < 2; row++) rrect(ctx, 14 + i * 32, -76 + row * 36, 16, 20, 2, '#a5d8ff', '#ffffff', 2);
  });
}

function fountain(ctx: Ctx, c: SpriteCall): void {
  const { sx, sy } = c;
  ellipse(ctx, sx, sy, 50, 25, '#adb5bd');
  ellipse(ctx, sx, sy - 6, 50, 25, '#ced4da');
  ellipse(ctx, sx, sy - 6, 42, 20, '#4dabf7');
  ellipse(ctx, sx - 10, sy - 9, 18, 6, 'rgba(255,255,255,0.35)');
  rrect(ctx, sx - 5, sy - 34, 10, 30, 3, '#ced4da');
  ellipse(ctx, sx, sy - 34, 14, 6, '#adb5bd');
  if (!ENV.reduceMotion) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const k = (ENV.t * 1.2 + i * 0.13) % 1;
      const r = 6 + k * 26;
      circle(ctx, sx + Math.cos(a) * r, sy - 40 - Math.sin(k * Math.PI) * 18 + Math.sin(a) * r * 0.45, 2, 'rgba(165,216,255,0.9)');
    }
  }
}

function lifeguard(ctx: Ctx, c: SpriteCall): void {
  const { x, y } = c;
  for (const [dx, dy] of [
    [-0.3, -0.3],
    [0.25, -0.3],
    [-0.3, 0.25],
    [0.25, 0.25],
  ])
    box(ctx, x + dx, y + dy, 0.06, 0.06, 46, 0, '#f1f3f5');
  box(ctx, x - 0.35, y - 0.35, 0.7, 0.7, 4, 46, '#c58b4f');
  box(ctx, x - 0.3, y - 0.3, 0.6, 0.6, 26, 50, '#ff6b6b');
  faceY(ctx, x - 0.3, y + 0.3, 50, () => {
    rrect(ctx, 3, -22, 13, 12, 2, '#a5d8ff');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -8, 19, 3);
  });
  poly(ctx, [P(x - 0.45, y - 0.45, 76), P(x + 0.45, y - 0.45, 76), P(x + 0.45, y + 0.45, 76), P(x - 0.45, y + 0.45, 76)], '#ffffff');
  const [fx, fy] = P(x, y, 76);
  line(ctx, fx, fy, fx, fy - 26, '#495057', 1.5);
  poly(ctx, [[fx, fy - 26], [fx + 14, fy - 22], [fx, fy - 18]], '#fa5252');
}

registerProcs({
  bld_house_yard: house,
  bld_school: school,
  bld_fountain: fountain,
  bld_lifeguard: lifeguard,
});
