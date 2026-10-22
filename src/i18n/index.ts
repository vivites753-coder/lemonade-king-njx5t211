import type { AgeMode, Lang, Params } from '../core/types';
import { en } from './en';
import { ro } from './ro';
import { uk } from './uk';

const DICTS: Record<Lang, Record<string, string>> = { uk, en, ro };
let current: Lang = 'uk';
/** The player is a boy or a girl (see setGender). */
let gender: 'm' | 'f' = 'm';
/** "{впіймав|впіймала}": the word for a boy, then for a girl (a text that speaks to the player). */
const GENDER_RE = /\{([^{}|]*)\|([^{}|]*)\}/g;

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

/** Who plays: the texts that speak to the player take the forms for a boy or for a girl ("{впіймав|впіймала}"). */
export function setGender(avatar: 'boy' | 'girl'): void {
  gender = avatar === 'girl' ? 'f' : 'm';
}

export function has(key: string): boolean {
  return key in DICTS[current] || key in uk;
}

/**
 * Translate a key. Params like {n} are replaced; a param value starting with "@" is itself translated
 * (a list "@a, @b" translates each part); "{a boy's word|a girl's word}" takes the form for the player.
 */
export function t(key: string, params?: Params): string {
  let s = DICTS[current][key] ?? (uk as Record<string, string>)[key] ?? key;
  if (s.includes('|')) s = s.replace(GENDER_RE, (_m, boy: string, girl: string) => (gender === 'f' ? girl : boy));
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
  return agree(s, current);
}

/* The texts are written with the word after a number in its "many" form ("{n} монет", "{n} coins");
 * agree() puts the right form for the number that was put in. */

/** Ukrainian: the forms for 1, 2-4 and 5+, then for 1 after a verb or "на"/"за" (whom/what: "украв 1 монету")
 * and after "не вистачило"/"до" (of what: "не вистачило 1 монети", "до 3 склянок"). */
const UK_FORMS: Record<string, [string, string, string, string, string]> = {
  монет: ['монета', 'монети', 'монет', 'монету', 'монети'],
  склянок: ['склянка', 'склянки', 'склянок', 'склянку', 'склянки'],
  лимонів: ['лимон', 'лимони', 'лимонів', 'лимон', 'лимона'],
  людей: ['людина', 'людини', 'людей', 'людину', 'людини'],
  перехожих: ['перехожий', 'перехожі', 'перехожих', 'перехожого', 'перехожого'],
  днів: ['день', 'дні', 'днів', 'день', 'дня'],
  глечиків: ['глечик', 'глечики', 'глечиків', 'глечик', 'глечика'],
  покупців: ['покупець', 'покупці', 'покупців', 'покупця', 'покупця'],
  пляшок: ['пляшка', 'пляшки', 'пляшок', 'пляшку', 'пляшки'],
  ложок: ['ложка', 'ложки', 'ложок', 'ложку', 'ложки'],
  стаканчиків: ['стаканчик', 'стаканчики', 'стаканчиків', 'стаканчик', 'стаканчика'],
  клітинок: ['клітинка', 'клітинки', 'клітинок', 'клітинку', 'клітинки'],
  літер: ['літера', 'літери', 'літер', 'літеру', 'літери'],
  годин: ['година', 'години', 'годин', 'годину', 'години'],
};
/** The words before a number that ask "whom/what" and "of what" (the texts use these). */
const UK_ACC = new Set(['на', 'за', 'тобі', 'заробив', 'украв', 'коштує', 'коштував', 'вилити', 'розлив', 'назад']);
const UK_GEN = new Set(['вистачило', 'до']);
/** English and Romanian: the form for 1. */
const EN_ONE: Record<string, string> = {
  coins: 'coin',
  cups: 'cup',
  people: 'person',
  passers: 'passer',
  lemons: 'lemon',
  days: 'day',
  tiles: 'tile',
  spoons: 'spoon',
  letters: 'letter',
  pitchers: 'pitcher',
  customers: 'customer',
  hours: 'hour',
};
const RO_ONE: Record<string, string> = {
  bani: 'ban',
  pahare: 'pahar',
  oameni: 'om',
  trecători: 'trecător',
  zile: 'zi',
  lămâi: 'lămâie',
  pătrățele: 'pătrățel',
  linguri: 'lingură',
  litere: 'literă',
  clienți: 'client',
  ore: 'oră',
};
const wordsRe = (words: string[]) => new RegExp(`(\\d+(?:[.,]\\d+)?) (${words.join('|')})(?![\\p{L}ʼ'])`, 'gu');
const UK_RE = wordsRe(Object.keys(UK_FORMS));
const EN_RE = wordsRe(Object.keys(EN_ONE));
const RO_RE = wordsRe(Object.keys(RO_ONE));

/**
 * The word after a number agrees with it: uk "1 монет" → "1 монета", "3 монет" → "3 монети", "11 монет" stays,
 * a fraction takes the 2-4 form; en "1 coins" → "1 coin"; ro "1 bani" → "1 ban", "20 bani" → "20 de bani".
 */
export function agree(s: string, lang: Lang): string {
  if (lang === 'uk')
    return s.replace(UK_RE, (_m, num: string, word: string, at: number) => {
      const forms = UK_FORMS[word];
      const before = /(\p{L}+)\s*$/u.exec(s.slice(0, at))?.[1].toLowerCase() ?? '';
      const gen = UK_GEN.has(before);
      if (/[.,]/.test(num)) return `${num} ${forms[gen ? 4 : 1]}`;
      const n = Number(num);
      const d10 = n % 10;
      const d100 = n % 100;
      let f = d10 === 1 && d100 !== 11 ? 0 : d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14) ? 1 : 2;
      if (f === 0 && UK_ACC.has(before)) f = 3;
      else if (gen) f = f === 0 ? 4 : 2;
      return `${num} ${forms[f]}`;
    });
  if (lang === 'en') return s.replace(EN_RE, (m, num: string, word: string) => (num === '1' ? `1 ${EN_ONE[word]}` : m));
  return s.replace(RO_RE, (m, num: string, word: string) => {
    if (num === '1') return `1 ${RO_ONE[word]}`;
    if (/[.,]/.test(num)) return m;
    const n = Number(num) % 100;
    // from 20 on (and 100, 200…) Romanian puts "de" before the noun
    return Number(num) > 0 && (n === 0 || n >= 20) ? `${num} de ${word}` : m;
  });
}

/** Lemi tip text for the reading level. */
export function tipText(key: string, mode: AgeMode): string {
  const kidKey = `tip.${key}.kid`;
  if (mode === 'kid' && has(kidKey)) return t(kidKey);
  return t(`tip.${key}`);
}
