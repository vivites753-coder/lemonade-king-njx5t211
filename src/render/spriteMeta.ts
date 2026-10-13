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
  prop_bike_rack: { h: 46, anchor: [0.5, 0.85] },
  prop_duck: { h: 16, anchor: [0.5, 0.8] },
  prop_car_a: { h: 44, anchor: [0.5, 0.75] },
  // drawn cars: one scale for all, the front picture drives to the lower right, the back one to the upper left
  prop_car_a_front: { h: 52.8, anchor: [0.5, 0.9] },
  prop_car_b_front: { h: 50.6, anchor: [0.5, 0.9] },
  prop_car_c_front: { h: 49.9, anchor: [0.5, 0.9] },
  prop_car_d_front: { h: 51.2, anchor: [0.5, 0.9] },
  prop_van_front: { h: 56.0, anchor: [0.5, 0.9] },
  prop_car_a_back: { h: 50.9, anchor: [0.5, 0.9] },
  prop_car_b_back: { h: 49.3, anchor: [0.5, 0.9] },
  prop_car_c_back: { h: 48.0, anchor: [0.5, 0.9] },
  prop_car_d_back: { h: 49.9, anchor: [0.5, 0.9] },
  prop_van_back: { h: 52.8, anchor: [0.5, 0.9] },
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
  bld_school: { h: 288, anchor: [0.5, 0.66] },
  bld_fountain: { h: 56, anchor: [0.5, 0.71] },
  bld_lifeguard: { h: 135, anchor: [0.5, 0.84] },
  // stand layers: every picture sits at its own spot around the table (dx, dy from the stand centre)
  // behind the table
  stand_cooler: { h: 26, anchor: [0.5, 0.9], dx: -24, dy: -18 },
  stand_bike: { h: 44, anchor: [0.5, 0.9], dx: 82, dy: 25 },
  stand_scooter: { h: 38, anchor: [0.5, 0.9], dx: 80, dy: 23 },
  stand_toolkit: { h: 17, anchor: [0.5, 0.85], dx: -1, dy: -27 },
  stand_chair: { h: 34, anchor: [0.5, 0.83], dx: 58, dy: -5 },
  stand_umbrella: { h: 136, anchor: [0.5, 0.96], dx: 27, dy: 9 },
  // the table and the second (blue) table of the big stand
  stand_table_blue: { h: 66, anchor: [0.5, 0.66], dx: -45, dy: -22 },
  // on the table, back to front
  item_lemon_pile: { h: 16, anchor: [0.5, 0.8], dx: -24, dy: -30 },
  item_pitcher_empty: { h: 30, anchor: [0.5, 0.9], dx: -6, dy: -25 },
  item_pitcher_full: { h: 30, anchor: [0.5, 0.9], dx: -6, dy: -25 },
  stand_dispenser: { h: 34, anchor: [0.5, 0.9], dx: -6, dy: -26 },
  stand_juicer_hand: { h: 15, anchor: [0.5, 0.85], dx: 17, dy: -20 },
  stand_cashbox: { h: 13, anchor: [0.5, 0.85], dx: 29, dy: -17 },
  item_coin_jar: { h: 15, anchor: [0.5, 0.9], dx: 29, dy: -17 },
  item_cups_pack: { h: 18, anchor: [0.5, 0.9], dx: 2, dy: -16 },
  item_cups_branded: { h: 18, anchor: [0.5, 0.9], dx: 2, dy: -16 },
  stand_flyers: { h: 8, anchor: [0.5, 0.8], dx: 7, dy: -9 },
  // in front of the stand
  stand_mascot: { h: 44, anchor: [0.5, 0.95], dx: -90, dy: -5 },
  stand_tent: { h: 139, anchor: [0.5, 0.74], dx: 11, dy: -6 },
  stand_speaker: { h: 31, anchor: [0.5, 0.92], dx: 50, dy: 9 },
  stand_tv: { h: 54, anchor: [0.5, 0.93], dx: 66, dy: 42 },
  stand_sign: { h: 42, anchor: [0.5, 0.92], dx: -68, dy: 12 },
  item_cookies: { h: 13, anchor: [0.5, 0.85], dx: 21, dy: -10 },
  stand_juicer_lever: { h: 30, anchor: [0.5, 0.9], dx: 17, dy: -19 },
  // measured on the picture: the long side is 1.6 tiles, the top 22 px above the floor
  stand_table: { h: 76, anchor: [0.5, 0.66] },
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
