import type { SpriteMeta } from './assets';

/**
 * Size and anchor of PNG sprites, per asset ID. Only used when a PNG exists.
 * h = height on screen in world px (a tile is 64×32), anchor = the point of the image that sits on the
 * object's position ([0.5, 1] = bottom centre). Tweak these when real art arrives.
 */
export const SPRITE_META: Record<string, SpriteMeta> = {
  prop_tree_a: { h: 100, anchor: [0.5, 0.94] },
  prop_tree_b: { h: 90, anchor: [0.5, 0.94] },
  prop_tree_c: { h: 80, anchor: [0.5, 0.94] },
  prop_palm: { h: 110, anchor: [0.5, 0.95] },
  prop_bush: { h: 30, anchor: [0.5, 0.85] },
  prop_flowers: { h: 22, anchor: [0.5, 0.8] },
  prop_bench: { h: 34, anchor: [0.5, 0.8] },
  prop_lamp: { h: 78, anchor: [0.5, 0.97] },
  prop_fence_post: { h: 24, anchor: [0.3, 0.9] },
  prop_mailbox: { h: 34, anchor: [0.5, 0.95] },
  prop_parasol: { h: 80, anchor: [0.5, 0.92] },
  prop_boat: { h: 50, anchor: [0.5, 0.75] },
  prop_sandcastle: { h: 30, anchor: [0.5, 0.85] },
  prop_beachball: { h: 16, anchor: [0.5, 0.85] },
  prop_ball: { h: 14, anchor: [0.5, 0.85] },
  prop_flagpole: { h: 110, anchor: [0.5, 0.98] },
  prop_bike_rack: { h: 26, anchor: [0.5, 0.85] },
  prop_duck: { h: 16, anchor: [0.5, 0.8] },
  prop_car_a: { h: 44, anchor: [0.5, 0.75] },
  bld_house_yard: { h: 160, anchor: [0.5, 0.78] },
  bld_school: { h: 220, anchor: [0.5, 0.75] },
  bld_fountain: { h: 80, anchor: [0.5, 0.75] },
  bld_lifeguard: { h: 110, anchor: [0.5, 0.92] },
  stand_table: { h: 70, anchor: [0.5, 0.7] },
};
