// The living street: pedestrians walking along two lanes, the queue at the stand, cars and the fox thief.
import { CONFIG, queueSpot } from '../core/config';
import { RNG } from '../core/rng';
import type { LocationId, PedTypeId, Vec, WeatherId } from '../core/types';
import { LOCATIONS, type BusStopDef } from '../data/locations';
import { DOOR_IN as STORE_IN, DOOR_OUT as STORE_OUT, inRoom, ROOM_D, type Seat } from '../data/storeRoom';
import { PED_TYPES } from '../data/pedTypes';
import { randomLook, type Look } from './looks';
import { spawnRatePerHour, type Crowd } from './traffic';

/** toSeat / sit: in the store, a served customer goes to a free chair and sits there for a while. */
export type PedState = 'walk' | 'toQueue' | 'queue' | 'leave' | 'toSeat' | 'sit';

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
  /** Which counter's queue the person stands in. */
  counter: number;
  /** The chair of the store taken by this customer, and the seconds left to sit there. */
  seat: Seat | null;
  sitT: number;
}

/** A bus of a bus stop: it brakes to the stop, waits while its people get off, and drives on. */
export interface Bus {
  state: 'in' | 'dwell' | 'out';
  /** Seconds (simulation) since it stopped. */
  t: number;
  /** The people who get off here, and how many already did. */
  load: number;
  released: number;
}

export interface Car {
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  /** The speed on a free road (behind a slower car or a stopped bus the car drives slower for a while). */
  cruise: number;
  color: string;
  /** Which drawn car: 0-3 small cars, 4 the van, 5 the bus. */
  variant: number;
  bus?: Bus;
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
  /** The way to the current target (through the door of the store), and that target. */
  path: Vec[];
  pathTo: string;
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
  /** Someone is pouring a cup for this person right now (their patience does not run out). */
  isServed(p: Ped): boolean;
  onSpawnCounted(): void;
  onInRange(p: Ped): void;
  onImpatient(p: Ped): void;
  /** The place is the own store: people walk in and out through its door (see storeRoom.ts). */
  store(): boolean;
  /** The chairs of the store where served customers may sit down, and how much longer they stay than usual. */
  seats(): Seat[];
  sitMult(): number;
  /** A customer leaves the table: maybe a tip. */
  onTip(p: Ped): void;
}

const seatKey = (s: Seat) => `${s.x},${s.y}`;

const CAR_COLORS = ['#e03131', '#1971c2', '#f59f00', '#2f9e44', '#f8f9fa', '#7048e8'];
/** The two lanes of the road (tile y): the road takes rows 6 and 7, the dashed line is at y = 7. */
const CAR_LANES = { toRight: 7.5, toLeft: 6.5 };
/** Cars appear and leave a little beyond the island (they are long), and keep this distance (tiles) to the car ahead. */
const CAR_ENTER = [-1.4, 13.4] as const;
const CAR_GAP = 2.2;
/** A bus is long: the cars behind it keep this far from its middle. It brakes to its stop, people get off one by one,
 * and it waits at least BUS_DWELL seconds. */
const BUS_GAP = 2.7;
const BUS_SPEED = 2.2;
const BUS_BRAKE = 1.5;
const BUS_ACCEL = 1.2;
const BUS_RELEASE_GAP = 0.3;
const BUS_DWELL = 3.2;
const BUS_COLORS = ['#2f9e44', '#1c7ed6', '#f08c00'];
/** The people get off on the pavement, at the kerb (the doors are on the right of the bus, away from the viewer). */
const BUS_DOOR_Y = 5.95;
/** Indoors: just inside the doorway, and where people are back on their lane. */
const DOOR_IN = 0.9;
const DOOR_LANE = 2.6;

export class Street {
  readonly peds: Ped[] = [];
  /** The queue of the first counter (to the right of the stand). */
  readonly queue: Ped[] = [];
  /** The queue of the second counter (big stand, truck), to the left. */
  readonly queue2: Ped[] = [];
  readonly cars: Car[] = [];
  thief: Thief | null = null;
  private spawnAcc = 0;
  private carTimer = 1;
  private nextId = 1;
  /** The people expected by bus since the last bus left, and the load of the next one. */
  private busAcc = 0;
  private busLoad = 0;
  private busCount = 0;
  /** The dice of the traffic: cars (and so the buses, which keep behind them) must not use the game's dice or the
   * browser's, so the same game plays out the same every time. */
  private carRng = new RNG(0x2c1b3c6d);
  /** The chairs of the store that are taken now. */
  private taken = new Set<string>();

