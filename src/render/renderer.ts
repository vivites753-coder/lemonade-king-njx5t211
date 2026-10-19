// Draws the isometric diorama: sky, ground, depth-sorted objects, emotes, weather and light.
import { CONFIG, queueSpot } from '../core/config';
import type { LocationId } from '../core/types';
import { LOCATIONS, type DecorDef } from '../data/locations';
import { PED_TYPES } from '../data/pedTypes';
import type { Game } from '../sim/game';
import { PointScene, type SceneSource } from '../sim/pointScene';
import { FOX_LOOK } from '../sim/looks';
import type { Critter } from '../sim/critters';
import type { Car, Ped } from '../sim/street';
import { drawSprite, onAssetsChanged, spriteShadow } from './assets';
import { ENV } from './env';
import { smooth, WeatherFx } from './fx';
import { buildGround, GROUND_BOUNDS, waterTiles } from './ground';
import { circle, emoji, ellipse, groundCircle, P, rrect, text, type Ctx } from './iso';
import { pedFacing } from './facing';
import { drawCharacter, drawCup, pedCupSpriteId, pedSpriteId, pedUmbrellaSpriteId } from './proc/people';
import { drawCarArt } from './proc/props';
import { drawWalls } from './proc/indoor';
import { drawStorePiece, drawStoreRoom, STORE_PIECES, type StorePiece } from './proc/store';
import { DOOR, ROOM_D } from '../data/storeRoom';
import { drawKey } from './depth';
import { drawCritter } from './proc/critters';
import { drawStand, drawStandPart, drawStandShadows, standSideParts, type StandPart } from './proc/stand';
import { TRUCK } from './proc/truck';
import './proc/buildings';

/** World-pixel area the camera keeps in view (the compact one crops building tops on phones). */
const VIEW_FULL = { minX: -400, maxX: 400, minY: -175, maxY: 418 };
const VIEW_COMPACT = { minX: -396, maxX: 396, minY: -110, maxY: 412 };
/** On phones the field is drawn this much bigger than "everything fits", and bigger still while selling
 * (the user tuned it in steps: 1.4, then 40 % bigger, then 40 % and 15 % smaller). */
const PHONE_ZOOM = 1.4 * 1.4 * 0.6 * 0.85;
const PHONE_SELL_ZOOM = 1.5;
/** Two fingers zoom the field between "everything fits" and this many times that. */
const PINCH_MAX = 4;
/** The stand in world pixels (the phone camera leans towards it). */
const STAND_PX = P(CONFIG.STAND.x, CONFIG.STAND.y);

