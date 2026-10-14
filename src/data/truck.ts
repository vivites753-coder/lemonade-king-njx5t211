// The food truck's looks: the player picks a colour scheme, a logo and the text of the neon sign.

export interface TruckSkin {
  id: string;
  body: string;
  trim: string;
  awning: string;
  neon: string;
}

export const TRUCK_SKINS: TruckSkin[] = [
  { id: 'lemon', body: '#ffe066', trim: '#f08c00', awning: '#ff922b', neon: '#ff6b6b' },
  { id: 'mint', body: '#96f2d7', trim: '#0ca678', awning: '#20c997', neon: '#f783ac' },
  { id: 'berry', body: '#fcc2d7', trim: '#d6336c', awning: '#f06595', neon: '#74c0fc' },
  { id: 'sky', body: '#a5d8ff', trim: '#1971c2', awning: '#339af0', neon: '#ffe066' },
  { id: 'retro', body: '#ffa8a8', trim: '#c92a2a', awning: '#fa5252', neon: '#69db7c' },
  { id: 'lilac', body: '#d0bfff', trim: '#7048e8', awning: '#9775fa', neon: '#63e6be' },
];

/** Logos without zero-width joiners (they break on Windows 10). */
export const TRUCK_LOGOS = ['🍋', '⭐', '🍓', '👑', '🌈'];

export const TRUCK_TEXT_MAX = 14;
