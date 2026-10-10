// Visual-only appearance of pedestrians. Uses Math.random on purpose: it must not change the simulation RNG.
import type { PedTypeId } from '../core/types';

export interface Look {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  accent: string;
  longHair: boolean;
  variant: number;
}

const SKINS = ['#f8d6b8', '#efc29e', '#dca57f', '#bf845c', '#8f5c3d'];
const HAIRS = ['#3b2a20', '#6b4423', '#b5651d', '#e3c16f', '#262626', '#a0522d'];
const SHIRTS = ['#ff6b6b', '#4dabf7', '#69db7c', '#ffd43b', '#b197fc', '#ff922b', '#20c997', '#f783ac'];
const PANTS = ['#3d5a80', '#495057', '#7a5c3e', '#2b8a3e', '#5c7cfa', '#e8590c'];
const ACCENTS = ['#ff6b6b', '#339af0', '#fcc419', '#51cf66', '#cc5de8'];

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export function randomLook(type: PedTypeId): Look {
  const look: Look = {
    skin: pick(SKINS),
    hair: pick(HAIRS),
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
    shoes: '#3a3a3a',
    accent: pick(ACCENTS),
    longHair: Math.random() < 0.45,
    variant: Math.floor(Math.random() * 3),
  };
  if (type === 'granny') {
    look.hair = Math.random() < 0.5 ? '#e0e0e0' : '#c9c9c9';
    look.longHair = false;
    look.shirt = pick(['#b197fc', '#f783ac', '#74c0fc', '#8ce99a']);
  }
  if (type === 'sport') {
    look.shirt = pick(['#ff922b', '#22b8cf', '#94d82d', '#f03e3e']);
    look.pants = '#343a40';
    look.shoes = '#f8f9fa';
  }
  if (type === 'tourist') look.shirt = pick(['#ffa94d', '#ff8787', '#63e6be', '#ffd43b']);
  return look;
}

export function playerLook(avatar: 'boy' | 'girl'): Look {
  return {
    skin: '#f6cfae',
    hair: avatar === 'girl' ? '#8a4b2a' : '#4a3020',
    shirt: '#4dabf7',
    pants: '#3d5a80',
    shoes: '#3a3a3a',
    accent: '#ffd43b',
    longHair: avatar === 'girl',
    variant: 0,
  };
}

export const FOX_LOOK: Look = {
  skin: '#f08c2e',
  hair: '#e8590c',
  shirt: '#5c5f66',
  pants: '#343a40',
  shoes: '#212529',
  accent: '#ffffff',
  longHair: false,
  variant: 0,
};
