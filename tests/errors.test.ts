// The error log: one entry for each kind of error (with a count), only the last ones kept, anything thrown accepted.
import { describe, expect, it, vi } from 'vitest';
import { clearErrors, errorLog, logError } from '../src/core/errors';

describe('error log', () => {
  it('counts repeats, accepts anything thrown and keeps only the last errors', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    clearErrors();
    for (let i = 0; i < 5; i++) logError('render', new TypeError('x is undefined'));
    logError('game', 'a string');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    logError('promise', circular);
    const list = errorLog();
    expect(list.length).toBe(3);
    expect(list[0]).toMatchObject({ where: 'render', msg: 'TypeError: x is undefined', n: 5 });
    expect(list[1].msg).toBe('Error: a string');
    expect(list[2].msg).toBe('Error: [object Object]');
    // the console shows each kind once
    expect(quiet).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 30; i++) logError('ui', new Error(`e${i}`));
    const kept = errorLog();
    expect(kept.length).toBe(12);
    expect(kept[kept.length - 1].msg).toBe('Error: e29');
    clearErrors();
    expect(errorLog().length).toBe(0);
    quiet.mockRestore();
  });
});
