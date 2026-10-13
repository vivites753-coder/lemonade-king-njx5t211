import type { AgeMode, Lang, Params } from '../core/types';
import { en } from './en';
import { ro } from './ro';
import { uk } from './uk';

const DICTS: Record<Lang, Record<string, string>> = { uk, en, ro };
let current: Lang = 'uk';

/** Language buttons, in the order they are shown. */
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'uk', name: 'Українська' },
  { id: 'en', name: 'English' },
  { id: 'ro', name: 'Română' },
];

/** A saved or clicked value that may not be a known language. */
export function asLang(v: unknown): Lang {
  return typeof v === 'string' && v in DICTS ? (v as Lang) : 'uk';
}

export function setLang(l: Lang): void {
  current = asLang(l);
  if (typeof document !== 'undefined') document.documentElement.lang = current;
}

export function getLang(): Lang {
  return current;
}

export function has(key: string): boolean {
  return key in DICTS[current] || key in uk;
}

/**
 * Translate a key. Params like {n} are replaced; a param value starting with "@" is itself translated
 * (a list "@a, @b" translates each part).
 */
export function t(key: string, params?: Params): string {
  let s = DICTS[current][key] ?? (uk as Record<string, string>)[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      const val =
        typeof v === 'string' && v.startsWith('@')
          ? v
              .split(', ')
              .map((p) => (p.startsWith('@') ? t(p.slice(1)) : p))
              .join(', ')
          : String(v);
      s = s.split(`{${k}}`).join(val);
    }
  }
  return s;
}

/** Lemi tip text for the reading level. */
export function tipText(key: string, mode: AgeMode): string {
  const kidKey = `tip.${key}.kid`;
  if (mode === 'kid' && has(kidKey)) return t(kidKey);
  return t(`tip.${key}`);
}
