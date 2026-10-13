import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { UPGRADES } from '../src/data/upgrades';
import {
  acceptProb,
  attentionRadius,
  costPerCup,
  farCoverage,
  interestChance,
  lemonsConsumed,
  quality,
  tasteKey,
} from '../src/sim/economy';

const recipe = { lemons: 4, sugar: 2 };

describe('economy', () => {
  it('default cup costs 3.4 coins', () => {
    expect(costPerCup(recipe, {})).toBeCloseTo(3.4, 5);
  });

  it('juicers save lemons and money', () => {
    expect(lemonsConsumed(recipe, {})).toBe(4);
    expect(lemonsConsumed(recipe, { juicer_hand: true })).toBe(3);
    expect(lemonsConsumed(recipe, { juicer_hand: true, juicer_lever: true })).toBe(2);
    expect(lemonsConsumed({ lemons: 2, sugar: 2 }, { juicer_hand: true, juicer_lever: true })).toBe(1);
    expect(costPerCup(recipe, { juicer_hand: true })).toBeLessThan(costPerCup(recipe, {}));
  });

  it('quality is best at the ideal recipe', () => {
    expect(quality(recipe)).toBe(1);
    expect(quality({ lemons: 6, sugar: 0 })).toBeLessThan(0.5);
    expect(tasteKey({ lemons: 6, sugar: 1 })).toBe('taste.sour');
    expect(tasteKey({ lemons: 2, sugar: 5 })).toBe('taste.sweet');
    expect(tasteKey(recipe)).toBe('taste.good');
  });

  it('interest parts multiply to the shown chance', () => {
    const r = interestChance({
      upgrades: { sign: true, banner: true, umbrella: true, speaker: true },
      speakerOn: true,
      flyers: true,
      weather: 'hot',
      rep: 3,
      festival: true,
    });
    let base = 0;
    let add = 0;
    let mul = 1;
    for (const p of r.parts) {
      if (p.kind === 'base') base = p.value;
      if (p.kind === 'add') add += p.value;
      if (p.kind === 'mul') mul *= p.value;
    }
    expect(base * (1 + add) * mul).toBeCloseTo(r.raw, 10);
    expect(r.chance).toBe(Math.min(CONFIG.MAX_STOP_CHANCE, r.raw));
  });

  it('only a minority stops without advertising', () => {
    const r = interestChance({ upgrades: {}, speakerOn: true, flyers: false, weather: 'sunny', rep: 1, festival: false });
    expect(r.chance).toBeGreaterThan(0.1);
    expect(r.chance).toBeLessThan(0.25);
  });

  it('the speaker is needed to reach the far lane', () => {
    expect(farCoverage(attentionRadius({}, true))).toBe(0);
    expect(farCoverage(attentionRadius({ banner: true }, true))).toBe(0);
    expect(farCoverage(attentionRadius({ speaker: true }, true))).toBeGreaterThan(0.4);
    expect(farCoverage(attentionRadius({ speaker: true }, false))).toBe(0);
    expect(farCoverage(attentionRadius({ speaker: true, banner: true }, true))).toBe(1);
  });

  it('higher prices are accepted by fewer people', () => {
    let prev = 2;
    for (let p = 1; p <= 20; p++) {
      const a = acceptProb('park', 'adult', p);
      expect(a).toBeLessThanOrEqual(prev);
      prev = a;
    }
    expect(acceptProb('school', 'kid', 8)).toBe(0);
    expect(acceptProb('beach', 'tourist', 12)).toBe(1);
  });
});

describe('stop chance ceiling', () => {
  it('never goes above 40 %, even with every upgrade on a hot festival day with 5 stars', () => {
    const all = Object.fromEntries(Object.keys(UPGRADES).map((id) => [id, true]));
    const r = interestChance({ upgrades: all, speakerOn: true, flyers: true, weather: 'hot', rep: 5, festival: true, location: 'school' });
    expect(r.chance).toBeLessThanOrEqual(0.4);
    // and all the advertising on an ordinary sunny day with 5 stars just about reaches it
    const s = interestChance({ upgrades: all, speakerOn: true, flyers: true, weather: 'sunny', rep: 5, festival: false });
    expect(s.chance).toBeGreaterThan(0.36);
  });
});
