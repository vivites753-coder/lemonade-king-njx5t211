import { describe, expect, it } from 'vitest';
import { parseSave, serializeSave } from '../src/core/save';
import { Game } from '../src/sim/game';
import { playDay } from './bot';

describe('save files', () => {
  it('a save exported to a file loads back identically', () => {
    const g = new Game(5);
    g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed: 5 });
    playDay(g);
    const text = serializeSave(g.snapshot());
    const parsed = parseSave(text);
    expect(parsed).not.toBeNull();
    const g2 = new Game(1);
    g2.restore(parsed!);
    expect(g2.S).toEqual(g.S);
    expect(g2.D).toEqual(g.D);
  });

  it('rejects files that are not saves', () => {
    expect(parseSave('')).toBeNull();
    expect(parseSave('not json')).toBeNull();
    expect(parseSave('{"hello":1}')).toBeNull();
    expect(parseSave('[1,2,3]')).toBeNull();
    expect(parseSave('null')).toBeNull();
    expect(parseSave('{"v":2,"S":{},"D":{}}')).toBeNull();
  });

  it('old saves with the removed read-aloud setting still load', () => {
    const g = new Game(7);
    g.newGame({ ageMode: 'kid', avatar: 'boy', lang: 'uk', seed: 7 });
    const snap = JSON.parse(serializeSave(g.snapshot()));
    snap.S.settings.readAloud = true;
    const parsed = parseSave(JSON.stringify(snap))!;
    expect('readAloud' in parsed.S.settings).toBe(false);
  });
});
