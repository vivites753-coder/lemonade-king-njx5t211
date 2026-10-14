// What the scene shows when the player looks at one of their other stands: the place of the stand with its own
// equipment, the hired seller at work and people walking by, some of whom stop and buy. It is only the show: the
// money of the stand comes from simulatePoint (points.ts), which the view displays bit by bit through the day.
import { CONFIG } from '../core/config';
import { RNG } from '../core/rng';
import type { Phase } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { PED_TYPES } from '../data/pedTypes';
import { POINTS } from '../data/staff';
import type { Critter } from './critters';
import { attentionRadius, interestChance, serveTime, type Owned } from './economy';
import type { Game, Serving } from './game';
import { isGirl, pointUps, type Point } from './points';
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
}

export class PointScene implements SceneSource {
  readonly street: Street;
  readonly critters = { list: [] as Critter[] };
  servings: (Serving | null)[] = [null, null];
  making = null;
  readonly S: GameState;
  readonly D: DayState;
  seller: { girl: boolean } | null;
  /** A cup was sold here (for the "+10" over the stand). */
  onSale: ((x: number, y: number, amount: number) => void) | null = null;
  private rng: RNG;
  private wait = 0;

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
    Object.assign(D, { helpers: 0, helper: false, cupsReady: 12, flyers: false, sales: 0, blackoutUntil: 0 });
    this.D = D;
    this.seller = point.seller ? { girl: isGirl(point.seller.nameId) } : null;
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
    };
    this.street = new Street(host);
    this.street.reset(true);
  }

  /** A new upgrade or another seller at the stand shows at once. */
  refresh(): void {
    const p = this.point;
    this.S.upgrades = pointUps(p);
    const girl = p.seller ? isGirl(p.seller.nameId) : null;
    if ((girl === null) !== (this.seller === null) || (this.seller && this.seller.girl !== girl)) this.seller = girl === null ? null : { girl };
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
    if (this.g.phase !== 'sell' || !p.seller || p.issue === 'sick') return false;
    return this.g.D.hour >= (p.issue === 'late' ? POINTS.LATE_OPEN_H : POINTS.OPEN_H);
  }

  update(dt: number): void {
    this.street.update(dt);
    const s = this.servings[0];
    if (s) {
      s.t += dt;
      if (s.t >= s.dur) {
        this.servings[0] = null;
        this.street.serveDone(s.ped, this.rng.chance(0.7) ? '😋' : '🙂');
        this.D.sales += this.S.price;
        this.onSale?.(s.ped.x, s.ped.y, this.S.price);
      }
      return;
    }
    const front = this.open() ? this.street.frontReady(0) : null;
    if (!front) {
      this.wait = 0;
      return;
    }
    // the seller takes the next customer after a short moment
    this.wait += dt;
    if (this.wait < 0.5) return;
    this.wait = 0;
    const skill = this.point.seller?.skill ?? 1;
    this.servings[0] = { ped: front, t: 0, dur: serveTime(pointUps(this.point), true) / skill, helper: true };
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
    if (this.street.queue.length >= CONFIG.MAX_QUEUE + (pointUps(this.point).tv ? 3 : 0)) {
      this.street.setEmote(p, '⏳', 2);
      return;
    }
    this.street.joinQueue(p, 0);
  }
}
