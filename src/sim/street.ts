// The living street: pedestrians walking along two lanes, the queue at the stand, cars and the fox thief.
import { CONFIG, queueSpot } from '../core/config';
import type { RNG } from '../core/rng';
import type { LocationId, PedTypeId, Vec, WeatherId } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { PED_TYPES } from '../data/pedTypes';
import { randomLook, type Look } from './looks';
import { spawnRatePerHour, type Crowd } from './traffic';

export type PedState = 'walk' | 'toQueue' | 'queue' | 'leave';

export interface Ped {
  id: number;
  type: PedTypeId;
  look: Look;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  dir: 1 | -1;
  laneY: number;
  far: boolean;
  path: Vec[];
  state: PedState;
  moving: boolean;
  atSpot: boolean;
  anim: number;
  /** Walked by while the stand was open (counts in the funnel). */
  counted: boolean;
  /** Already decided whether to stop. */
  evaluated: boolean;
  maxPrice: number;
  patience: number;
  patienceMax: number;
  waited: number;
  emote: string | null;
  emoteT: number;
  hasCup: boolean;
  gone: boolean;
}

export interface Car {
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  color: string;
}

export interface Thief {
  x: number;
  y: number;
  t: number;
  /** run: sneaks to the till; dodge: runs off after a hit; grab: at the till; flee: got away with money. */
  state: 'run' | 'dodge' | 'grab' | 'flee' | 'caught';
  anim: number;
  moving: boolean;
  dirX: number;
  bag: boolean;
  hits: number;
  speed: number;
  /** Where he runs to after a hit. */
  tx: number;
  ty: number;
}

export interface StreetHost {
  rng: RNG;
  hour(): number;
  location(): LocationId;
  weather(): WeatherId;
  /** Today's events that change the crowd. */
  crowd(): Crowd;
  selling(): boolean;
  radius(): number;
  patienceMult(): number;
  servingPed(): Ped | null;
  onSpawnCounted(): void;
  onInRange(p: Ped): void;
  onImpatient(p: Ped): void;
}

const CAR_COLORS = ['#e03131', '#1971c2', '#f59f00', '#2f9e44', '#f8f9fa', '#7048e8'];

export class Street {
  readonly peds: Ped[] = [];
  readonly queue: Ped[] = [];
  readonly cars: Car[] = [];
  thief: Thief | null = null;
  private spawnAcc = 0;
  private carTimer = 1;
  private nextId = 1;

  constructor(private host: StreetHost) {}

  reset(prewarm: boolean): void {
    this.peds.length = 0;
    this.queue.length = 0;
    this.cars.length = 0;
    this.thief = null;
    this.spawnAcc = 0;
    if (!prewarm) return;
    const rate = spawnRatePerHour(this.host.location(), this.host.hour(), this.host.weather(), this.host.crowd());
    const n = Math.min(CONFIG.MAX_PEDS - 10, Math.round(rate));
    for (let i = 0; i < n; i++) this.spawn(true);
  }

