import type { LocationId, PedTypeId } from '../core/types';

/** A static object placed in a location. `id` is the sprite / asset id. */
export interface DecorDef {
  id: string;
  x: number;
  y: number;
  /** Scale. */
  s?: number;
  /** Footprint for buildings (tiles). */
  w?: number;
  d?: number;
  /** Drawn before everything else (big buildings at the back). */
  back?: boolean;
}

export type WallStyle = 'station' | 'mall';

export interface LocationDef {
  id: LocationId;
  icon: string;
  /** Pedestrians per game hour (before curve and weather). */
  density: number;
  rent: number;
  /** Hours to get there from home. */
  travel: number;
  fairPrice: number;
  /** 0.7 = weather matters less than usual, 1.8 = much more; below 0 = bad weather brings people in. */
  weatherSensitivity: number;
  /** Under a roof: the weather barely changes thirst, rain brings people inside, no umbrella needed. */
  indoor?: boolean;
  /** Back walls of an indoor place. */
  walls?: WallStyle;
  /** Opens when the best reputation reaches this many stars. */
  minRep?: number;
  mix: Record<PedTypeId, number>;
  hourCurve: (h: number) => number;
  cars: boolean;
  /** 1–5, shown on the location card. */
  trafficStars: number;
  /** 12 rows (y) of 12 chars (x). See ground.ts for the legend. */
  map: string[];
  decor: DecorDef[];
}

/** A fence along x: one section (about a tile long) per step, evenly spread over x0..x1. */
function fence(y: number, x0: number, x1: number): DecorDef[] {
  const out: DecorDef[] = [];
  const n = Math.max(1, Math.round(x1 - x0));
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) out.push({ id: 'prop_fence_post', x: x0 + i * step, y, s: step });
  return out;
}

const G12 = 'gggggggggggg';