type Kind = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // decor, ped, car, stand, thief, critter, a side part of the stand, a low wall of the store
interface Item {
  /** The sort key (see drawKey). */
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
  /** The player's own zoom with two fingers, on top of the camera: screen = (camera's screen) × z + (x, y). */
  private user = { z: 1, x: 0, y: 0 };
  /** While two fingers are down: where they started and the camera then. */
  private pinch0: { mx: number; my: number; d: number; s: number; ox: number; oy: number } | null = null;
  private ground: { loc: LocationId; canvas: HTMLCanvasElement } | null = null;
  private water: [number, number][] = [];
  private floats: Float[] = [];
  private fx = new WeatherFx();
  private items: Item[] = [];
  /** The middle of every decoration (they never move, and are asked for every frame). */
  private centres = new WeakMap<DecorDef, [number, number]>();
  private bubbles: Bubble[] = [];
  private t = 0;
  /** How far the glass door of the store is open (0..1): it opens when somebody comes to it. */
  private doorOpen = 0;
  /** A copy of the frame for the heat haze. */
  private haze: HTMLCanvasElement | null = null;
  /** Another stand of the player's that the scene shows now (null: the player's own). */
  private view: PointScene | null = null;
  /** Lucky finds on screen this frame (CSS px) for tapping. */
  tapTargets: { id: number; x: number; y: number; r: number }[] = [];
  /** The fox on screen: centre of his body and the tap radius (only a tap on him counts). */
  thiefScreen: { x: number; y: number; r: number } | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private game: Game,
  ) {
    this.ctx = canvas.getContext('2d')!;
    // the ground is drawn from its tiles only: nothing else that loads makes it new
    onAssetsChanged((id) => {
      if (id.startsWith('tile_')) this.ground = null;
    });
    game.bus.on('found', (e) => !this.view && this.floats.push({ x: e.x, y: e.y, text: `+${e.amount} ${e.icon}`, color: '#2b8a3e', t: 0 }));
    game.bus.on('sale', (e) => !this.view && this.floats.push({ x: e.x, y: e.y - (e.cookie ? 0.35 : 0), text: `+${e.amount}${e.cookie ? ' 🍪' : ''}`, color: e.cookie ? '#a0612b' : '#2b8a3e', t: 0 }));
    game.bus.on('thief', (e) => {
      if (this.view) return;
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

  /** The camera: the game's own (baseCam) with the player's two-finger zoom on top. */
  private targetCam(): { s: number; ox: number; oy: number } {
    const b = this.baseCam();
    const u = this.user;
    // the title screen keeps its own picture
    if (this.game.phase === 'title') return b;
    return { s: b.s * u.z, ox: b.ox * u.z + u.x, oy: b.oy * u.z + u.y };
  }

  /** Two fingers touched the field: the middle between them and the distance (CSS px). */
  pinchStart(mx: number, my: number, d: number): void {
    this.pinch0 = { mx, my, d: Math.max(10, d), ...this.cam };
  }

  /** The fingers moved: the spot that was under them stays under them, bigger or smaller with their distance. */
  pinchMove(mx: number, my: number, d: number): void {
    const p = this.pinch0;
    if (!p) return;
    const b = this.baseCam();
    const s = Math.max(b.fit, Math.min(b.fit * PINCH_MAX, (p.s * Math.max(10, d)) / p.d));
    const k = s / p.s;
    let ox = mx - (p.mx - p.ox) * k;
    let oy = my - (p.my - p.oy) * k;
    // the middle of the screen stays over the island
    const V = this.compact ? VIEW_COMPACT : VIEW_FULL;
    const cx = Math.max(V.minX, Math.min(V.maxX, (this.w / 2 - ox) / s));
    const cy = Math.max(V.minY, Math.min(V.maxY, (this.h / 2 - oy) / s));
    ox = this.w / 2 - cx * s;
    oy = this.h / 2 - cy * s;
    const z = s / b.s;
    this.user = { z, x: ox - b.ox * z, y: oy - b.oy * z };
    // the picture follows the fingers at once
    this.cam = { s, ox, oy };
  }

  pinchEnd(): void {
    this.pinch0 = null;
  }

  /** The game's camera; fit: the scale at which the whole island fits. */
  private baseCam(): { s: number; ox: number; oy: number; fit: number } {
    const i = this.insets;
    const VIEW = this.compact ? VIEW_COMPACT : VIEW_FULL;
    const availW = Math.max(100, this.w - i.left - i.right - 12);
    const availH = Math.max(100, this.h - i.top - i.bottom - 8);
    const vw = VIEW.maxX - VIEW.minX;
    const vh = VIEW.maxY - VIEW.minY;
    const fit = Math.min(availW / vw, availH / vh);
    if (!this.compact) {
      return {
        s: fit,
        ox: i.left + 6 + availW / 2 - ((VIEW.minX + VIEW.maxX) / 2) * fit,
        oy: i.top + 4 + (availH - vh * fit) / 2 - VIEW.minY * fit,
        fit,
      };
    }
    // phones: the playing field is shown 40 % bigger, centred between the middle of the island and the stand
    // (the far corners of the island, where people appear and leave, are cut off)
    const selling = this.game.phase === 'sell';
    // while selling the controls at the bottom stand over the corners of the field: they do not shrink it
    const fitH = selling ? Math.max(100, this.h - i.top - 8) : availH;
    const s = Math.min(availW / vw, fitH / vh) * PHONE_ZOOM * (selling ? PHONE_SELL_ZOOM : 1);
    // while selling the camera leans further towards the stand (the customers and the queue)
    const k = selling ? 0.62 : 0.5;
    const cx = (VIEW.minX + VIEW.maxX) / 2 + (STAND_PX[0] - (VIEW.minX + VIEW.maxX) / 2) * k;
    const cy = (VIEW.minY + VIEW.maxY) / 2 + (STAND_PX[1] - (VIEW.minY + VIEW.maxY) / 2) * k;
    return { s, ox: i.left + 6 + availW / 2 - cx * s, oy: i.top + 4 + fitH / 2 - cy * s, fit };
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

  /** What the scene shows: the game, or the stand the player looks at. */
  private get src(): SceneSource {
    return this.view ?? this.game;
  }

  /** Follows the stand the player wants to see (a new view when the stand, the game or the day changes). */
  private syncView(dt: number): void {
    const game = this.game;
    const p = game.viewPoint !== null ? game.pointById(game.viewPoint) : undefined;
    if (!p) {
      this.view = null;
      return;
    }
    if (!this.view || this.view.point !== p || Object.getPrototypeOf(this.view.S) !== game.S || Object.getPrototypeOf(this.view.D) !== game.D) {
      this.view = new PointScene(game, p);
      this.view.onSale = (x, y, n) => this.floats.push({ x, y, text: `+${n}`, color: '#2b8a3e', t: 0 });
      this.floats.length = 0;
    }
    this.view.refresh();
    // the stand's day runs with the game clock (and stops while the game waits)
    const selling = game.phase === 'sell';
    const run = game.paused || (selling && game.midKitchen) ? 0 : selling ? dt * game.speed : dt;
    this.view.update(Math.min(run, 0.3));
  }

  render(dt: number): void {
    try {
      this.draw(dt);
    } catch (e) {
      // a picture that failed half-way leaves its saved states and clips on the canvas: the next frame starts clean
      const ctx = this.ctx as Ctx & { reset?: () => void };
      if (typeof ctx.reset === 'function') ctx.reset();
      else this.canvas.width = this.canvas.width;
      throw e;
    }
  }

  private draw(dt: number): void {
    this.syncView(dt);
    const g = this.src;
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
    if (this.pinch0) {
      // two fingers move the picture themselves (pinchMove)
    } else if (!this.camReady || Math.abs(target.s / this.cam.s - 1) > 0.35) {
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
    // a hot day: the picture trembles in the rising hot air (more near the ground, most at midday)
    if (g.D.weather === 'hot' && !reduce && !ENV.indoor && g.phase !== 'title') this.heatHaze(hour);
    // its copy of the screen is big on a phone (8-16 MB): let it go on other days
    else this.haze = null;

    this.fx.drawOverlay(ctx, this.w, this.h, g.D.weather, hour, this.t, reduce, ENV.indoor);
  }

  /**
   * Heat haze: the finished picture is copied and drawn back in thin horizontal strips, each moved sideways a little
   * by waves that run upwards, like air rising from hot asphalt.
   */
  private heatHaze(hour: number): void {
    const c = this.canvas;
    const W = c.width;
    const H = c.height;
    if (!this.haze || this.haze.width !== W || this.haze.height !== H) {
      this.haze = document.createElement('canvas');
      this.haze.width = W;
      this.haze.height = H;
    }
    const b = this.haze.getContext('2d')!;
    b.clearRect(0, 0, W, H);
    b.drawImage(c, 0, 0);
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const d = this.dpr;
    // strongest in the hottest hours
    const noon = Math.max(0, Math.sin((Math.PI * (hour - 8)) / 12));
    const strength = (0.55 + 0.45 * noon) * d;
    const strip = Math.max(3, Math.round(3 * d));
    const y0 = Math.round(H * 0.18);
    const t = this.t;
    for (let y = y0; y < H; y += strip) {
      const k = (y - y0) / (H - y0);
      const amp = (0.45 + 1.45 * k) * strength;
      const yy = y / d;
      const dx = (Math.sin(yy * 0.13 + t * 4.6) + 0.6 * Math.sin(yy * 0.047 + t * 2.1 + Math.sin(yy * 0.011 + t * 0.7) * 2)) * amp;
      if (Math.abs(dx) < 0.15) continue;
      ctx.drawImage(this.haze, 0, y, W, strip, dx, y, W, strip);
    }
    ctx.restore();
  }

  /** The part of the world (world px) that the screen shows now. */
  private worldView(): { x0: number; y0: number; x1: number; y1: number } {
    const c = this.cam;
    return { x0: -c.ox / c.s, y0: -c.oy / c.s, x1: (this.w - c.ox) / c.s, y1: (this.h - c.oy) / c.s };
  }

  private drawWorld(ctx: Ctx, dt: number): void {
    const g = this.src;
    const loc = g.S.location;
    const selling = g.phase === 'sell';
    const up = g.active();
    const store = !!LOCATIONS[loc].store;
    if (!this.ground || this.ground.loc !== loc) {
      this.ground = { loc, canvas: buildGround(loc) };
      this.water = waterTiles(loc);
    }
    // soft shadow under the diorama
    ellipse(ctx, 0, 230, 470, 150, 'rgba(0,0,0,0.08)');
    ctx.drawImage(this.ground.canvas, GROUND_BOUNDS.x, GROUND_BOUNDS.y, GROUND_BOUNDS.w, GROUND_BOUNDS.h);
    this.drawWater(ctx);
    const walls = LOCATIONS[loc].walls;
    if (walls) drawWalls(ctx, walls, LOCATIONS[loc].doors);
    // the own store: its room in a cut (the menu on its wall shows today's prices)
    if (store) drawStoreRoom(ctx, g.S.price, (g.S.stock.cookies ?? 0) > 0 ? g.S.cookiePrice : null, !!up.store_ac);

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
    // what is far outside the screen is not drawn (on phones the field is zoomed in and much of it is off screen);
    // the margins are wide: a picture stands up from its point (a building is about 260 px high)
    const view = this.worldView();
    const seen = (x: number, y: number) => {
      const [px, py] = P(x, y);
      return px > view.x0 - 170 && px < view.x1 + 170 && py > view.y0 - 60 && py < view.y1 + 300;
    };
    const decorCentre = (d: DecorDef): [number, number] => {
      let c = this.centres.get(d);
      if (!c) this.centres.set(d, (c = [d.w ? d.x + d.w / 2 : d.x, d.d ? d.y + d.d / 2 : d.y]));
      return c;
    };
    // what an upgrade brings (the extra tables of the store) shows only when it works
    const shown = (d: DecorDef) => !d.needs || !!up[d.needs];
    // shadows lie on the ground, under everything that stands on it
    for (const d of decor) {
      if (!shown(d)) continue;
      const [cx, cy] = decorCentre(d);
      if (!seen(cx, cy)) continue;
      const [sx, sy] = P(cx, cy);
      spriteShadow(ctx, d.id, sx, sy, d.s ?? 1);
    }
    drawStandShadows(ctx, g);
    for (const d of decor) if (d.back && shown(d)) this.drawDecor(ctx, d);

    const items = this.items;
    items.length = 0;
    // on a street with cars the road is a layer of its own between what is behind it and what is in front of it
    const road = LOCATIONS[loc].cars;
    const key = (depth: number, y: number) => drawKey(depth, y, road);
    for (const d of decor) {
      if (d.back || !shown(d)) continue;
      const [cx, cy] = decorCentre(d);
      if (seen(cx, cy)) items.push({ d: key(cx + cy, cy), k: 0, o: d });
    }
    // somebody sitting at a table is between the chair and the table (on the left chair: in front of the chair,
    // behind the table; on the right one: in front of the table, behind the chair's back)
    for (const p of g.street.peds) {
      if (!seen(p.x, p.y)) continue;
      const sit = p.state === 'sit' && p.seat ? (p.seat.side < 0 ? 0.01 : -0.01) : 0;
      items.push({ d: key(p.x + p.y + sit, p.y), k: 1, o: p });
    }
    // the low walls of the store and its door, piece by piece among the people
    if (store) {
      this.updateDoor(g, dt);
      for (const s of STORE_PIECES) items.push({ d: key(s.cx + s.cy, s.cy), k: 7, o: s });
    }
    for (const c of g.street.cars) if (seen(c.x, c.y)) items.push({ d: key(c.x + c.y, c.y), k: 2, o: c });
    // a truck is long: its depth is that of its front left corner, so people walking past in front of it (and the lamp,
    // the mailbox, the bin there) are drawn over it; nothing behind it reaches into its picture
    // the counter of a store is long: the people of the left queue, who stand in front of its left end, are drawn after it
    const standD = g.active().truck
      ? TRUCK.x0 + TRUCK.y0 + TRUCK.d - 0.6
      : LOCATIONS[loc].store
        ? CONFIG.STAND.x + CONFIG.STAND.y - 1.8
        : CONFIG.STAND.x + CONFIG.STAND.y + 0.05;
    items.push({ d: key(standD, CONFIG.STAND.y), k: 3, o: null });
    // the sign, the mascot and the TV stand apart from the table: each one is sorted by its own depth
    for (const s of standSideParts(g)) items.push({ d: key(s.x + s.y, s.y), k: 6, o: s.part });
    const th = g.street.thief;
    if (th) items.push({ d: key(th.x + th.y, th.y), k: 4, o: th });
    for (const c of g.critters.list) items.push({ d: key(c.x + c.y + (c.kind === 'splash' ? 0.3 : 0), c.y), k: 5, o: c });
    this.tapTargets = [];
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
          const c = it.o as Car;
          const a = edgeAlpha(c.x, 0.9);
          if (a <= 0) break;
          ctx.globalAlpha = a;
          drawCarArt(ctx, c);
          ctx.globalAlpha = 1;
          break;
        }
        case 3:
          drawStand(ctx, g, g.phase === 'sell');
          break;
        case 6:
          drawStandPart(ctx, g, it.o as StandPart);
          break;
        case 7:
          drawStorePiece(ctx, it.o as StorePiece, this.doorOpen, !!up.store_neon);
          break;
        case 4:
          this.drawThief(ctx);
          break;
        case 5: {
          const c = it.o as Critter;
          const tap = drawCritter(ctx, c, this.t);
          if (tap) {
            const p = { x: this.cam.ox + tap.x * this.cam.s, y: this.cam.oy + tap.y * this.cam.s };
            this.tapTargets.push({ id: c.id, ...p, r: Math.max(22, 26 * this.cam.s) });
          }
          break;
        }
      }
    }
    // a blackout: no light in a hall, and a sign over the stand
    if (g.D.blackoutUntil > g.D.hour && selling) {
      if (ENV.indoor) {
        ctx.fillStyle = 'rgba(10,12,40,0.35)';
        ctx.fillRect(-420, -200, 840, 640);
      }
      const [bx, by] = P(CONFIG.STAND.x, CONFIG.STAND.y, 120);
      const pulse = ENV.reduceMotion ? 1 : 0.8 + Math.abs(Math.sin(this.t * 4)) * 0.3;
      circle(ctx, bx, by, 13 * pulse, '#fff9db', '#fab005', 2);
      text(ctx, '⚡', bx, by + 0.5, 14, '#000', 'center', 400);
    }

    this.drawBubbles(ctx);
    if (selling) this.drawWorkIndicators(ctx);
    this.drawFloats(ctx, dt);
  }

  /** The glass door of the store slides open while somebody is at it. */
  private updateDoor(g: SceneSource, dt: number): void {
    const at = (x: number, y: number) => Math.abs(x - DOOR.x) < 0.55 && Math.abs(y - ROOM_D) < 0.75;
    const th = g.street.thief;
    const someone = g.street.peds.some((p) => at(p.x, p.y)) || (!!th && at(th.x, th.y));
    this.doorOpen += ((someone ? 1 : 0) - this.doorOpen) * Math.min(1, dt * 8);
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
    if (p.state === 'sit' && p.seat) {
      this.drawSitter(ctx, p, p.seat.side);
      return;
    }
    const [sx, sy] = P(p.x, p.y);
    const inQueue = p.state === 'queue' || p.state === 'toQueue';
    const { facingCam, dirX } = pedFacing(p);
    const type = PED_TYPES[p.type];
    const wantUmbrella = this.src.D.weather === 'rain' && !ENV.indoor && p.id % 3 !== 0 && !inQueue;
    // a drawn picture of the person with an umbrella, if there is one; otherwise the umbrella is drawn over the plain picture
    const umbId = wantUmbrella ? pedUmbrellaSpriteId(p.type, p.look.variant, facingCam) : undefined;
    // someone who has bought lemonade walks away with the cup in the hand
    const cupId = !umbId && p.hasCup ? pedCupSpriteId(p.type, p.look.variant, facingCam) : undefined;
    const id = umbId ?? cupId ?? pedSpriteId(p.type, p.look.variant, facingCam);
    const headY = drawCharacter(ctx, id, p.x, p.y, sx, sy, {
      kind: p.type,
      look: p.look,
      scale: type.scale,
      moving: p.moving,
      anim: p.anim,
      facingCam,
      dirX,
      // the cup is in the picture (people without such a picture carry none)
      hasCup: false,
      umbrella: wantUmbrella && !umbId,
    });
    if (p.emote || p.state === 'queue') {
      this.bubbles.push({ sx, sy: headY, emote: p.emote, patience: p.state === 'queue' ? p.patience / Math.max(1, p.patienceMax) : -1 });
    }
  }

  /**
   * Somebody sitting on a chair of the store, with the cup: the standing picture is lowered so that the hips are on the
   * seat and cut below it (the table and the chair hide the legs). On the left chair they face the table and us; on
   * the right one they turn their back to us.
   */
  private drawSitter(ctx: Ctx, p: Ped, side: -1 | 1): void {
    const [sx, sy] = P(p.x, p.y);
    const type = PED_TYPES[p.type];
    const front = side < 0;
    const id = pedCupSpriteId(p.type, p.look.variant, front) ?? pedSpriteId(p.type, p.look.variant, front);
    const seat = 15;
    // a kid lowered as much would hide behind the table: kids sit up on their knees
    const drop = p.type === 'kid' ? 4 : 13 * type.scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx - 60, sy - 220, 120, 220 - seat);
    ctx.clip();
    const headY = drawCharacter(ctx, id, p.x, p.y, sx, sy + drop, {
      kind: p.type,
      look: p.look,
      scale: type.scale,
      moving: false,
      anim: p.anim,
      facingCam: front,
      dirX: front ? 1 : -1,
      hasCup: false,
      umbrella: false,
    });
    ctx.restore();
    if (p.emote) this.bubbles.push({ sx, sy: headY, emote: p.emote, patience: -1 });
  }

  private drawThief(ctx: Ctx): void {
    const th = this.src.street.thief!;
    const [sx, sy] = P(th.x, th.y);
    ctx.globalAlpha = Math.max(0.15, edgeAlpha(th.x));
    const headY = drawCharacter(ctx, th.state === 'caught' ? 'char_fox_dizzy' : 'char_fox_front', th.x, th.y, sx, sy, {
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
    if (this.src.street.thiefCatchable()) {
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
    const g = this.src;
    for (let c = 0; c < g.servings.length; c++) {
      const s = g.servings[c];
      if (!s) continue;
      const k = Math.min(1, s.t / s.dur);
      const spot = queueSpot(0, c);
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
    if (!this.water.length || this.src.S.settings.reduceMotion) return;
    for (const [x, y] of this.water) {
      const ph = this.t * 1.2 + x * 0.9 + y * 1.7;
      const [sx, sy] = P(x + 0.5 + Math.sin(ph) * 0.15, y + 0.5);
      ellipse(ctx, sx, sy, 9 + Math.sin(ph * 1.3) * 3, 2, 'rgba(255,255,255,0.28)');
    }
    if (this.src.S.location === 'beach') {
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
