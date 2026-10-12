// Draws the isometric diorama: sky, ground, depth-sorted objects, emotes, weather and light.
import { CONFIG, queueSpot } from '../core/config';
import type { LocationId } from '../core/types';
import { LOCATIONS, type DecorDef } from '../data/locations';
import { PED_TYPES } from '../data/pedTypes';
import type { Game } from '../sim/game';
import { FOX_LOOK } from '../sim/looks';
import type { Ped } from '../sim/street';
import { drawSprite, onAssetsChanged } from './assets';
import { ENV } from './env';
import { smooth, WeatherFx } from './fx';
import { buildGround, GROUND_BOUNDS, waterTiles } from './ground';
import { circle, emoji, ellipse, groundCircle, P, rrect, text, type Ctx } from './iso';
import { drawCharacter, drawCup } from './proc/people';
import { drawCar } from './proc/props';
import { drawWalls } from './proc/indoor';
import { drawStand } from './proc/stand';
import './proc/buildings';

/** World-pixel area the camera keeps in view (the compact one crops building tops on phones). */
const VIEW_FULL = { minX: -400, maxX: 400, minY: -175, maxY: 418 };
const VIEW_COMPACT = { minX: -396, maxX: 396, minY: -110, maxY: 412 };

type Kind = 0 | 1 | 2 | 3 | 4; // decor, ped, car, stand, thief
interface Item {
  d: number;
  k: Kind;
  o: unknown;
}

interface Float {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}

interface Bubble {
  sx: number;
  sy: number;
  emote: string | null;
  patience: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const LETTERS = ['a', 'b', 'c'];

/** People and cars fade in/out at the left and right edges of the diorama. */
function edgeAlpha(x: number, inset = 0): number {
  return Math.max(0, Math.min(1, Math.min(x - inset, CONFIG.MAP_SIZE - inset - x) / 0.8));
}

export class Renderer {
  private ctx: Ctx;
  private dpr = 1;
  w = 0;
  h = 0;
  insets: Insets = { top: 64, right: 0, bottom: 0, left: 0 };
  /** Small screens: crop the sky above the diorama to make it bigger. */
  compact = false;
  private cam = { s: 1, ox: 0, oy: 0 };
  private camReady = false;
  private ground: { loc: LocationId; canvas: HTMLCanvasElement } | null = null;
  private water: [number, number][] = [];
  private floats: Float[] = [];
  private fx = new WeatherFx();
  private items: Item[] = [];
  private bubbles: Bubble[] = [];
  private t = 0;
  /** The fox on screen: centre of his body and the tap radius (only a tap on him counts). */
  thiefScreen: { x: number; y: number; r: number } | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private game: Game,
  ) {
    this.ctx = canvas.getContext('2d')!;
    onAssetsChanged(() => (this.ground = null));
    game.bus.on('sale', (e) => this.floats.push({ x: e.x, y: e.y - (e.cookie ? 0.35 : 0), text: `+${e.amount}${e.cookie ? ' 🍪' : ''}`, color: e.cookie ? '#a0612b' : '#2b8a3e', t: 0 }));
    game.bus.on('thief', (e) => {
      if (e.state === 'caught') this.floats.push({ x: CONFIG.STAND.x - 1, y: CONFIG.STAND.y + 0.8, text: `+${e.amount}`, color: '#2b8a3e', t: 0 });
      if (e.state === 'stole' && e.amount) this.floats.push({ x: CONFIG.STAND.x, y: CONFIG.STAND.y, text: `−${e.amount}`, color: '#e03131', t: 0 });
      const th = game.street.thief;
      if (e.state === 'hit' && th) this.floats.push({ x: th.x, y: th.y, text: `💥 ${e.amount}/${CONFIG.THIEF_HITS}`, color: '#e8590c', t: 0 });
    });
    this.resize();
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  private targetCam(): { s: number; ox: number; oy: number } {
    const i = this.insets;
    const VIEW = this.compact ? VIEW_COMPACT : VIEW_FULL;
    const availW = Math.max(100, this.w - i.left - i.right - 12);
    const availH = Math.max(100, this.h - i.top - i.bottom - 8);
    const vw = VIEW.maxX - VIEW.minX;
    const vh = VIEW.maxY - VIEW.minY;
    const s = Math.min(availW / vw, availH / vh);
    return {
      s,
      ox: i.left + 6 + availW / 2 - ((VIEW.minX + VIEW.maxX) / 2) * s,
      oy: i.top + 4 + (availH - vh * s) / 2 - VIEW.minY * s,
    };
  }

  /** Tile coordinates → CSS pixels. */
  worldToScreen(x: number, y: number, z = 0): { x: number; y: number } {
    const [px, py] = P(x, y, z);
    return { x: this.cam.ox + px * this.cam.s, y: this.cam.oy + py * this.cam.s };
  }

  /** CSS pixels → tile coordinates on the ground. */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const px = (sx - this.cam.ox) / this.cam.s;
    const py = (sy - this.cam.oy) / this.cam.s;
    return { x: px / 64 + py / 32, y: py / 32 - px / 64 };
  }

