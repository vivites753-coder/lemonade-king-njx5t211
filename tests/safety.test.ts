import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';

describe('safety nets', () => {
  it('a day off goes straight to the report and keeps profit honest', () => {
    const g = new Game(4);
    g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed: 4 });
    const coins = g.S.coins;
    g.restDay();
    expect(g.phase).toBe('report');
    expect(g.D.report!.sold).toBe(0);
    expect(g.D.report!.lesson.key).toBe('lesson.rest');
    expect(g.S.coins - coins).toBe(g.D.report!.profit);
  });

  it('grandma helps when the player cannot afford a single pitcher', () => {
    const g = new Game(4);
    g.newGame({ ageMode: 'kid', avatar: 'girl', lang: 'uk', seed: 4 });
    g.S.coins = 5;
    g.restDay();
    g.openShop();
    g.sleep();
    expect(g.S.coins).toBeGreaterThan(5);
    expect(g.D.bonus).toBeGreaterThan(0);
  });
});
