import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLOSSARY_IDS } from '../src/data/glossary';
import { LOCATION_IDS } from '../src/data/locations';
import { UPGRADE_ORDER } from '../src/data/upgrades';
import { WEATHER_IDS } from '../src/data/weather';
import { GOOD_IDS } from '../src/data/goods';
import { TRUCK_SKINS } from '../src/data/truck';
import { POINT_UPGRADE_IDS } from '../src/sim/points';
import { en } from '../src/i18n/en';
import { ro } from '../src/i18n/ro';
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

  it('Romanian has every Ukrainian key, with the same {placeholders}', () => {
    expect(Object.keys(ro).sort()).toEqual(Object.keys(uk).sort());
    const ph = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
    for (const [k, v] of Object.entries(ro)) {
      expect(v, k).not.toBe('');
      expect(ph(v), k).toEqual(ph(en[k as keyof typeof en]));
    }
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
    for (const id of POINT_UPGRADE_IDS) need.push(`ptup.${id}`);
    for (const st of ['ok', 'late', 'rude', 'sick', 'empty', 'nomoney']) need.push(`points.status.${st}`);
    for (const sk of TRUCK_SKINS) need.push(`truck.skin.${sk.id}`);
    for (const id of ['ill', 'back', 'sick', 'late', 'rude', 'raise', 'stole', 'quit']) need.push(`card.staff.${id}.title`, `card.staff.${id}.text`, `card.staff.${id}.lemi`);
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

describe('numbers in the texts', () => {
  it('the word after a number agrees with it', async () => {
    const { agree } = await import('../src/i18n');
    const uk = (x: string) => agree(x, 'uk');
    expect(uk('1 монет')).toBe('1 монета');
    expect(uk('+21 монет!')).toBe('+21 монета!');
    expect(uk('3 монет/день')).toBe('3 монети/день');
    expect(uk('12 монет')).toBe('12 монет');
    expect(uk('34 монет на вітер')).toBe('34 монети на вітер');
    expect(uk('10 склянок')).toBe('10 склянок');
    expect(uk('22 склянок')).toBe('22 склянки');
    expect(uk('1 людей')).toBe('1 людина');
    expect(uk('2,5 монет')).toBe('2,5 монети');
    // only whole words right after a number
    expect(uk('монет 5')).toBe('монет 5');
    expect(uk('3 монетами')).toBe('3 монетами');
    // the case asked by the word before the number
    expect(uk('Лис украв 21 монет!')).toBe('Лис украв 21 монету!');
    expect(uk('(на 1 монет)')).toBe('(на 1 монету)');
    expect(uk('не вистачило 1 монет')).toBe('не вистачило 1 монети');
    expect(uk('не вистачило 3 монет')).toBe('не вистачило 3 монет');
    expect(uk('до 21 склянок')).toBe('до 21 склянки');
    expect(uk('дякує: +1 монет')).toBe('дякує: +1 монета');
    expect(agree('1 coins, 2 cups, 1 passers-by', 'en')).toBe('1 coin, 2 cups, 1 passer-by');
    expect(agree('1 bani, 5 bani, 20 bani, 101 bani, 120 bani', 'ro')).toBe('1 ban, 5 bani, 20 de bani, 101 bani, 120 de bani');
  });
});

describe('texts that speak to the player', () => {
  it('a boy and a girl get their own words', async () => {
    const { setGender, setLang, t } = await import('../src/i18n');
    setLang('uk');
    setGender('girl');
    expect(t('card.thiefCaught.title')).toBe('Ти впіймала лиса! 🦊');
    expect(t('roadmap.max')).toContain('справжня підприємиця');
    expect(t('bonus.cat.found', { n: 5 })).toBe('Ти знайшла кота Мурчика! Господиня дякує: +5 монет.');
    setGender('boy');
    expect(t('card.thiefCaught.title')).toBe('Ти впіймав лиса! 🦊');
    expect(t('roadmap.max')).toContain('справжній підприємець');
    setLang('ro');
    setGender('girl');
    expect(t('roadmap.max')).toContain('o antreprenoare adevărată');
    setLang('uk');
    setGender('boy');
  });

  it('every "{boy|girl}" pair is whole: two words, nothing left for the player to see', () => {
    for (const [lang, dict] of [['uk', uk], ['en', en], ['ro', ro]] as const) {
      for (const [k, v] of Object.entries(dict)) {
        for (const m of v.matchAll(/\{([^{}]*)\}/g)) {
          if (!m[1].includes('|')) continue;
          const parts = m[1].split('|');
          expect(parts.length, `${lang} ${k}`).toBe(2);
          for (const p of parts) expect(p.trim().length, `${lang} ${k}`).toBeGreaterThan(0);
        }
      }
    }
  });
});
