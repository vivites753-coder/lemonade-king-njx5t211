// Little actors of accidents and lucky finds: a running boy, a football, stray dogs, a lost cat, a wallet,
// a runaway balloon, a coin, splashes. They move in real time (like the fox), only for the show: the game
// effect of an accident is applied when it starts, and a find pays out when the player taps it.
import { CONFIG } from '../core/config';
import { randomLook, type Look } from './looks';

export type CritterKind = 'runner' | 'ball' | 'dog' | 'cat' | 'wallet' | 'balloon' | 'coin' | 'splash';

export interface Critter {
  id: number;
  kind: CritterKind;
  x: number;
  y: number;
  /** Height above the ground (px): the ball's arc, the balloon. */
  z: number;
  tx: number;
  ty: number;
  /** Real seconds since it appeared. */
  t: number;
  /** Real seconds it lives (0 = until it leaves by itself). */
  life: number;
  speed: number;
  anim: number;
  dirX: number;
  moving: boolean;
  /** 0 = on the way, 1 = after the hit / leaving. */
  phase: number;
  /** A lucky find: tapping it pays out. */
  bonus: boolean;
  look?: Look;
  color?: string;
  /** Start of a flight (ball). */
  x0?: number;
  y0?: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export class Critters {
  readonly list: Critter[] = [];
  private nextId = 1;

  clear(): void {
    this.list.length = 0;
  }

  private add(c: Partial<Critter> & Pick<Critter, 'kind' | 'x' | 'y'>): Critter {
    const full: Critter = { id: this.nextId++, z: 0, tx: c.x, ty: c.y, t: 0, life: 0, speed: 1, anim: 0, dirX: 1, moving: false, phase: 0, bonus: false, ...c };
    this.list.push(full);
    return full;
  }

  splash(x: number, y: number, color = '#fcc419'): void {
    this.add({ kind: 'splash', x, y, life: 1.1, color });
  }

  /** A boy runs into the stand. */
  runner(): void {
    const s = CONFIG.STAND;
    this.add({ kind: 'runner', x: CONFIG.SPAWN_LEFT, y: 5.4, tx: s.x - 0.3, ty: s.y + 0.75, speed: 4.2, look: randomLook('kid') });
  }

  /** A football flies from the far lane into the pitcher. */
  ball(): void {
    const s = CONFIG.STAND;
    const x0 = rnd(2, 9);
    this.add({ kind: 'ball', x: x0, y: 8.6, x0, y0: 8.6, tx: s.x - 0.3, ty: s.y - 0.1, life: 0.95 });
  }

  dogs(n = 3): void {
    for (let i = 0; i < n; i++) {
      const left = Math.random() < 0.5;
      const d = this.add({ kind: 'dog', x: left ? CONFIG.SPAWN_LEFT : CONFIG.SPAWN_RIGHT, y: rnd(4.8, 6.2), speed: rnd(2.0, 2.8), color: ['#a0522d', '#e9c46a', '#495057'][i % 3] });
      this.wander(d);
    }
  }

  /** The dogs leave (their time is up). */
  dismissDogs(): void {
    for (const c of this.list) {
      if (c.kind !== 'dog' || c.phase === 1) continue;
      c.phase = 1;
      c.tx = c.x < 6 ? CONFIG.SPAWN_LEFT - 0.5 : CONFIG.SPAWN_RIGHT + 0.5;
      c.ty = c.y;
    }
  }

  cat(life: number): void {
    this.add({ kind: 'cat', x: CONFIG.SPAWN_LEFT, y: 5.75, tx: CONFIG.SPAWN_RIGHT + 0.4, ty: 5.75, speed: 0.55, bonus: true, life });
  }

  wallet(life: number): void {
    this.add({ kind: 'wallet', x: rnd(1.5, 10.5), y: rnd(4.9, 5.2), bonus: true, life });
  }

  coin(life: number): void {
    this.add({ kind: 'coin', x: rnd(1.5, 10.5), y: rnd(4.9, 6.1), bonus: true, life });
  }

  balloon(life: number): void {
    const s = CONFIG.STAND;
    this.add({ kind: 'balloon', x: s.x + rnd(-2, 3), y: s.y + rnd(1.5, 2.5), z: 30, bonus: true, life, color: ['#ff6b6b', '#4dabf7', '#da77f2', '#69db7c'][Math.floor(Math.random() * 4)] });
  }

  remove(id: number): Critter | null {
    const i = this.list.findIndex((c) => c.id === id);
    if (i < 0) return null;
    return this.list.splice(i, 1)[0];
  }

  private wander(c: Critter): void {
    c.tx = rnd(3.2, 9.2);
    c.ty = rnd(4.6, 6.4);
  }

  private moveTo(c: Critter, dt: number): boolean {
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const dist = Math.hypot(dx, dy);
    const step = c.speed * dt;
    c.moving = dist > 1e-3;
    if (dist <= step) {
      c.x = c.tx;
      c.y = c.ty;
      return true;
    }
    c.x += (dx / dist) * step;
    c.y += (dy / dist) * step;
    c.dirX = dx - dy >= 0 ? 1 : -1;
    return false;
  }

  /** Real time. Returns the critters that hit the stand this frame (runner, ball). */
  update(rdt: number): Critter[] {
    const hits: Critter[] = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      c.t += rdt;
      c.anim += rdt * 12;
      let gone = c.life > 0 && c.t >= c.life;
      switch (c.kind) {
        case 'runner':
          if (this.moveTo(c, rdt)) {
            if (c.phase === 0) {
              c.phase = 1;
              hits.push(c);
              this.splash(c.tx + 0.1, c.ty - 0.6);
              c.tx = CONFIG.SPAWN_RIGHT + 0.5;
              c.ty = 5.4;
            } else gone = true;
          }
          break;
        case 'ball': {
          const k = Math.min(1, c.t / c.life);
          c.x = c.x0! + (c.tx - c.x0!) * k;
          c.y = c.y0! + (c.ty - c.y0!) * k;
          c.z = 20 + Math.sin(k * Math.PI) * 70 + k * 10;
          if (k >= 1) {
            hits.push(c);
            this.splash(c.tx, c.ty, '#a5d8ff');
            this.splash(c.tx + 0.15, c.ty + 0.1);
            gone = true;
          }
          break;
        }
        case 'dog':
          if (this.moveTo(c, rdt)) {
            if (c.phase === 1) gone = true;
            else this.wander(c);
          }
          break;
        case 'cat': {
          // walks along the crowd and stops now and then
          const pause = Math.sin(c.t * 0.9) > 0.75;
          if (!pause && this.moveTo(c, rdt)) gone = true;
          if (pause) c.moving = false;
          break;
        }
        case 'balloon':
          c.z += rdt * 18;
          c.x += Math.sin(c.t * 1.3) * rdt * 0.25;
          break;
        default:
          break;
      }
      if (gone) this.list.splice(i, 1);
    }
    return hits;
  }
}