export const LOCATIONS: Record<LocationId, LocationDef> = {
  yard: {
    id: 'yard',
    icon: '🏡',
    density: 14,
    rent: 0,
    travel: 0,
    fairPrice: 8,
    weatherSensitivity: 0.7,
    mix: { kid: 0.2, adult: 0.35, granny: 0.25, sport: 0.1, tourist: 0.1 },
    hourCurve: (h) => (h < 9 ? 0.6 : h < 16 ? 0.9 : h < 19.5 ? 1.5 : 0.8),
    cars: true,
    trafficStars: 1,
    map: [
      G12,
      G12,
      G12,
      'ggqggggggggg',
      'ggqggggggggg',
      'pppppppppppp',
      'rrrrrrrrrrrr',
      'RRRRRRRRRRRR',
      'pppppppppppp',
      G12,
      G12,
      G12,
    ],
    decor: [
      { id: 'bld_house_yard', x: 0.4, y: 0.3, w: 3, d: 2.4, back: true },
      { id: 'prop_tree_a', x: 9.3, y: 1.3, s: 1.1 },
      { id: 'prop_tree_b', x: 11.0, y: 3.0, s: 0.9 },
      { id: 'prop_tree_c', x: 7.4, y: 0.7, s: 0.8 },
      { id: 'prop_bush', x: 3.9, y: 2.3 },
      { id: 'prop_bush', x: 0.5, y: 3.9 },
      { id: 'prop_flowers', x: 0.9, y: 3.3 },
      { id: 'prop_flowers', x: 3.1, y: 3.6 },
      { id: 'prop_mailbox', x: 3.9, y: 4.45 },
      { id: 'prop_lamp', x: 10.6, y: 4.6 },
      ...fence(4.8, 0, 3.5),
      ...fence(4.8, 9.5, 12),
      { id: 'prop_tree_a', x: 1.2, y: 10.3, s: 1.2 },
      { id: 'prop_tree_b', x: 4.6, y: 10.7 },
      { id: 'prop_tree_c', x: 8.2, y: 10.2, s: 1.1 },
      { id: 'prop_tree_a', x: 10.9, y: 10.8, s: 0.9 },
      { id: 'prop_bush', x: 6.4, y: 9.7 },
      { id: 'prop_bush', x: 2.8, y: 9.6 },
    ],
  },

  park: {
    id: 'park',
    icon: '🌳',
    density: 26,
    rent: 20,
    travel: 1,
    fairPrice: 10,
    weatherSensitivity: 1.0,
    mix: { kid: 0.25, adult: 0.3, granny: 0.15, sport: 0.2, tourist: 0.1 },
    hourCurve: (h) => (h < 10 ? 1.0 : h < 16 ? 1.2 : h < 19 ? 1.3 : 0.7),
    cars: false,
    trafficStars: 4,
    map: [
      G12,
      'gwwwgggggggg',
      'gwwwgggggggg',
      G12,
      G12,
      'qqqqqqqqqqqq',
      'gqggggggggqg',
      'gqggggggggqg',
      'qqqqqqqqqqqq',
      G12,
      G12,
      G12,
    ],
    decor: [
      { id: 'bld_fountain', x: 8.6, y: 1.8 },
      { id: 'prop_duck', x: 2.4, y: 1.9 },
      { id: 'prop_tree_a', x: 0.5, y: 0.4 },
      { id: 'prop_tree_b', x: 4.6, y: 0.6, s: 1.1 },
      { id: 'prop_tree_a', x: 11.0, y: 0.6 },
      { id: 'prop_tree_c', x: 11.3, y: 3.2, s: 0.9 },
      { id: 'prop_tree_c', x: 0.4, y: 3.7, s: 0.8 },
      { id: 'prop_bench', x: 2.6, y: 4.5 },
      { id: 'prop_bench', x: 10.6, y: 4.5 },
      { id: 'prop_lamp', x: 9.8, y: 4.75 },
      { id: 'prop_lamp', x: 3.7, y: 4.75 },
      { id: 'prop_flowers', x: 5.4, y: 6.9 },
      { id: 'prop_flowers', x: 3.2, y: 6.6 },
      { id: 'prop_tree_b', x: 8.0, y: 7.1, s: 0.8 },
      { id: 'prop_bush', x: 6.6, y: 6.6 },
      { id: 'prop_tree_a', x: 1.2, y: 10.2, s: 1.1 },
      { id: 'prop_tree_c', x: 3.8, y: 10.8 },
      { id: 'prop_tree_a', x: 7.4, y: 10.3, s: 1.2 },
      { id: 'prop_tree_b', x: 10.6, y: 10.4 },
      { id: 'prop_bench', x: 6.2, y: 9.45 },
    ],
  },

  school: {
    id: 'school',
    icon: '🏫',
    density: 24,
    rent: 10,
    travel: 1,
    fairPrice: 6,
    weatherSensitivity: 1.0,
    mix: { kid: 0.65, adult: 0.15, granny: 0.05, sport: 0.05, tourist: 0.1 },
    hourCurve: (h) => {
      if (h >= 10 && h < 10.5) return 3;
      if (h >= 12 && h < 13) return 3;
      if (h >= 15 && h < 16) return 3;
      return 0.35;
    },
    cars: false,
    trafficStars: 3,
    map: [
      G12,
      G12,
      G12,
      'tttttttttttt',
      'tttttttttttt',
      'pppppppppppp',
      'tttttttttttt',
      'tttttttttttt',
      'pppppppppppp',
      G12,
      G12,
      G12,
    ],
    decor: [
      { id: 'bld_school', x: 0.6, y: 0.2, w: 8.2, d: 2.3, back: true },
      { id: 'prop_flagpole', x: 9.6, y: 1.4 },
      { id: 'prop_tree_a', x: 11.0, y: 0.7 },
      { id: 'prop_tree_c', x: 11.2, y: 3.0, s: 0.8 },
      { id: 'prop_bike_rack', x: 9.9, y: 3.7 },
      { id: 'prop_bench', x: 1.0, y: 4.3 },
      { id: 'prop_ball', x: 8.4, y: 6.9 },
      ...fence(9.2, 0, 12),
      { id: 'prop_tree_a', x: 1.2, y: 10.2 },
      { id: 'prop_tree_b', x: 5.4, y: 10.7, s: 0.9 },
      { id: 'prop_tree_c', x: 10.0, y: 10.4, s: 1.1 },
    ],
  },

  beach: {
    id: 'beach',
    icon: '🏖️',
    density: 34,
    rent: 30,
    travel: 2,
    fairPrice: 12,
    weatherSensitivity: 1.8,
    minRep: 2,
    mix: { kid: 0.2, adult: 0.25, granny: 0, sport: 0.15, tourist: 0.4 },
    hourCurve: (h) => (h < 10 ? 0.4 : h < 12 ? 1.0 : h < 17 ? 1.8 : h < 19 ? 1.0 : 0.5),
    cars: false,
    trafficStars: 5,
    map: [
      'wwwwwwwwwwww',
      'wwwwwwwwwwww',
      'eeeeeeeeeeee',
      'ssssssssssss',
      'ssssssssssss',
      'dddddddddddd',
      'ssssssssssss',
      'ssssssssssss',
      'dddddddddddd',
      'ssssssssssss',
      'ssssssssssss',
      'ssssssssssss',
    ],
    decor: [
      { id: 'prop_boat', x: 3.6, y: 0.8 },
      { id: 'prop_parasol', x: 2.2, y: 3.6 },
      { id: 'prop_parasol', x: 9.7, y: 3.5 },
      { id: 'prop_parasol', x: 2.6, y: 7.0 },
      { id: 'prop_parasol', x: 9.4, y: 7.1 },
      { id: 'bld_lifeguard', x: 11.1, y: 2.9 },
      { id: 'prop_palm', x: 0.5, y: 4.3 },
      { id: 'prop_palm', x: 11.4, y: 6.6, s: 0.9 },
      { id: 'prop_palm', x: 0.9, y: 10.2, s: 1.1 },
      { id: 'prop_palm', x: 6.0, y: 10.5 },
      { id: 'prop_palm', x: 10.4, y: 10.3, s: 0.9 },
      { id: 'prop_sandcastle', x: 7.9, y: 6.8 },
      { id: 'prop_beachball', x: 4.2, y: 6.5 },
    ],
  },

  station: {
    id: 'station',
    icon: '🚉',
    density: 20,
    rent: 45,
    travel: 1,
    fairPrice: 11,
    weatherSensitivity: -0.5,
    indoor: true,
    walls: 'station',
    minRep: 2,
    mix: { kid: 0.1, adult: 0.45, granny: 0.1, sport: 0.05, tourist: 0.3 },
    // trains bring waves of people: morning and evening rush, a smaller one at lunch
    hourCurve: (h) => (h < 9.5 ? 1.8 : h < 12 ? 0.9 : h < 13.5 ? 1.4 : h < 16.5 ? 0.8 : h < 19 ? 1.8 : 1.0),
    cars: false,
    trafficStars: 5,
    map: [
      'kkkkkkkkkkkk',
      'kkkkkkkkkkkk',
      'kkkkkkkkkkkk',
      'kkkkkkkkkkkk',
      'kkkkkkkkkkkk',
      'KKKKKKKKKKKK',
      'kkkkkkkkkkkk',
      'kkkkkkkkkkkk',
      'KKKKKKKKKKKK',
      'kkkkkkkkkkkk',
      'kkkkkkkkkkkk',
      'kkkkkkkkkkkk',
    ],
    decor: [
      { id: 'prop_vending', x: 0.7, y: 1.2 },
      { id: 'prop_column', x: 2.6, y: 2.4 },
      { id: 'prop_column', x: 9.0, y: 2.4 },
      { id: 'prop_bench', x: 10.5, y: 1.6 },
      { id: 'prop_luggage', x: 11.3, y: 2.6 },
      { id: 'prop_sign_platform', x: 11.2, y: 4.5 },
      { id: 'prop_bin', x: 3.6, y: 4.6 },
      { id: 'prop_bin', x: 1.6, y: 9.8 },
      { id: 'prop_bench', x: 4.4, y: 10.0 },
      { id: 'prop_luggage', x: 5.6, y: 10.6 },
      { id: 'prop_bench', x: 7.8, y: 10.0 },
      { id: 'prop_vending', x: 10.8, y: 10.5 },
    ],
  },

  mall: {
    id: 'mall',
    icon: '🏬',
    density: 21,
    rent: 70,
    travel: 1,
    fairPrice: 13,
    weatherSensitivity: -0.6,
    indoor: true,
    walls: 'mall',
    minRep: 3,
    mix: { kid: 0.25, adult: 0.4, granny: 0.1, sport: 0.05, tourist: 0.2 },
    // the mall opens at 10; most shoppers come after work
    hourCurve: (h) => (h < 10 ? 0.15 : h < 12 ? 0.8 : h < 17 ? 1.2 : 1.6),
    cars: false,
    trafficStars: 4,
    map: [
      'mmmmmmmmmmmm',
      'mmmmmmmmmmmm',
      'mmmmmmmmmmmm',
      'mmmmmmmmmmmm',
      'mmmmmmmmmmmm',
      'nnnnnnnnnnnn',
      'mmmmmmmmmmmm',
      'mmmmmmmmmmmm',
      'nnnnnnnnnnnn',
      'mmmmmmmmmmmm',
      'mmmmmmmmmmmm',
      'mmmmmmmmmmmm',
    ],
    decor: [
      { id: 'bld_stage', x: 0.4, y: 0.5, w: 2.8, d: 1.8, back: true },
      { id: 'prop_plant', x: 3.9, y: 0.6 },
      { id: 'prop_balloons', x: 8.4, y: 1.4 },
      { id: 'prop_kiosk_info', x: 10.3, y: 2.0 },
      { id: 'prop_plant', x: 11.4, y: 0.6 },
      { id: 'prop_bench', x: 2.3, y: 4.4 },
      { id: 'prop_plant', x: 0.6, y: 4.5 },
      { id: 'prop_plant', x: 1.0, y: 10.2 },
      { id: 'prop_bench', x: 3.6, y: 10.0 },
      { id: 'prop_plant', x: 6.2, y: 10.4 },
      { id: 'prop_bench', x: 8.6, y: 10.0 },
      { id: 'prop_balloons', x: 11.0, y: 10.3 },
    ],
  },
};

export const LOCATION_IDS = Object.keys(LOCATIONS) as LocationId[];

export function locationUnlocked(bestRep: number, id: LocationId): boolean {
  return bestRep >= (LOCATIONS[id].minRep ?? 0) - 1e-9;
}