  render(dt: number): void {
    const g = this.game;
    const ctx = this.ctx;
    this.t += dt;
    const reduce = g.S.settings.reduceMotion;
    const hour = g.phase === 'title' ? 9.5 : g.D.hour;
    ENV.t = this.t;
    ENV.hour = hour;
    ENV.weather = g.D.weather;
    ENV.reduceMotion = reduce;
    ENV.dusk = smooth(18, 19.5, hour);
    const place = LOCATIONS[g.S.location];
    ENV.indoor = !!place.indoor;
    ENV.concert = g.D.events.concert && hour >= 14.5;
    ENV.trains = g.D.events.trains;

    // the canvas can change size without a resize event (hidden tab, WebView rotation)
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    if (cw > 0 && ch > 0 && (Math.abs(cw - this.w) > 0.5 || Math.abs(ch - this.h) > 0.5)) this.resize();

    const target = this.targetCam();
    if (!this.camReady || Math.abs(target.s / this.cam.s - 1) > 0.35) {
      // first frame or a big jump: snap instead of a long zoom animation
      this.cam = target;
      this.camReady = true;
    } else {
      const k = 1 - Math.exp(-dt * 7);
      this.cam.s += (target.s - this.cam.s) * k;
      this.cam.ox += (target.ox - this.cam.ox) * k;
      this.cam.oy += (target.oy - this.cam.oy) * k;
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fx.update(dt, this.w, this.h, g.D.weather, reduce, ENV.indoor);
    this.fx.drawSky(ctx, this.w, this.h, g.D.weather, hour);

    ctx.save();
    ctx.translate(this.cam.ox, this.cam.oy);
    ctx.scale(this.cam.s, this.cam.s);
    this.drawWorld(ctx, dt);
    ctx.restore();

    this.fx.drawOverlay(ctx, this.w, this.h, g.D.weather, hour, this.t, reduce, ENV.indoor);
  }

  private drawWorld(ctx: Ctx, dt: number): void {
    const g = this.game;
    const loc = g.S.location;
    const selling = g.phase === 'sell';
    if (!this.ground || this.ground.loc !== loc) {
      this.ground = { loc, canvas: buildGround(loc) };
      this.water = waterTiles(loc);
    }
    // soft shadow under the diorama
    ellipse(ctx, 0, 230, 470, 150, 'rgba(0,0,0,0.08)');
    ctx.drawImage(this.ground.canvas, GROUND_BOUNDS.x, GROUND_BOUNDS.y, GROUND_BOUNDS.w, GROUND_BOUNDS.h);
    this.drawWater(ctx);
    const walls = LOCATIONS[loc].walls;
    if (walls) drawWalls(ctx, walls);

    if (selling && g.S.settings.showZone) {
      groundCircle(ctx, CONFIG.STAND.x, CONFIG.STAND.y, g.radius);
      ctx.fillStyle = 'rgba(255,212,59,0.12)';
      ctx.fill();
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -this.t * 12;
      ctx.strokeStyle = 'rgba(240,140,0,0.75)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const decor = LOCATIONS[loc].decor;
    for (const d of decor) if (d.back) this.drawDecor(ctx, d);

    const items = this.items;
    items.length = 0;
    for (const d of decor) if (!d.back) items.push({ d: d.x + d.y, k: 0, o: d });
    for (const p of g.street.peds) items.push({ d: p.x + p.y, k: 1, o: p });
    for (const c of g.street.cars) items.push({ d: c.x + c.y + 0.3, k: 2, o: c });
    items.push({ d: CONFIG.STAND.x + CONFIG.STAND.y + 0.05, k: 3, o: null });
    if (g.street.thief) items.push({ d: g.street.thief.x + g.street.thief.y, k: 4, o: g.street.thief });
    items.sort((a, b) => a.d - b.d);

    this.bubbles.length = 0;
    this.thiefScreen = null;
    for (const it of items) {
      switch (it.k) {
        case 0:
          this.drawDecor(ctx, it.o as DecorDef);
          break;
        case 1:
          this.drawPed(ctx, it.o as Ped);
          break;
        case 2: {
          const c = it.o as { x: number; y: number; color: string; dir: number };
          const a = edgeAlpha(c.x, 0.5);
          if (a <= 0) break;
          ctx.globalAlpha = a;
          drawCar(ctx, c.x, c.y, c.color, c.dir);
          ctx.globalAlpha = 1;
          break;
        }
        case 3:
          drawStand(ctx, g, g.phase === 'sell');
          break;
        case 4:
          this.drawThief(ctx);
          break;
      }
    }

    this.drawBubbles(ctx);
    if (selling) this.drawWorkIndicators(ctx);
    this.drawFloats(ctx, dt);
  }

  private drawDecor(ctx: Ctx, d: DecorDef): void {
    const cx = d.w ? d.x + d.w / 2 : d.x;
    const cy = d.d ? d.y + d.d / 2 : d.y;
    const [sx, sy] = P(cx, cy);
    drawSprite(ctx, d.id, { x: d.x, y: d.y, sx, sy, s: d.s ?? 1, w: d.w, d: d.d });
  }

  private drawPed(ctx: Ctx, p: Ped): void {
    const alpha = edgeAlpha(p.x);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    this.drawPedInner(ctx, p);
    ctx.globalAlpha = 1;
  }

  private drawPedInner(ctx: Ctx, p: Ped): void {
    const [sx, sy] = P(p.x, p.y);
    const inQueue = p.state === 'queue' || p.state === 'toQueue';
    const facingCam = inQueue ? true : p.vx + p.vy >= 0;
    const dirX = inQueue ? 1 : p.vx - p.vy >= 0 ? 1 : -1;
    const type = PED_TYPES[p.type];
    const id = `char_${p.type}_${LETTERS[p.look.variant] ?? 'a'}_${facingCam ? 'front' : 'back'}`;
    const headY = drawCharacter(ctx, id, p.x, p.y, sx, sy, {
      kind: p.type,
      look: p.look,
      scale: type.scale,
      moving: p.moving,
      anim: p.anim,
      facingCam,
      dirX,
      hasCup: p.hasCup,
      umbrella: this.game.D.weather === 'rain' && !ENV.indoor && p.id % 3 !== 0 && !inQueue,
    });
    if (p.emote || p.state === 'queue') {
      this.bubbles.push({ sx, sy: headY, emote: p.emote, patience: p.state === 'queue' ? p.patience / Math.max(1, p.patienceMax) : -1 });
    }
  }

  private drawThief(ctx: Ctx): void {
    const th = this.game.street.thief!;
    const [sx, sy] = P(th.x, th.y);
    ctx.globalAlpha = Math.max(0.15, edgeAlpha(th.x));
    const headY = drawCharacter(ctx, 'char_fox_front', th.x, th.y, sx, sy, {
      kind: 'fox',
      look: FOX_LOOK,
      scale: 1,
      moving: th.moving,
      anim: th.anim,
      facingCam: true,
      dirX: th.dirX >= 0 ? 1 : -1,
      bag: th.bag,
      dizzy: th.state === 'caught',
      t: this.t,
    });
    ctx.globalAlpha = 1;
    if (this.game.street.thiefCatchable()) {
      const pulse = 1 + Math.sin(this.t * 10) * 0.15;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 22, 28 * pulse, 34 * pulse, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(250,82,82,0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
      this.bubbles.push({ sx, sy: headY - 4, emote: th.hits ? `${th.hits}/${CONFIG.THIEF_HITS}` : '❗', patience: -1 });
    }
    const scr = this.worldToScreen(th.x, th.y, 22);
    this.thiefScreen = { x: scr.x, y: scr.y, r: Math.max(18, 30 * this.cam.s) };
  }

  private drawBubbles(ctx: Ctx): void {
    for (const b of this.bubbles) {
      let y = b.sy - 6;
      if (b.patience >= 0) {
        const w = 22;
        rrect(ctx, b.sx - w / 2 - 1, y - 5, w + 2, 6, 3, 'rgba(255,255,255,0.9)');
        const col = b.patience > 0.5 ? '#40c057' : b.patience > 0.25 ? '#fab005' : '#fa5252';
        rrect(ctx, b.sx - w / 2, y - 4, w * Math.max(0, b.patience), 4, 2, col);
        y -= 8;
      }
      if (b.emote) {
        circle(ctx, b.sx, y - 12, 12, '#ffffff', 'rgba(0,0,0,0.12)', 1);
        ctx.beginPath();
        ctx.moveTo(b.sx - 4, y - 2);
        ctx.lineTo(b.sx + 4, y - 2);
        ctx.lineTo(b.sx, y + 4);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        emoji(ctx, b.emote, b.sx, y - 11, 14);
      }
    }
  }

  /** Progress of pouring a cup / making a pitcher. */
  private drawWorkIndicators(ctx: Ctx): void {
    const g = this.game;
    if (g.serving) {
      const k = Math.min(1, g.serving.t / g.serving.dur);
      const spot = queueSpot(0);
      const [sx, sy] = P(spot.x, spot.y, 78);
      circle(ctx, sx, sy, 13, 'rgba(255,255,255,0.95)');
      ctx.beginPath();
      ctx.arc(sx, sy, 13, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.strokeStyle = '#fab005';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      drawCup(ctx, sx, sy + 1, 1.6);
    }
    if (g.making) {
      const k = Math.min(1, g.making.t / g.making.dur);
      const [sx, sy] = P(CONFIG.STAND.x - 0.1, CONFIG.STAND.y - 0.85, 96);
      circle(ctx, sx, sy, 15, 'rgba(255,255,255,0.95)');
      ctx.beginPath();
      ctx.arc(sx, sy, 15, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.strokeStyle = '#40c057';
      ctx.lineWidth = 4;
      ctx.stroke();
      emoji(ctx, '🍋', sx, sy + 1, 15);
    }
  }

  private drawWater(ctx: Ctx): void {
    if (!this.water.length || this.game.S.settings.reduceMotion) return;
    for (const [x, y] of this.water) {
      const ph = this.t * 1.2 + x * 0.9 + y * 1.7;
      const [sx, sy] = P(x + 0.5 + Math.sin(ph) * 0.15, y + 0.5);
      ellipse(ctx, sx, sy, 9 + Math.sin(ph * 1.3) * 3, 2, 'rgba(255,255,255,0.28)');
    }
    if (this.game.S.location === 'beach') {
      ctx.beginPath();
      for (let x = 0; x <= 12; x += 0.25) {
        const [sx, sy] = P(x, 2 + Math.sin(this.t * 1.5 + x * 1.3) * 0.06);
        if (x === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  private drawFloats(ctx: Ctx, dt: number): void {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      if (f.t > 1.3) {
        this.floats.splice(i, 1);
        continue;
      }
      const [sx, sy] = P(f.x, f.y, 60 + f.t * 40);
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.3);
      text(ctx, f.text, sx, sy, 16, f.color, 'center', 900, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }
}
