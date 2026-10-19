// Grandma and the parents help in the morning when the purse is nearly empty.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { Game } from '../src/sim/game';

/** A game on day `day`, with the stock for a few pitchers (so only the purse decides) and `coins` in the purse. */
function morningWith(coins: number, day = 4, mode: 'pro' | 'kid' = 'pro'): { g: Game; cards: string[]; gifts: number[] } {
  const g = new Game(14);
  g.newGame({ ageMode: mode, avatar: 'girl', lang: 'uk', seed: 14 });
  g.S.day = day;
  g.S.stock = { lemons: [{ n: 12, age: 0 }], water: 10, sugar: 10, cups: 50, cookies: 0, oranges: 0, juice: 0, pastries: 0 };
  g.S.coins = coins;
  const cards: string[] = [];
  const gifts: number[] = [];
  g.bus.on('card', (c) => {
    if (c.id === 'grandmaHelp' || c.id === 'parentsHelp') {
      cards.push(c.id);
      gifts.push(Number(c.params?.n));
    }
  });
  g.restDay();
  g.openShop();
  g.sleep();
  return { g, cards, gifts };
}

describe('help from the family', () => {
  it('gives 150 coins when the purse holds less than 30', () => {
    expect(CONFIG.GRANDMA_GIFT).toBe(150);
    expect(CONFIG.GRANDMA_GIFT_KID).toBe(150);
    expect(CONFIG.FAMILY_HELP_BELOW).toBe(30);
    // the night costs nothing, a rest day earns nothing: the purse is what it was
    const { g, cards, gifts } = morningWith(29);
    expect(cards).toHaveLength(1);
    expect(gifts).toEqual([150]);
    expect(g.S.coins).toBe(29 + 150);
  });

  it('does not help at 30 coins or more while there is stock to sell', () => {
    for (const coins of [30, 31, 100]) {
      const { cards, g } = morningWith(coins);
      expect(cards, `${coins} coins`).toHaveLength(0);
      expect(g.S.coins).toBe(coins);
    }
  });

  it('grandma and the parents take turns, one card a morning, for both game levels', () => {
    const odd = morningWith(5, 4); // the new day is 5: grandma
    expect(odd.cards).toEqual(['grandmaHelp']);
    const even = morningWith(5, 5); // the new day is 6: the parents
    expect(even.cards).toEqual(['parentsHelp']);
    const kid = morningWith(5, 4, 'kid');
    expect(kid.gifts).toEqual([150]);
  });

  it('helps also when 30 or more coins cannot buy even one pitcher (no stock)', () => {
    const g = new Game(15);
    g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed: 15 });
    g.S.day = 4;
    g.S.coins = 35;
    g.S.stock = { lemons: [], water: 0, sugar: 0, cups: 0, cookies: 0, oranges: 0, juice: 0, pastries: 0 };
    g.restDay();
    g.openShop();
    g.sleep();
    expect(g.S.coins).toBe(35 + 150);
  });
});
