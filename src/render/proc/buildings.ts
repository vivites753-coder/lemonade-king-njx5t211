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

/**
 * The own store (level 4): a cream house with a big shop window, a glass door, a striped awning over the counter in
 * front of it and the signboard above. The counter itself is the stand's (stand_store_counter).
 */
function store(ctx: Ctx, c: SpriteCall): void {
  const x = c.x;
  const y = c.y;
  const w = (c.w as number) ?? 4.5;
  const d = (c.d as number) ?? 1.8;
  const h = 118;
  const wall = '#fff4d6';
  box(ctx, x, y, w, d, h, 0, wall);
  // the parapet of the flat roof
  box(ctx, x - 0.05, y - 0.05, w + 0.1, d + 0.1, 7, h, '#f2c94c');
  const front = w * 32;
  faceY(ctx, x, y + d, 0, () => {
    // the plinth
    ctx.fillStyle = '#c8b38f';
    ctx.fillRect(0, -8, front, 8);
    // two shop windows and the glass door between them
    const win = (u0: number, u1: number) => {
      rrect(ctx, u0, -78, u1 - u0, 64, 3, '#bfe3f5', '#ffffff', 3);
      line(ctx, u0 + 8, -70, u0 + 22, -56, 'rgba(255,255,255,0.7)', 3);
      // lemons and jugs on the shelf of the window
      ctx.fillStyle = '#e9c46a';
      ctx.fillRect(u0 + 4, -30, u1 - u0 - 8, 4);
      for (let i = 0; i < 4; i++) ellipse(ctx, u0 + 10 + i * ((u1 - u0 - 20) / 3), -34, 4.5, 3.5, '#ffd43b', '#e8b500', 0.8);
      rrect(ctx, u0 + (u1 - u0) / 2 - 5, -50, 10, 16, 2, 'rgba(255,224,102,0.9)', '#74c0fc', 1);
    };
    win(10, front * 0.42);
    win(front * 0.62, front - 10);
    rrect(ctx, front * 0.46, -68, front * 0.12, 68, 3, '#8fd16a', '#5c940d', 2);
    rrect(ctx, front * 0.46 + 4, -62, front * 0.12 - 8, 40, 2, '#d0ebff');
    circle(ctx, front * 0.46 + front * 0.12 - 6, -32, 1.8, '#ffd43b');
    // the signboard over the awning
    rrect(ctx, front * 0.12, -114, front * 0.76, 22, 6, '#ffd43b', '#e8590c', 2);
    text(ctx, `🍋 ${t('world.storeSign')}`, front / 2, -103, 12, '#c92a2a', 'center', 900);
    // flower boxes under the windows
    for (const u of [12, front * 0.62 + 2]) {
      rrect(ctx, u, -14, front * 0.3, 6, 2, '#a0522d');
      for (let i = 0; i < 5; i++) circle(ctx, u + 5 + i * (front * 0.3 - 10) / 4, -16, 3, i % 2 ? '#ff7aa8' : '#ffffff');
    }
  });
  faceX(ctx, x + w, y + d, 0, () => {
    rrect(ctx, 14, -78, 22, 30, 2, '#bfe3f5', '#ffffff', 2);
  });
  // the awning: yellow and white stripes from the wall out over the counter
  const z0 = 86;
  const z1 = 76;
  const out = 0.75;
  const n = Math.max(6, Math.round(w * 3));
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    poly(ctx, [P(x + i * sw, y + d, z0), P(x + (i + 1) * sw, y + d, z0), P(x + (i + 1) * sw, y + d + out, z1), P(x + i * sw, y + d + out, z1)], i % 2 ? '#ffffff' : '#ffd43b');
  }
  // the scalloped edge of the awning
  for (let i = 0; i < n; i++) {
    const [ax, ay] = P(x + i * sw, y + d + out, z1);
    const [bx, by] = P(x + (i + 1) * sw, y + d + out, z1);
    poly(ctx, [[ax, ay], [bx, by], [(ax + bx) / 2, (ay + by) / 2 + 6]], i % 2 ? '#f1f3f5' : '#fab005');
  }
  // its side
  poly(ctx, [P(x + w, y + d, z0), P(x + w, y + d + out, z1), P(x + w, y + d + out, z1 - 6)], '#e8b500');
}

