// What the scene shows when the player looks at one of their other stands: the place of the stand with its own
// equipment, the hired seller at work and people walking by, some of whom stop and buy. It is only the show: the
// money of the stand comes from simulatePoint (points.ts), which the view displays bit by bit through the day.
import { CONFIG } from '../core/config';
import { RNG } from '../core/rng';
import type { Phase } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { PED_TYPES } from '../data/pedTypes';
import type { Critter } from './critters';
import { attentionRadius, interestChance, serveTime, type Owned } from './economy';
import type { Game, Serving } from './game';
import { isGirl, pointOpensAt, pointUps, pointWorkers, type Point } from './points';
import type { DayState, GameState } from './state';
import { Street, type Ped, type StreetHost } from './street';

/** What the scene drawing reads: the game itself, or one of these views. */
export interface SceneSource {
  S: GameState;
  D: DayState;
  phase: Phase;
  street: Street;
  critters: { list: Critter[] };
  servings: (Serving | null)[];
  making: { t: number; dur: number; jugs: number } | null;
  radius: number;
  active(): Owned;
  counters(): number;
  isSoldOut(): boolean;
  /** A hired seller stands at the stand instead of the player (null: nobody, the stand is closed). */
  seller?: { girl: boolean } | null;
  /** The second worker of that stand. */
  helper2?: { girl: boolean } | null;
}

export class PointScene implements SceneSource {
  readonly street: Street;
  readonly critters = { list: [] as Critter[] };
  servings: (Serving | null)[] = [null, null];
  making = null;
  readonly S: GameState;
  readonly D: DayState;
  seller: { girl: boolean } | null;
  helper2: { girl: boolean } | null = null;
  /** A cup was sold here (for the "+10" over the stand). */
  onSale: ((x: number, y: number, amount: number) => void) | null = null;
  private rng: RNG;
  private wait = [0, 0];

  constructor(
    private g: Game,
    readonly point: Point,
  ) {
    this.rng = new RNG((g.S.seed ^ Math.imul(point.id, 7919) ^ Math.imul(g.S.day, 104729)) >>> 0);
    const loc = LOCATIONS[point.loc];
    // everything that is not about the stand (settings, the truck's look, the reputation) comes from the game
    const S = Object.create(g.S) as GameState;
    Object.assign(S, {
      location: point.loc,
      upgrades: pointUps(point),
      broken: {},
      price: loc.fairPrice,
      speakerOn: true,
      stock: { lemons: [{ n: 12, age: 0 }], water: 10, sugar: 10, cups: 30, cookies: 0 },
    });
    this.S = S;
    const D = Object.create(g.D) as DayState;
    Object.assign(D, { helpers: 0, helper: false, cupsReady: 12, flyers: false, onlineAds: false, sales: 0, blackoutUntil: 0 });
    this.D = D;
    this.seller = null;
    this.refresh();
    const self = this;
    const host: StreetHost = {
      get rng() {
        return self.rng;
      },
      hour: () => g.D.hour,
      location: () => point.loc,
      weather: () => g.D.weather,
      crowd: () => g.D.events,
      selling: () => this.open(),
      radius: () => this.radius,
      patienceMult: () => (pointUps(point).tv ? 1.6 : 1.3),
      isServed: (p) => this.servings.some((s) => s?.ped === p),
      onSpawnCounted: () => undefined,
      onInRange: (p) => this.onInRange(p),
      onImpatient: (p) => this.street.leave(p, '😠'),
      store: () => false,
      seats: () => [],
      sitMult: () => 1,
      onTip: () => undefined,
    };
    this.street = new Street(host);
    this.street.reset(true);
  }

  /** A new upgrade or another seller at the stand shows at once. */
  refresh(): void {
    const p = this.point;
    this.S.upgrades = pointUps(p);
    // the first worker of today stands where the seller does (the second worker when the seller is ill)
    const [a, b] = pointWorkers(p);
    const look = (w: typeof a | undefined, cur: { girl: boolean } | null) => {
      if (!w) return null;
      const girl = isGirl(w.nameId);
      return cur && cur.girl === girl ? cur : { girl };
    };
    this.seller = look(a, this.seller);
    this.helper2 = look(b, this.helper2);
  }

  /** Queues: a second worker at a wide counter serves a queue of their own. */
  private queues(): number {
    return this.counters() >= 2 && pointWorkers(this.point).length >= 2 ? 2 : 1;
  }

  get phase(): Phase {
    return this.g.phase;
  }

  get radius(): number {
    return attentionRadius(pointUps(this.point), true);
  }

  active(): Owned {
    return pointUps(this.point);
  }

  counters(): number {
    const up = pointUps(this.point);
    return up.big_stand || up.truck ? 2 : 1;
  }

  isSoldOut(): boolean {
    return false;
  }

  /** The stand works now: a seller is there, the stand is not closed today and the selling hours have begun. */
  open(): boolean {
    const p = this.point;
    if (this.g.phase !== 'sell' || !pointWorkers(p).length || p.today?.status === 'nomoney') return false;
    return this.g.D.hour >= pointOpensAt(p);
  }

  update(dt: number): void {
    this.street.update(dt);
    const workers = pointWorkers(this.point);
    const queues = this.queues();
    for (let c = 0; c < 2; c++) {
      const s = this.servings[c];
      if (s) {
        s.t += dt;
        if (s.t >= s.dur) {
          this.servings[c] = null;
          this.street.serveDone(s.ped, this.rng.chance(0.7) ? '😋' : '🙂');
          this.D.sales += this.S.price;
          this.onSale?.(s.ped.x, s.ped.y, this.S.price);
        }
        continue;
      }
      const front = c < queues && this.open() ? this.street.frontReady(c) : null;
      if (!front) {
        this.wait[c] = 0;
        continue;
      }
      // the worker takes the next customer after a short moment; two at a small table pour a little faster
      this.wait[c] += dt;
      if (this.wait[c] < 0.5) continue;
      this.wait[c] = 0;
      const w = workers[c] ?? workers[0];
      this.servings[c] = { ped: front, t: 0, dur: serveTime(pointUps(this.point), true) / (w?.skill ?? 1), helper: true };
    }
  }

  private onInRange(p: Ped): void {
    const loc = LOCATIONS[this.point.loc];
    const ev = this.g.D.events;
    const raw = interestChance({
      upgrades: pointUps(this.point),
      speakerOn: true,
      flyers: false,
      weather: this.g.D.weather,
      rep: this.g.S.rep,
      festival: ev.festival && !loc.indoor,
      location: this.point.loc,
    }).raw;
    if (!this.rng.chance(Math.min(CONFIG.MAX_STOP_CHANCE, raw * PED_TYPES[p.type].interest))) return;
    if (this.S.price > p.maxPrice) {
      this.street.setEmote(p, '💸', 2.4);
      return;
    }
    // people take the shorter queue
    const max = CONFIG.MAX_QUEUE + (pointUps(this.point).tv ? 3 : 0);
    let best = -1;
    for (let c = 0; c < this.queues(); c++) {
      const len = this.street.queueFor(c).length;
      if (len < max && (best < 0 || len < this.street.queueFor(best).length)) best = c;
    }
    if (best < 0) {
      this.street.setEmote(p, '⏳', 2);
      return;
    }
    this.street.joinQueue(p, best);
  }
}
