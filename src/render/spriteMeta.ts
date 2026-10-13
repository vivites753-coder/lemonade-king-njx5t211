import type { SpriteMeta } from './assets';

/**
 * Size and anchor of PNG sprites, per asset ID. Only used when a PNG exists.
 * h = height on screen in world px (a tile is 64×32), anchor = the point of the image that sits on the
 * object's position ([0.5, 1] = bottom centre). Tweak these when real art arrives.
 */
export const SPRITE_META: Record<string, SpriteMeta> = {
  prop_tree_a: { h: 82, anchor: [0.5, 0.894] },
  prop_tree_b: { h: 77, anchor: [0.5, 0.864] },
  prop_tree_c: { h: 67, anchor: [0.5, 0.900] },
  prop_palm: { h: 88, anchor: [0.5, 0.868] },
  prop_bush: { h: 30, anchor: [0.5, 0.85] },
  prop_flowers: { h: 22, anchor: [0.5, 0.8] },
  prop_bench: { h: 34, anchor: [0.5, 0.8] },
  prop_lamp: { h: 80, anchor: [0.5, 0.948] },
  prop_fence_post: { h: 34, anchor: [0.04, 0.52] },
  prop_mailbox: { h: 35, anchor: [0.5, 0.932] },
  prop_parasol: { h: 62, anchor: [0.5, 0.92] },
  prop_boat: { h: 50, anchor: [0.5, 0.75] },
  prop_sandcastle: { h: 30, anchor: [0.5, 0.844] },
  prop_beachball: { h: 16, anchor: [0.5, 0.85] },
  prop_ball: { h: 14, anchor: [0.5, 0.85] },
  prop_flagpole: { h: 110, anchor: [0.5, 0.98] },
  prop_bike_rack: { h: 26, anchor: [0.5, 0.85] },
  prop_duck: { h: 16, anchor: [0.5, 0.8] },
  prop_car_a: { h: 44, anchor: [0.5, 0.75] },
  // the anchor is the centre of the footprint, not the front corner: the front corner is about 40 px lower
  // the stand people: the same size for every pose of one person (their pictures differ in height)
  char_player_boy_front: { h: 42.9, anchor: [0.5, 0.975] },
  char_player_boy_juicing: { h: 42.9, anchor: [0.5, 0.975] },
  char_player_boy_splashed: { h: 43.0, anchor: [0.5, 0.975] },
  char_player_girl_front: { h: 47.4, anchor: [0.5, 0.975] },
  char_player_girl_juicing: { h: 46.7, anchor: [0.5, 0.975] },
  char_helper_boy_front: { h: 42.8, anchor: [0.5, 0.975] },
  char_helper_boy_serving: { h: 43.5, anchor: [0.5, 0.975] },
  char_helper_girl_front: { h: 45.2, anchor: [0.5, 0.975] },
  char_fox_front: { h: 54, anchor: [0.5, 0.975] },
  char_fox_back: { h: 54, anchor: [0.5, 0.975] },
  char_fox_dizzy: { h: 64, anchor: [0.5, 0.975] },
  bld_house_yard: { h: 180, anchor: [0.5, 0.69] },
  bld_school: { h: 380, anchor: [0.5, 0.7] },
  bld_fountain: { h: 112, anchor: [0.5, 0.71] },
  bld_lifeguard: { h: 135, anchor: [0.5, 0.84] },
  stand_table: { h: 70, anchor: [0.5, 0.7] },
  // indoor places: the wall image covers both back walls; its anchor is the back corner on the floor
  wall_mall: { h: 311, anchor: [0.5, 0.383] },
  wall_station: { h: 311, anchor: [0.5, 0.383] },
  bld_stage: { h: 160, anchor: [0.5, 0.69] },
  prop_vending: { h: 70, anchor: [0.5, 0.85] },
  prop_column: { h: 88, anchor: [0.5, 0.95] },
  prop_luggage: { h: 44, anchor: [0.5, 0.8] },
  prop_sign_platform: { h: 64, anchor: [0.5, 0.95] },
  prop_bin: { h: 24, anchor: [0.5, 0.9] },
  prop_plant: { h: 54, anchor: [0.5, 0.92] },
  prop_balloons: { h: 80, anchor: [0.5, 0.97] },
  prop_kiosk_info: { h: 80, anchor: [0.5, 0.8] },
};