/** The town hall: a stone house with columns, a clock tower and a flag. */
function townhall(ctx: Ctx, c: SpriteCall): void {
  const x = c.x;
  const y = c.y;
  const w = (c.w as number) ?? 3.75;
  const d = (c.d as number) ?? 2.5;
  const h = 104;
  const wall = '#f1e3c8';
  box(ctx, x, y, w, d, h, 0, wall);
  box(ctx, x - 0.08, y - 0.08, w + 0.16, d + 0.16, 8, h, '#d9c49e');
  const front = w * 32;
  faceY(ctx, x, y + d, 0, () => {
    // steps and the door
    ctx.fillStyle = '#d9c49e';
    ctx.fillRect(front / 2 - 26, -6, 52, 6);
    rrect(ctx, front / 2 - 13, -46, 26, 40, 10, '#8a5a35', '#5c3d1e', 2);
    line(ctx, front / 2, -46, front / 2, -6, '#5c3d1e', 1.5);
    // columns
    for (const u of [10, 30, front - 40, front - 20]) {
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(u, -92, 9, 86);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(u + 6, -92, 3, 86);
    }
    // windows between the columns, two floors
    for (const u of [18, front - 32]) for (const v of [-86, -48]) rrect(ctx, u + 2, v, 9, 22, 4, '#a5d8ff', '#ffffff', 1.5);
    // the name over the door
    rrect(ctx, front / 2 - 34, -66, 68, 14, 3, '#ffffff', '#8a5a35', 1.5);
    text(ctx, t('world.townhall'), front / 2, -59, 9, '#8a5a35', 'center', 900);
  });
  faceX(ctx, x + w, y + d, 0, () => {
    for (let i = 0; i < 3; i++) for (const v of [-86, -48]) rrect(ctx, 12 + i * 24, v, 10, 22, 4, '#a5d8ff', '#ffffff', 1.5);
  });
  // the pediment over the columns
  poly(ctx, [P(x + w * 0.25, y + d, h + 8), P(x + w * 0.75, y + d, h + 8), P(x + w / 2, y + d, h + 30)], '#fffaf0', '#d9c49e', 1.5);
  // the clock tower
  const tx = x + w / 2 - 0.45;
  const ty = y + d / 2 - 0.45;
  box(ctx, tx, ty, 0.9, 0.9, 52, h + 8, '#efd9ad');
  faceY(ctx, tx, ty + 0.9, h + 8, () => {
    circle(ctx, 14.4, -30, 10, '#ffffff', '#5c3d1e', 2);
    const a = ((ENV.hour % 12) / 12) * Math.PI * 2;
    line(ctx, 14.4, -30, 14.4 + Math.sin(a) * 5, -30 - Math.cos(a) * 5, '#212529', 1.6);
    line(ctx, 14.4, -30, 14.4, -37, '#212529', 1.2);
  });
  // the roof of the tower and the flag
  const top = h + 60;
  poly(ctx, [P(tx - 0.05, ty + 0.95, top), P(tx + 0.95, ty + 0.95, top), P(tx + 0.45, ty + 0.45, top + 30)], '#2bb3a3');
  poly(ctx, [P(tx + 0.95, ty + 0.95, top), P(tx + 0.95, ty - 0.05, top), P(tx + 0.45, ty + 0.45, top + 30)], '#1f8f82');
  const [fx, fy] = P(tx + 0.45, ty + 0.45, top + 30);
  line(ctx, fx, fy, fx, fy - 22, '#495057', 1.5);
  const wave = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 3) * 2;
  poly(ctx, [[fx, fy - 22], [fx + 16, fy - 19 + wave], [fx, fy - 14]], '#4dabf7');
}

registerProcs({
  bld_store: store,
  bld_townhall: townhall,
  bld_house_yard: house,
  bld_school: school,
  bld_fountain: fountain,
  bld_lifeguard: lifeguard,
});