  constructor(private host: StreetHost) {}

  reset(prewarm: boolean): void {
    this.peds.length = 0;
    this.queue.length = 0;
    this.queue2.length = 0;
    this.cars.length = 0;
    this.thief = null;
    this.spawnAcc = 0;
    this.busAcc = 0;
    this.busLoad = 0;
    this.taken.clear();
    if (!prewarm) return;
    const rate = spawnRatePerHour(this.host.location(), this.host.hour(), this.host.weather(), this.host.crowd());
    const n = Math.min(CONFIG.MAX_PEDS - 10, Math.round(rate));
    for (let i = 0; i < n; i++) this.spawn(true);
  }

  update(dt: number): void {
    const h = this.host;
    const rate = spawnRatePerHour(h.location(), h.hour(), h.weather(), h.crowd());
    // at a bus stop part of the crowd comes by bus (in waves), the rest walks past
    const bus = LOCATIONS[h.location()].bus;
    this.spawnAcc += (rate * (1 - (bus?.share ?? 0)) * dt) / CONFIG.HOUR_SEC;
    if (bus) this.busArrivals(bus, rate * bus.share, dt);
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.peds.length < CONFIG.MAX_PEDS) this.spawn(false);
    }
    const selling = h.selling();
    const r2 = h.radius() ** 2;
    this.orderQueue(this.queue, 0);
    this.orderQueue(this.queue2, 1);
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
    if (p.state === 'toSeat' || p.state === 'sit') {
      this.updateSitter(p, dt);
      if (p.moving) p.anim += dt * (4 + p.speed * 4);
      return;
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
    } else if (p.state === 'toQueue' && p.path.length) {
      // into the store through its door first
      p.atSpot = false;
      if (this.moveTo(p, p.path[0].x, p.path[0].y, dt)) p.path.shift();
    } else {
      const spot = queueSpot(this.queueFor(p.counter).indexOf(p), p.counter);
      p.atSpot = this.moveTo(p, spot.x, spot.y, dt);
      if (p.atSpot) {
        p.state = 'queue';
        p.vx = -1;
        p.vy = 0;
      }
      if (p.state === 'queue') {
        p.waited += dt;
        if (!this.host.isServed(p)) {
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

  /** A person appears at the edge of the island, anywhere on the street (`randomX`), or from the door of a bus. */
  private spawn(randomX: boolean, fromBus?: { x: number; y: number; dir: 1 | -1 }): void {
    const h = this.host;
    const rng = h.rng;
    const loc = LOCATIONS[h.location()];
    // (the dice are thrown in the same order as before for everybody who does not come by bus)
    const lane = fromBus ? CONFIG.LANES[0] : rng.chance(CONFIG.LANES[0].weight) ? CONFIG.LANES[0] : CONFIG.LANES[1];
    const dir: 1 | -1 = fromBus ? fromBus.dir : rng.chance(0.5) ? 1 : -1;
    const laneY = lane.y + rng.range(-CONFIG.LANE_JITTER, CONFIG.LANE_JITTER);
    const type = rng.weighted(loc.mix);
    const t = PED_TYPES[type];
    const speed = t.speed * rng.range(0.85, 1.15);
    const maxPrice = loc.fairPrice * t.priceMult * rng.range(CONFIG.WALLET_MIN, CONFIG.WALLET_MAX);
    const x0 = fromBus ? fromBus.x : randomX ? rng.range(0, CONFIG.MAP_SIZE) : dir > 0 ? CONFIG.SPAWN_LEFT : CONFIG.SPAWN_RIGHT;
    const x1 = dir > 0 ? CONFIG.SPAWN_RIGHT : CONFIG.SPAWN_LEFT;
    const counted = h.selling() && !randomX;
    // indoors with doorways away from the lanes: in and out through the doorway, then along the lane
    const door = this.doorY(lane.id === 'far');
    let path: Vec[] = [{ x: x1, y: laneY }];
    let y0 = laneY;
    if (fromBus) {
      // down from the door onto the pavement, then along the lane
      y0 = fromBus.y;
      path = [{ x: x0 + dir * 0.35, y: laneY }, { x: x1, y: laneY }];
    } else if (door !== null && dir > 0 && !randomX) {
      y0 = door;
      path = [{ x: DOOR_IN, y: door }, { x: DOOR_LANE, y: laneY }, { x: x1, y: laneY }];
    } else if (door !== null && dir < 0) {
      path = x0 > DOOR_LANE ? [{ x: DOOR_LANE, y: laneY }, { x: DOOR_IN, y: door }, { x: x1, y: door }] : [{ x: DOOR_IN, y: door }, { x: x1, y: door }];
    }
    const p: Ped = {
      id: this.nextId++,
      type,
      look: randomLook(type),
      x: x0,
      y: y0,
      vx: dir,
      vy: 0,
      speed,
      dir,
      laneY,
      far: lane.id === 'far',
      path,
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
      counter: 0,
      seat: null,
      sitT: 0,
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

  /** The doorway of a lane in the left wall indoors, or null when people walk in along the lane itself. */
  private doorY(far: boolean): number | null {
    const d = LOCATIONS[this.host.location()].doors;
    return d ? d[far ? 1 : 0] : null;
  }

  queueFor(counter: number): Ped[] {
    return counter === 1 ? this.queue2 : this.queue;
  }

  /**
   * A place in the queue is taken by arriving, not by deciding to buy: the people standing in the queue keep their
   * order, and those still walking to it line up behind them by who is nearer to the next free place. (Otherwise
   * someone far away kept the first place while the people behind already stood there and could not be served.)
   */
  private orderQueue(q: Ped[], counter: number): void {
    // already in order: everyone standing comes first, and at most one is still on the way
    let standing = 0;
    while (standing < q.length && q[standing].state === 'queue') standing++;
    if (q.length - standing < 2) return;
    const stand = q.filter((p) => p.state === 'queue');
    const spot = queueSpot(stand.length, counter);
    const dist = (p: Ped) => (p.x - spot.x) ** 2 + (p.y - spot.y) ** 2;
    const walking = q.filter((p) => p.state !== 'queue').sort((a, b) => dist(a) - dist(b));
    q.splice(0, q.length, ...stand, ...walking);
  }

  /** People waiting at all counters. */
  get queued(): number {
    return this.queue.length + this.queue2.length;
  }

  inQueue(p: Ped): boolean {
    return this.queue.includes(p) || this.queue2.includes(p);
  }

  joinQueue(p: Ped, counter = 0): void {
    const rng = this.host.rng;
    p.counter = counter;
    this.queueFor(counter).push(p);
    p.state = 'toQueue';
    // into the store through its door (the queue stands inside)
    p.path = this.host.store() && !inRoom(p) ? [STORE_OUT, STORE_IN] : [];
    p.atSpot = false;
    p.patienceMax = rng.range(CONFIG.PATIENCE_MIN, CONFIG.PATIENCE_MAX) * this.host.patienceMult();
    p.patience = p.patienceMax;
    p.waited = 0;
    this.setEmote(p, '🍋', 1.4);
  }

  leave(p: Ped, emote: string | null, emoteT = 2.5): void {
    for (const q of [this.queue, this.queue2]) {
      const i = q.indexOf(p);
      if (i >= 0) q.splice(i, 1);
    }
    p.state = 'leave';
    p.atSpot = false;
    this.freeSeat(p);
    const exitX = p.dir > 0 ? CONFIG.SPAWN_RIGHT : CONFIG.SPAWN_LEFT;
    p.path = [
      { x: p.x + p.dir * 0.4, y: p.laneY },
      { x: exitX, y: p.laneY },
    ];
    // out of the store through its door, then along the lane
    if (this.host.store() && p.y < ROOM_D + 0.05) p.path = [STORE_IN, STORE_OUT, { x: STORE_OUT.x + p.dir * 0.5, y: p.laneY }, { x: exitX, y: p.laneY }];
    // out through the doorway on the left
    const door = this.doorY(p.far);
    if (door !== null && p.dir < 0) p.path.splice(1, 1, { x: Math.min(DOOR_LANE, p.x - 0.4), y: p.laneY }, { x: DOOR_IN, y: door }, { x: exitX, y: door });
    if (emote) this.setEmote(p, emote, emoteT);
  }

  serveDone(p: Ped, emote: string): void {
    p.hasCup = true;
    // in the store some customers sit down at a free table for a while
    const seat = this.host.store() ? this.pickSeat() : null;
    if (seat && this.host.rng.chance(CONFIG.SIT_CHANCE)) {
      for (const q of [this.queue, this.queue2]) {
        const i = q.indexOf(p);
        if (i >= 0) q.splice(i, 1);
      }
      this.taken.add(seatKey(seat));
      p.seat = seat;
      p.state = 'toSeat';
      p.path = [];
      p.atSpot = false;
      p.sitT = this.host.rng.range(CONFIG.SIT_TIME[0], CONFIG.SIT_TIME[1]) * this.host.sitMult();
      this.setEmote(p, emote, 3);
      return;
    }
    this.leave(p, emote, 3);
  }

  /** A free chair of the store (any of them), or null. */
  private pickSeat(): Seat | null {
    const free = this.host.seats().filter((s) => !this.taken.has(seatKey(s)));
    return free.length ? free[this.host.rng.int(0, free.length - 1)] : null;
  }

  private freeSeat(p: Ped): void {
    if (p.seat) this.taken.delete(seatKey(p.seat));
    p.seat = null;
  }

  /** People sitting down: to the chair, a while on it (with the cup), then out (maybe leaving a tip). */
  private updateSitter(p: Ped, dt: number): void {
    const seat = p.seat;
    if (!seat) {
      this.leave(p, null);
      return;
    }
    if (p.state === 'toSeat') {
      if (this.moveTo(p, seat.x, seat.y, dt)) {
        p.state = 'sit';
        p.moving = false;
      }
      return;
    }
    p.sitT -= dt;
    if (p.sitT > 0) return;
    this.host.onTip(p);
    this.leave(p, null);
  }

  /** People sitting at the tables of the store now. */
  get sitting(): number {
    return this.taken.size;
  }

  sendAwayQueue(emote: string | null = null): void {
    for (const p of [...this.queue, ...this.queue2]) this.leave(p, emote);
  }

  setEmote(p: Ped, emote: string, t: number): void {
    p.emote = emote;
    p.emoteT = t;
  }

  frontReady(counter = 0): Ped | null {
    const p = this.queueFor(counter)[0];
    return p && p.state === 'queue' && p.atSpot ? p : null;
  }

  // ---------- buses (they bring people in waves) ----------

  /**
   * The people who come by bus are counted up like all the others; when enough for a bus are there, a bus comes
   * (one at a time on its lane). Its time table depends only on the crowd, never on the cars of the street.
   */
  private busArrivals(b: BusStopDef, perHour: number, dt: number): void {
    this.busAcc += (perHour * dt) / CONFIG.HOUR_SEC;
    if (this.busLoad <= 0) this.busLoad = this.host.rng.int(b.load[0], b.load[1]);
    if (this.busAcc < this.busLoad || this.cars.some((c) => c.bus && c.bus.state !== 'out')) return;
    // not into a car that is still at the start of the lane
    if (this.cars.some((c) => c.dir < 0 && Math.abs(c.x - CAR_ENTER[1]) < BUS_GAP)) return;
    this.busAcc -= this.busLoad;
    this.cars.push({
      x: CAR_ENTER[1],
      y: CAR_LANES.toLeft,
      dir: -1,
      speed: BUS_SPEED,
      cruise: BUS_SPEED,
      color: BUS_COLORS[this.busCount++ % BUS_COLORS.length],
      variant: 5,
      bus: { state: 'in', t: 0, load: this.busLoad, released: 0 },
    });
    this.busLoad = 0;
  }

  /** The speed of a bus now (and the people getting off while it stands). */
  private driveBus(c: Car, dt: number): number {
    const bus = c.bus!;
    const b = LOCATIONS[this.host.location()].bus;
    if (!b) return BUS_SPEED;
    if (bus.state === 'in') {
      const rem = (b.stopX - c.x) * c.dir;
      if (rem <= 0.04) {
        c.x = b.stopX;
        bus.state = 'dwell';
        bus.t = 0;
        return 0;
      }
      return Math.max(0.3, Math.min(BUS_SPEED, Math.sqrt(2 * BUS_BRAKE * rem)));
    }
    if (bus.state === 'dwell') {
      bus.t += dt;
      while (bus.released < bus.load && bus.t >= 0.5 + bus.released * BUS_RELEASE_GAP) {
        this.getOff(c, b);
        bus.released++;
      }
      if (bus.released >= bus.load && bus.t >= Math.max(BUS_DWELL, 0.5 + bus.load * BUS_RELEASE_GAP + 1.2)) bus.state = 'out';
      return 0;
    }
    return Math.min(BUS_SPEED * 1.3, c.speed + BUS_ACCEL * dt);
  }

  /** One person gets off the bus: most walk towards the stand. */
  private getOff(c: Car, b: BusStopDef): void {
    if (this.peds.length >= CONFIG.MAX_PEDS) return;
    const rng = this.host.rng;
    const toward: 1 | -1 = b.stopX > CONFIG.STAND.x ? -1 : 1;
    const dir: 1 | -1 = rng.chance(b.toward) ? toward : toward === 1 ? -1 : 1;
    this.spawn(false, { x: c.x + rng.range(-0.7, 0.7), y: BUS_DOOR_Y, dir });
  }

  // ---------- cars (decoration only, except the buses) ----------
  private updateCars(dt: number): void {
    if (LOCATIONS[this.host.location()].cars) {
      this.carTimer -= dt;
      if (this.carTimer <= 0) {
        const dir: 1 | -1 = this.carRng.chance(0.5) ? 1 : -1;
        const x = dir > 0 ? CAR_ENTER[0] : CAR_ENTER[1];
        // right-hand traffic: driving to the lower right (+x) the right side of the road is the near lane (bigger y)
        const y = dir > 0 ? CAR_LANES.toRight : CAR_LANES.toLeft;
        // a new car comes only when the start of its lane is free
        if (this.cars.some((c) => c.dir === dir && Math.abs(c.x - x) < CAR_GAP)) this.carTimer = 0.6;
        else {
          this.carTimer = this.carRng.range(2.5, 7.5);
          const speed = this.carRng.range(2.4, 3.6);
          this.cars.push({
            x,
            y,
            dir,
            speed,
            cruise: speed,
            color: this.carRng.pick(CAR_COLORS),
            variant: this.carRng.chance(0.14) ? 4 : this.carRng.int(0, 3),
          });
        }
      }
    }
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      c.speed = c.bus ? this.driveBus(c, dt) : c.cruise;
      c.x += c.dir * c.speed * dt;
      // a faster car slows down behind a slower one (or a bus standing at its stop) instead of driving through it;
      // a bus at its stop stays where it is, and keeps behind a car on the way
      if (!(c.bus && c.bus.state === 'dwell')) {
        for (const o of this.cars) {
          if (o === c || o.dir !== c.dir) continue;
          const need = o.bus || c.bus ? BUS_GAP : CAR_GAP;
          const gap = (o.x - c.x) * c.dir;
          if (gap > 0 && gap < need) {
            c.x = o.x - c.dir * need;
            c.speed = Math.min(c.speed, o.speed);
          }
        }
      }
      if (c.x < CAR_ENTER[0] - 0.3 || c.x > CAR_ENTER[1] + 0.3) this.cars.splice(i, 1);
    }
  }

  // ---------- thief (runs on real time so speed-ups don't make it unfair) ----------
  spawnThief(): void {
    this.thief = { x: CONFIG.SPAWN_LEFT, y: 5.35, t: 0, state: 'run', anim: 0, moving: true, dirX: 1, bag: false, hits: 0, speed: CONFIG.THIEF_SPEED, tx: 0, ty: 0, path: [], pathTo: '' };
  }

  /** The way from one point to another: through the door of the store when its front wall is between them. */
  private via(from: Vec, to: Vec): Vec[] {
    if (!this.host.store() || inRoom(from) === inRoom(to)) return [to];
    return inRoom(from) ? [STORE_IN, STORE_OUT, to] : [STORE_OUT, STORE_IN, to];
  }

  /** Moves the fox towards a point along its way (through the door when needed). True when he is there. */
  private follow(mover: { x: number; y: number; vx: number; vy: number; speed: number; moving: boolean }, th: Thief, tx: number, ty: number, dt: number): boolean {
    const key = `${tx},${ty}`;
    if (th.pathTo !== key) {
      th.path = this.via(mover, { x: tx, y: ty });
      th.pathTo = key;
    }
    const w = th.path[0];
    if (!w) return true;
    if (this.moveTo(mover, w.x, w.y, dt)) th.path.shift();
    return th.path.length === 0;
  }

  /** Returns 'steal' at the moment the thief grabs the money. */
  updateThief(rdt: number): 'steal' | null {
    const th = this.thief;
    if (!th) return null;
    th.t += rdt;
    let result: 'steal' | null = null;
    const mover = { x: th.x, y: th.y, vx: 0, vy: 0, speed: th.speed, moving: false };
    if (th.state === 'run') {
      if (this.follow(mover, th, CONFIG.STAND.x - 1.05, CONFIG.STAND.y + 0.8, rdt)) {
        th.state = 'grab';
        th.t = 0;
      }
    } else if (th.state === 'dodge') {
      // ran off after a hit; then he tries the till again
      if (this.follow(mover, th, th.tx, th.ty, rdt)) th.state = 'run';
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
      if (mover.speed > 0 && this.follow(mover, th, CONFIG.SPAWN_LEFT - 0.6, 5.6, rdt)) {
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
    const y0 = this.host.store() ? ROOM_D + 0.4 : 4.6;
    for (let i = 0; i < 6; i++) {
      const c = { x: 0.8 + Math.random() * 10.4, y: y0 + Math.random() * (9.4 - y0) };
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
