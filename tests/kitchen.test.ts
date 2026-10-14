// The kitchen takes exactly what the shelves show: one lemon per lemon squeezed, the water and sugar put in the jug.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import type { UpgradeId } from '../src/core/types';
import { Game } from '../src/sim/game';
import { lemonsTotal } from '../src/sim/state';

function inKitchen(juicer?: UpgradeId): Game {
  const g = new Game(13);
  g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed: 13 });
  g.S.day = 3;
  if (juicer) {
    g.S.upgrades.juicer_hand = true;
    g.S.upgrades[juicer] = true;
  }
  g.goMarket();
  g.addPitcherKit();
  g.addPitcherKit();
  g.pay();
  return g;
}

describe('kitchen stock', () => {
  for (const juicer of [undefined, 'juicer_hand', 'juicer_lever'] as const) {
    it(`every lemon squeezed takes one lemon from the shelf (${juicer ?? 'no juicer'})`, () => {
      const g = inKitchen(juicer);
      expect(g.phase).toBe('kitchen');
      const st = g.S.stock;
      const start = { lemons: lemonsTotal(st), water: st.water, sugar: st.sugar, cups: st.cups };
      let squeezed = 0;
      while (g.D.kitchen.juice < CONFIG.IDEAL_LEMONS && g.kitchenAdd('lemon') === 'ok') {
        squeezed++;
        expect(g.kitchenLeft().lemon).toBe(start.lemons - squeezed);
      }
      // a juicer gets the same taste out of fewer lemons
      expect(squeezed).toBe(juicer === 'juicer_lever' ? 2 : juicer ? 3 : 4);
      g.kitchenAdd('water');
      g.kitchenAdd('water');
      g.kitchenAdd('sugar');
      g.kitchenAdd('sugar');
      expect(g.kitchenLeft()).toEqual({ lemon: start.lemons - squeezed, water: start.water - 2, sugar: start.sugar - 2 });
      g.kitchenMix('perfect');
      expect(g.kitchenPour()).toBe(true);
      // the pitcher took exactly what the shelves showed, and ten cups
      expect(lemonsTotal(st)).toBe(start.lemons - squeezed);
      expect(st.water).toBe(start.water - 2);
      expect(st.sugar).toBe(start.sugar - 2);
      expect(st.cups).toBe(start.cups - CONFIG.CUPS_PER_PITCHER);
      // the market kit bought just enough for two such pitchers
      expect(start.lemons).toBe(squeezed * 2);
      // the second pitcher with the same recipe uses the rest
      g.kitchenRepeat();
      g.kitchenMix('perfect');
      expect(g.kitchenPour()).toBe(true);
      expect(lemonsTotal(st)).toBe(0);
      expect(st.water).toBe(0);
      expect(g.D.cupsReady).toBe(2 * CONFIG.CUPS_PER_PITCHER);
    });
  }
});