  update(dt: number): void {
    const h = this.host;
    const rate = spawnRatePerHour(h.location(), h.hour(), h.weather(), h.crowd());
    this.spawnAcc += (rate * dt) / CONFIG.HOUR_SEC;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.peds.length < CONFIG.MAX_PEDS) this.spawn(false);
    }
    const selling = h.selling();
    const r2 = h.radius() ** 2;
    for (let i = this.peds.length - 1; i >= 0; i--) {
      const p = this.peds[i];
      this.updatePed(p, dt, selling, r2);
      if (p.gone) this.peds.splice(i, 1);
    }
    this.updateCars(dt);
  }

  private updatePed(p: Ped, dt: number, selling: boolean, r2: number): void {
    if (p.emoteT > 0) {
      p.emoteT -= dt;
      if (p.emoteT <= 0) p.emote = null;
    }
    if (p.state === 'walk' || p.state === 'leave') {
      const target = p.path[0];
      if (!target) {
        p.gone = true;
        return;
      }
      if (this.moveTo(p, target.x, target.y, dt)) {
        p.path.shift();
        if (p.path.length === 0) p.gone = true;
      }
      if (p.state === 'walk' && selling && p.counted && !p.evaluated) {
        const dx = p.x - CONFIG.STAND.x;
        const dy = p.y - CONFIG.STAND.y;
        if (dx * dx + dy * dy <= r2) {
          p.evaluated = true;
          this.host.onInRange(p);
        }
      }
    } else {
      const spot = queueSpot(this.queue.indexOf(p));
      p.atSpot = this.moveTo(p, spot.x, spot.y, dt);
      if (p.atSpot) {
        p.state = 'queue';
        p.vx = -1;
        p.vy = 0;
      }
      if (p.state === 'queue') {
        p.waited += dt;
        if (this.host.servingPed() !== p) {
          p.patience -= dt;
          if (p.patience <= 0) this.host.onImpatient(p);
        }
      }
    }
    if (p.moving) p.anim += dt * (4 + p.speed * 4);
  }

  /** Moves towards a point. Returns true when arrived. */
  private moveTo(p: { x: number; y: number; vx: number; vy: number; speed: number; moving: boolean }, tx: number, ty: number, dt: number): boolean {
    const dx = tx - p.x;
    const dy = ty - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= step || dist < 1e-4) {
      p.x = tx;
      p.y = ty;
      p.moving = false;
      return true;
    }
    p.vx = dx / dist;
    p.vy = dy / dist;
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.moving = true;
    return false;
  }

  private spawn(randomX: boolean): void {
    const h = this.host;
    const rng = h.rng;
    const loc = LOCATIONS[h.location()];
    const lane = rng.chance(CONFIG.LANES[0].weight) ? CONFIG.LANES[0] : CONFIG.LANES[1];
    const dir: 1 | -1 = rng.chance(0.5) ? 1 : -1;
    const laneY = lane.y + rng.range(-CONFIG.LANE_JITTER, CONFIG.LANE_JITTER);
    const type = rng.weighted(loc.mix);
    const t = PED_TYPES[type];
    const speed = t.speed * rng.range(0.85, 1.15);
    const maxPrice = loc.fairPrice * t.priceMult * rng.range(CONFIG.WALLET_MIN, CONFIG.WALLET_MAX);
    const x0 = randomX ? rng.range(0, CONFIG.MAP_SIZE) : dir > 0 ? CONFIG.SPAWN_LEFT : CONFIG.SPAWN_RIGHT;
    const x1 = dir > 0 ? CONFIG.SPAWN_RIGHT : CONFIG.SPAWN_LEFT;
    const counted = h.selling() && !randomX;
    const p: Ped = {
      id: this.nextId++,
      type,
      look: randomLook(type),
      x: x0,
      y: laneY,
      vx: dir,
      vy: 0,
      speed,
      dir,
      laneY,
      far: lane.id === 'far',
      path: [{ x: x1, y: laneY }],
      state: 'walk',
      moving: true,
      atSpot: false,
      anim: rng.range(0, 6),
      counted,
      evaluated: false,
      maxPrice,
      patience: 0,
      patienceMax: 0,
      waited: 0,
      emote: null,
      emoteT: 0,
      hasCup: false,
      gone: false,
    };
    this.peds.push(p);
    if (counted) h.onSpawnCounted();
  }

  /** When the stand opens, people already walking towards it count as passers-by. */
  markAllCounted(): number {
    let n = 0;
    for (const p of this.peds) {
      if (p.state !== 'walk' || p.counted) continue;
      const ahead = p.dir > 0 ? p.x < CONFIG.STAND.x - 1 : p.x > CONFIG.STAND.x + 1;
      if (!ahead) continue;
      p.counted = true;
      n++;
    }
    return n;
  }

  joinQueue(p: Ped): void {
    const rng = this.host.rng;
    this.queue.push(p);
    p.state = 'toQueue';
    p.path = [];
    p.atSpot = false;
    p.patienceMax = rng.range(CONFIG.PATIENCE_MIN, CONFIG.PATIENCE_MAX) * this.host.patienceMult();
    p.patience = p.patienceMax;
    p.waited = 0;
    this.setEmote(p, '🍋', 1.4);
  }

  leave(p: Ped, emote: string | null, emoteT = 2.5): void {
    const i = this.queue.indexOf(p);
    if (i >= 0) this.queue.splice(i, 1);
    p.state = 'leave';
    p.atSpot = false;
    const exitX = p.dir > 0 ? CONFIG.SPAWN_RIGHT : CONFIG.SPAWN_LEFT;
    p.path = [
      { x: p.x + p.dir * 0.4, y: p.laneY },
      { x: exitX, y: p.laneY },
    ];
    if (emote) this.setEmote(p, emote, emoteT);
  }

  serveDone(p: Ped, emote: string): void {
    p.hasCup = true;
    this.leave(p, emote, 3);
  }

  sendAwayQueue(emote: string | null = null): void {
    for (const p of this.queue.slice()) this.leave(p, emote);
  }

  setEmote(p: Ped, emote: string, t: number): void {
    p.emote = emote;
    p.emoteT = t;
  }

  frontReady(): Ped | null {
    const p = this.queue[0];
    return p && p.state === 'queue' && p.atSpot ? p : null;
  }

  // ---------- cars (decoration only) ----------
  private updateCars(dt: number): void {
    if (LOCATIONS[this.host.location()].cars) {
      this.carTimer -= dt;
      if (this.carTimer <= 0) {
        this.carTimer = 2.5 + Math.random() * 5;
        const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        this.cars.push({
          x: dir > 0 ? -0.6 : 12.6,
          y: dir > 0 ? 6.5 : 7.5,
          dir,
          speed: 2.4 + Math.random() * 1.2,
          color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
        });
      }
    }
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      c.x += c.dir * c.speed * dt;
      if (c.x < -0.8 || c.x > 12.8) this.cars.splice(i, 1);
    }
  }

  // ---------- thief (runs on real time so speed-ups don't make it unfair) ----------
  spawnThief(): void {
    this.thief = { x: CONFIG.SPAWN_LEFT, y: 5.35, t: 0, state: 'run', anim: 0, moving: true, dirX: 1, bag: false, hits: 0, speed: CONFIG.THIEF_SPEED, tx: 0, ty: 0 };
  }

  /** Returns 'steal' at the moment the thief grabs the money. */
  updateThief(rdt: number): 'steal' | null {
    const th = this.thief;
    if (!th) return null;
    th.t += rdt;
    let result: 'steal' | null = null;
    const mover = { x: th.x, y: th.y, vx: 0, vy: 0, speed: th.speed, moving: false };
    if (th.state === 'run') {
      if (this.moveTo(mover, CONFIG.STAND.x - 1.05, CONFIG.STAND.y + 0.8, rdt)) {
        th.state = 'grab';
        th.t = 0;
      }
    } else if (th.state === 'dodge') {
      // ran off after a hit; then he tries the till again
      if (this.moveTo(mover, th.tx, th.ty, rdt)) th.state = 'run';
    } else if (th.state === 'grab') {
      mover.moving = false;
      if (th.t >= CONFIG.THIEF_WINDOW) {
        th.state = 'flee';
        th.bag = true;
        result = 'steal';
      }
    } else {
      mover.speed = th.state === 'flee' ? Math.max(3.2, th.speed) : 1.2;
      if (th.state === 'caught' && th.t < 1.3) mover.speed = 0;
      if (mover.speed > 0 && this.moveTo(mover, CONFIG.SPAWN_LEFT - 0.6, 5.6, rdt)) {
        this.thief = null;
        return result;
      }
    }
    th.x = mover.x;
    th.y = mover.y;
    th.moving = mover.moving;
    if (mover.moving) th.dirX = mover.vx - mover.vy;
    if (th.moving) th.anim += rdt * 14;
    return result;
  }

  /** The fox can be tapped while he sneaks, dodges or is at the till. */
  thiefCatchable(): boolean {
    const th = this.thief;
    return !!th && (th.state === 'run' || th.state === 'dodge' || th.state === 'grab');
  }

  /** A tap on the fox: he speeds up and runs off in another direction; the last hit catches him. */
  hitThief(): 'hit' | 'caught' | null {
    const th = this.thief;
    if (!th || !this.thiefCatchable()) return null;
    th.hits++;
    if (th.hits >= CONFIG.THIEF_HITS) {
      th.state = 'caught';
      th.t = 0;
      return 'caught';
    }
    th.speed = Math.min(CONFIG.THIEF_SPEED_MAX, th.speed * CONFIG.THIEF_SPEED_MULT);
    // a new spot far from where he is (the dice here are cosmetic, so they do not touch the game RNG)
    let best = { x: 2, y: 8 };
    let bestD = -1;
    for (let i = 0; i < 6; i++) {
      const c = { x: 0.8 + Math.random() * 10.4, y: 4.6 + Math.random() * 4.8 };
      const d = Math.hypot(c.x - th.x, c.y - th.y);
      if (d > bestD) {
        best = c;
        bestD = d;
      }
    }
    th.tx = best.x;
    th.ty = best.y;
    th.state = 'dodge';
    th.t = 0;
    return 'hit';
  }
}
