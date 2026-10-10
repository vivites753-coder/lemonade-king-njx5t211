import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLOSSARY_IDS } from '../src/data/glossary';
import { LOCATION_IDS } from '../src/data/locations';
import { UPGRADE_ORDER } from '../src/data/upgrades';
import { WEATHER_IDS } from '../src/data/weather';
import { GOOD_IDS } from '../src/data/goods';
import { en } from '../src/i18n/en';
import { uk } from '../src/i18n/uk';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const keys = new Set(Object.keys(uk));

describe('translations', () => {
  it('English has every Ukrainian key and no extra ones', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(uk).sort());
    for (const [k, v] of Object.entries(en)) expect(v, k).not.toBe('');
  });

  it('every literal t("…") key used in the code exists', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(join(__dirname, '../src'))) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) if (!keys.has(m[1])) missing.push(`${m[1]} (${file})`);
    }
    expect(missing).toEqual([]);
  });

  it('keys built from data ids exist', () => {
    const need: string[] = [];
    for (const id of LOCATION_IDS) need.push(`loc.${id}.name`, `loc.${id}.desc`, `loc.${id}.peak`);
    for (const id of UPGRADE_ORDER) need.push(`up.${id}.name`, `up.${id}.desc`, `up.${id}.idea`);
    for (const id of WEATHER_IDS) need.push(`weather.${id}`, `why.weather.${id}`);
    for (const id of GLOSSARY_IDS) need.push(`gl.${id}.term`, `gl.${id}.text`);
    for (const id of GOOD_IDS) need.push(`good.${id}`, `good.${id}.note`);
    for (const id of ['festival', 'sugarHike', 'cupsSoldOut', 'badLemons', 'thiefCaught', 'thiefStole', 'thiefEmpty', 'grandmaHelp'])
      need.push(`card.${id}.title`, `card.${id}.text`, `card.${id}.lemi`);
    for (const id of ['welcome', 'morning', 'location', 'market', 'cheap_lemons', 'prepare_cost', 'price', 'recipe', 'sell_start', 'first_sale', 'expensive', 'queue', 'rain', 'spoiled', 'thief', 'report', 'shop', 'school', 'taste_bad', 'reputation'])
      need.push(`tip.${id}`);
    for (let i = 0; i < 4; i++) need.push(`news.calm${i}`);
    expect(need.filter((k) => !keys.has(k))).toEqual([]);
  });

  it('every tip the game can show has a text', () => {
    const game = readFileSync(join(__dirname, '../src/sim/game.ts'), 'utf8');
    const tips = [...game.matchAll(/this\.tip\('([a-z_]+)'\)/g)].map((m) => m[1]);
    expect(tips.length).toBeGreaterThan(10);
    expect(tips.filter((k) => !keys.has(`tip.${k}`))).toEqual([]);
  });

  it('every lesson and toast key used by the simulation exists', () => {
    const files = ['sim/lessons.ts', 'sim/game.ts'].map((f) => readFileSync(join(__dirname, '../src', f), 'utf8')).join('\n');
    const used = [...files.matchAll(/'((?:lesson|toast)\.[a-zA-Z]+)'/g)].map((m) => m[1]);
    expect(used.filter((k) => !keys.has(k))).toEqual([]);
  });
});
