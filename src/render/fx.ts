// Sky, weather particles and day/night light. All in screen space (CSS px).
import type { WeatherId } from '../core/types';
import { ellipse, type Ctx } from './iso';

interface Drop {
  x: number;
  y: number;
  v: number;
  l: number;
}
interface Leaf {
  x: number;
  y: number;
  v: number;
  a: number;
  c: string;
}
interface Cloud {
  x: number;
  y: number;
  s: number;
  v: number;
}

/** The tint of the whole picture in some weathers (none indoors). */
const TINT: Partial<Record<WeatherId, string>> = {
  cloudy: 'rgba(60,70,90,0.10)',
  rain: 'rgba(40,55,80,0.22)',
  cold: 'rgba(160,190,230,0.16)',
  hot: 'rgba(255,170,60,0.07)',
};

const SKY: Record<WeatherId, [string, string]> = {
  sunny: ['#8fd3ff', '#e3f6ff'],
  hot: ['#7cc8ff', '#fff1c9'],
  cloudy: ['#a9b9c9', '#e3e9ef'],
  rain: ['#7d8b99', '#c5cfd8'],
  wind: ['#9fd0f0', '#e8f6ff'],
  cold: ['#a8c4dc', '#eef4f9'],
};

export class WeatherFx {
  private drops: Drop[] = [];
  private leaves: Leaf[] = [];
  private clouds: Cloud[] = [];
  /** The sky gradient is made again only when the weather or the height of the screen changes. */
  private sky: { key: string; grad: CanvasGradient } | null = null;

  constructor() {
    for (let i = 0; i < 6; i++) this.clouds.push({ x: Math.random(), y: 0.05 + Math.random() * 0.22, s: 0.6 + Math.random() * 0.8, v: 0.004 + Math.random() * 0.006 });
  }

  drawSky(ctx: Ctx, w: number, h: number, weather: WeatherId, hour: number): void {
    const key = `${weather}|${h}`;
    if (!this.sky || this.sky.key !== key) {
      const [top, bottom] = SKY[weather];
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bottom);
      this.sky = { key, grad };
    }
    ctx.fillStyle = this.sky.grad;
    ctx.fillRect(0, 0, w, h);
    // evening glow
    const dusk = smooth(17, 20, hour);
    if (dusk > 0) {
      const e = ctx.createLinearGradient(0, 0, 0, h);
      e.addColorStop(0, `rgba(122,92,180,${0.45 * dusk})`);
      e.addColorStop(1, `rgba(255,150,90,${0.5 * dusk})`);
      ctx.fillStyle = e;
      ctx.fillRect(0, 0, w, h);
    }
    if (weather === 'sunny' || weather === 'hot') {
      const sx = w * 0.86;
      const sy = h * (0.12 + dusk * 0.25);
      const r = weather === 'hot' ? 60 : 44;
      const glow = ctx.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 3);
      glow.addColorStop(0, 'rgba(255,240,170,0.75)');
      glow.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6);
      ellipse(ctx, sx, sy, r * 0.55, r * 0.55, dusk > 0.5 ? '#ffb36b' : '#fff3bf');
    }
    const n = weather === 'cloudy' || weather === 'rain' ? 6 : weather === 'sunny' || weather === 'hot' ? 2 : 4;
    const col = weather === 'rain' ? 'rgba(120,130,145,0.9)' : weather === 'cloudy' ? 'rgba(235,240,245,0.95)' : 'rgba(255,255,255,0.9)';
    for (let i = 0; i < n; i++) {
      const c = this.clouds[i];
      const cx = ((c.x % 1.3) - 0.15) * w;
      const cy = c.y * h;
      const s = c.s * Math.max(0.7, w / 1400);
      ellipse(ctx, cx, cy, 60 * s, 22 * s, col);
      ellipse(ctx, cx - 38 * s, cy + 6 * s, 36 * s, 16 * s, col);
      ellipse(ctx, cx + 40 * s, cy + 4 * s, 40 * s, 18 * s, col);
      ellipse(ctx, cx + 6 * s, cy - 14 * s, 34 * s, 18 * s, col);
    }
  }

  update(dt: number, w: number, h: number, weather: WeatherId, reduceMotion: boolean, indoor = false): void {
    for (const c of this.clouds) c.x += c.v * dt * (weather === 'wind' ? 5 : 1);
    const wantDrops = weather === 'rain' && !indoor ? (reduceMotion ? 50 : 160) : 0;
    while (this.drops.length < wantDrops) this.drops.push({ x: Math.random() * w, y: Math.random() * h, v: 500 + Math.random() * 300, l: 10 + Math.random() * 10 });
    if (this.drops.length > wantDrops) this.drops.length = wantDrops;
    for (const d of this.drops) {
      d.y += d.v * dt;
      d.x -= d.v * 0.25 * dt;
      if (d.y > h) {
        d.y = -20;
        d.x = Math.random() * (w + 100);
      }
    }
    const wantLeaves = weather === 'wind' && !indoor ? (reduceMotion ? 6 : 24) : 0;
    while (this.leaves.length < wantLeaves)
      this.leaves.push({ x: -Math.random() * w, y: Math.random() * h, v: 140 + Math.random() * 120, a: Math.random() * 6, c: Math.random() < 0.5 ? '#82c91e' : '#f59f00' });
    if (this.leaves.length > wantLeaves) this.leaves.length = wantLeaves;
    for (const l of this.leaves) {
      l.x += l.v * dt;
      l.a += dt * 5;
      l.y += Math.sin(l.a) * 30 * dt;
      if (l.x > w + 20) {
        l.x = -20;
        l.y = Math.random() * h;
      }
    }
  }

  drawOverlay(ctx: Ctx, w: number, h: number, weather: WeatherId, hour: number, indoor = false): void {
    // weather tint
    const tint = TINT[weather];
    if (tint && !indoor) {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.drops.length) {
      ctx.strokeStyle = 'rgba(210,225,255,0.65)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (const d of this.drops) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.l * 0.25, d.y + d.l);
      }
      ctx.stroke();
    }
    for (const l of this.leaves) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.a);
      ellipse(ctx, 0, 0, 5, 2.5, l.c);
      ctx.restore();
    }
    // time of day
    if (hour < 9.5) {
      ctx.fillStyle = `rgba(255,200,120,${0.12 * (9.5 - hour) / 1.5})`;
      ctx.fillRect(0, 0, w, h);
    }
    const dusk = smooth(17, 19.5, hour);
    if (dusk > 0) {
      ctx.fillStyle = `rgba(255,130,50,${0.14 * dusk})`;
      ctx.fillRect(0, 0, w, h);
    }
    const night = smooth(19, 20.5, hour);
    if (night > 0) {
      ctx.fillStyle = `rgba(30,30,90,${0.25 * night})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

export function smooth(a: number, b: number, v: number): number {
  const k = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
}
