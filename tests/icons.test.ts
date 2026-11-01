// The game shows no emoji: its texts have none, every card has a picture, every glyph the code asks for exists.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOC_EVENTS } from '../src/data/events';
import { en } from '../src/i18n/en';
import { ro } from '../src/i18n/ro';
import { uk } from '../src/i18n/uk';
import { CARD_ART } from '../src/ui/cardArt';
import { GLYPHS } from '../src/ui/glyphs';

/** Emoji, but not ★ and ✓ (letters of the font). */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{2604}\u{2606}-\u{2712}\u{2714}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/u;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('no emoji on screen', () => {
  it('no text of any language has an emoji', () => {
    for (const [lang, dict] of [['uk', uk], ['en', en], ['ro', ro]] as const) {
      const bad = Object.entries(dict).filter(([, v]) => EMOJI.test(v));
      expect(bad.map(([k]) => `${lang} ${k}`)).toEqual([]);
    }
  });

  it('every card the game shows has its picture', () => {
    const src = readFileSync('src/sim/game.ts', 'utf8');
    const ids = new Set([...src.matchAll(/this\.card\(\s*'([\w.]+)'/g)].map((m) => m[1]));
    // the ids made at run time
    for (const e of LOC_EVENTS) ids.add(`ev.${e.id}`);
    for (const issue of ['sick', 'late', 'rude', 'raise', 'stole']) ids.add(`staff.${issue}`);
    for (const m of src.matchAll(/this\.card\(\s*'([\w.]+)'\s*:\s*'([\w.]+)'/g)) ids.add(m[2]);
    for (const m of src.matchAll(/'(acc\.\w+)'/g)) ids.add(m[1]);
    const missing = [...ids].filter((id) => !(id in CARD_ART));
    expect(missing).toEqual([]);
  });

  it('every glyph the interface asks for exists', () => {
    const asked = new Set<string>();
    for (const f of [...files('src/ui'), ...files('src/render')]) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/\bgi\('([\w-]+)'/g)) asked.add(m[1]);
      for (const m of s.matchAll(/'gi:([\w-]+)'/g)) asked.add(m[1]);
    }
    expect([...asked].filter((n) => !(n in GLYPHS))).toEqual([]);
  });
});
