import { describe, expect, it } from 'vitest';
import { queueSpot } from '../src/core/config';
import { Game } from '../src/sim/game';
import type { Ped } from '../src/sim/street';
import { cook } from './bot';

/** Selling, with an empty street (only the people a test puts there). */
function sellingGame(): { g: Game; buyer: (x: number, y: number) => Ped } {
  const g = new Game(5);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed: 5 });
  g.goMarket();
  g.addPitcherKit();
  g.pay();
  cook(g, 1);
  g.startSelling();
  const model = g.street.peds[0];
  g.street.peds.length = 0;
  g.street.queue.length = 0;
  let id = 1000;
  // a passer-by at a spot of the island who has just decided to buy
  const buyer = (x: number, y: number): Ped => {
    const p: Ped = { ...model, id: id++, x, y, path: [], state: 'walk', speed: 1, gone: false, emote: null };
    g.street.peds.push(p);
    g.street.joinQueue(p, 0);
    return p;
  };
  return { g, buyer };
}

describe('the queue', () => {
  it('the first one to get there stands first and can be served', () => {
    const { g, buyer } = sellingGame();
    // a newcomer from far away decides first, someone right next to the stand a moment later
    const front = queueSpot(0);
    const far = buyer(front.x + 9, front.y + 1);
    const near = buyer(front.x + 0.4, front.y);
    expect(g.street.queue).toEqual([far, near]);
    for (let i = 0; i < 20; i++) g.street.update(0.05);
    // the near one is there already and takes the first place; the far one is still on the way, behind
    expect(g.street.queue).toEqual([near, far]);
    expect(far.state).toBe('toQueue');
    expect(g.street.frontReady(0)).toBe(near);
    expect(g.serve()).toBe('ok');
  });

  it('people who stand in the queue keep their order', () => {
    const { g, buyer } = sellingGame();
    const s0 = queueSpot(0);
    const s1 = queueSpot(1);
    const a = buyer(s0.x, s0.y);
    const b = buyer(s1.x, s1.y);
    g.street.update(0.05);
    expect(g.street.queue).toEqual([a, b]);
    // a newcomer close to the front does not push in before them
    const c = buyer(s0.x + 0.1, s0.y + 0.3);
    for (let i = 0; i < 5; i++) g.street.update(0.05);
    expect(g.street.queue).toEqual([a, b, c]);
  });
});
