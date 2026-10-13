# Промпти для решти графіки

До кожного запиту додавай референс стилю: `art/style-test/sheet_01.jpg`.
Для кожного листа промпт складається так: **СІТКА** (з числами) + **ЗАГОЛОВОК СТИЛЮ** (ISO або FLAT) + **СПИСОК**.

Негативний для всіх: `shadow, ground, text, letters, numbers, watermark, glow, halo, realistic, scary, transparent glass`.

## СІТКА (підстав стовпці, рядки, кількість, % заповнення)

```
A sprite sheet of {N} cute game assets arranged in a strict {C}-column by {R}-row grid on a perfectly flat solid magenta background (#FF00FF). Every item sits alone in its own grid cell, centered, filling about {70-78}% of the cell, with a wide empty magenta margin around it (at least 12% of the cell on every side), no item touching or overlapping another or the cell edge, no grid lines, no labels, no numbers, no watermark.
```

## ЗАГОЛОВОК ISO (ізометричні предмети, тварини, машини)

```
Use the attached image as the exact style reference: isometric 3D render, cute stylized soft clay / toy-like look, rounded chunky shapes, bright cheerful saturated colors (lemon yellow #FFD93B, fresh green #8FD16A, turquoise #2BB3A3, sky blue #7CC8F0, warm orange #FF9F43, pink #FF7AA8, brown #8A5A35, cream #FFF8E1), soft studio lighting from the top-left, gentle ambient occlusion, 2:1 dimetric isometric camera (about 30 degrees elevation, rotated 45 degrees), clean readable silhouettes, kid-friendly mobile game art. NO ground shadows, NO cast shadows, NO glow, NO halo, NO light rays, NO text, letters or numbers on any object. All glass and transparent parts must be opaque pastel material. Same camera, same lighting, same level of detail and consistent scale for all items.
```

## ЗАГОЛОВОК FLAT (іконки, портрети: прямий вигляд, не ізометрія)

```
Use the attached image as the style reference: cute stylized soft clay / toy-like 3D look, rounded chunky shapes, bright cheerful saturated colors (lemon yellow #FFD93B, fresh green #8FD16A, turquoise #2BB3A3, sky blue #7CC8F0, warm orange #FF9F43, pink #FF7AA8, brown #8A5A35, cream #FFF8E1), soft studio lighting from the top-left, FRONT VIEW, straight on, NOT isometric, no perspective, slightly glossy clay material, clean readable silhouette that stays clear when shrunk to 64 pixels, kid-friendly mobile game art. NO ground shadow, NO cast shadow, NO glow, NO halo, NO text, letters or numbers. All glass and transparent parts opaque. Same lighting and same level of detail for all items.
```

---

## Лист 05. Прилавок і обладнання (5×5, ISO)

Промпт був у чаті раніше: `docs/ART_PLAN.md`, розділ «Лист 05», імена там же.

## Лист 06. Пішоходи: ГОТОВО (картинки й анімація ходьби)

## Лист 07. Гравець, помічник, лис (5×3, ISO)

```
A character sprite sheet arranged in a strict 5-column by 3-row grid on a perfectly flat solid magenta background (#FF00FF). Each of the 15 cells contains ONE character, centered, standing on an invisible ground, with a wide empty magenta margin around it (at least 12% of the cell), no overlap, no grid lines, no labels, no numbers, no text, no watermark.

All characters are shown in a three-quarter isometric view, standing behind a market stand, FACING THE VIEWER and turned toward the RIGHT side of the image (face visible, body angled to the lower-right). Cute chibi proportions (big head, small body), simple face with dot eyes and a small smile. [ЗАГОЛОВОК ISO]

Characters: PLAYER BOY: short brown hair, light skin, blue t-shirt, yellow apron. PLAYER GIRL: brown ponytail, light skin, blue t-shirt, yellow apron. HELPER BOY: black hair, medium skin, green t-shirt, light-green apron. HELPER GIRL: short dark bob, medium skin, green t-shirt, light-green apron. FOX THIEF: cartoon fox standing upright like a person, orange fur, white chest, black bandit eye mask, sly smile, NO sack, empty hands.

Row 1: 1) player boy idle, arms relaxed, 2) player boy serving: right arm stretched forward to the right holding a paper cup of lemonade, 3) player boy squeezing lemons: both hands pushing down in front of him, focused face, 4) player boy splashed: wet shirt and hair, lemon drops, funny surprised face, 5) helper boy idle.
Row 2: 6) player girl idle, 7) player girl serving with a paper cup in the extended right hand, 8) player girl squeezing lemons with both hands pushing down, 9) player girl splashed, wet, funny surprised face, 10) helper girl idle.
Row 3: 11) helper boy serving with a paper cup, 12) helper girl serving with a paper cup, 13) fox thief walking toward the viewer, FRONT view, turned to the right, 14) the same fox thief walking away, BACK view with a big fluffy tail, turned to the right, 15) fox thief dizzy and caught: swirling spiral eyes, little stars circling above its head.
```

Імена: `char_player_boy_front, char_player_boy_serving, char_player_boy_juicing, char_player_boy_splashed, char_helper_boy_front, char_player_girl_front, char_player_girl_serving, char_player_girl_juicing, char_player_girl_splashed, char_helper_girl_front, char_helper_boy_serving, char_helper_girl_serving, char_fox_front, char_fox_back, char_fox_dizzy`

## Лист 08. Портрети: Лемі, бабуся, продавці (4×3, FLAT)

СІТКА 12 / 4×3 / 80% + FLAT +

```
Each item is a head-and-shoulders PORTRAIT bust of a character, looking at the viewer, friendly expression, no body below the chest.

Row 1 (Lemi, the lemon mascot: a plump yellow lemon with a small green leaf on top, big round eyes, tiny arms, no legs): 1) neutral friendly, 2) very happy, laughing with closed eyes, 3) thinking: one eyebrow up, hand on chin, 4) surprised: wide eyes, round open mouth.
Row 2: 5) Lemi sad: droopy eyes, small frown, 6) Grandma Olya: kind elderly woman, gray bun, round glasses, lilac cardigan, warm smile, 7) Aunt Galya: cheerful fruit seller woman, red headscarf, green apron, holding a lemon, 8) Mr. Bogdan: stocky grocer with a mustache, brown cap, blue apron, holding a water bottle.
Row 3: 9) Milana: young woman seller with a high ponytail, pink apron, holding a stack of paper cups, 10) the baker: round friendly baker with a white chef hat, flour on the cheek, holding a cookie, 11) the parents: a smiling mother and father together, 12) a happy kid customer with a lemonade cup, big smile.
```

Імена: `char_lemi_neutral, char_lemi_happy, char_lemi_think, char_lemi_surprised, char_lemi_sad, char_grandma_olya, char_vendor_galya, char_vendor_bogdan, char_vendor_milana, char_vendor_baker, char_parents, char_kid_happy`

## Лист 09. Іконки: погода й показники (5×4, FLAT)

СІТКА 20 / 5×4 / 78% + FLAT + `Each item is a single ICON object.`

```
Row 1 (weather): 1) a bright smiling sun, 2) a hot red-orange sun with a sweating funny face and heat waves, 3) a sun peeking out behind a white cloud, 4) a gray rain cloud with blue raindrops, 5) a blue-white wind swirl with leaves.
Row 2: 6) cold: a knitted striped scarf and a snowflake, 7) a stormy dark cloud with a lightning bolt, 8) a shiny gold coin with a lemon relief (no letters), 9) a small stack of three gold coins, 10) a golden five-point star.
Row 3: 11) a half-filled golden star (left half gold, right half gray), 12) an empty gray star, 13) a round clock face with a yellow rim (no numbers, only ticks), 14) a calendar page with a red top and a blank white page, 15) a green arrow pointing up (profit).
Row 4: 16) a red arrow pointing down (loss), 17) a golden crown with colorful jewels, 18) a golden trophy cup, 19) a red heart, 20) a closed padlock, gold and gray.
```

Імена: `ui_w_sunny, ui_w_hot, ui_w_cloudy, ui_w_rain, ui_w_wind, ui_w_cold, ui_w_storm, ui_coin, ui_coin_stack, ui_star_full, ui_star_half, ui_star_empty, ui_clock, ui_day, ui_profit_up, ui_profit_down, ui_crown, ui_trophy, ui_heart, ui_lock`

## Лист 10. Іконки: товари й емоції над головою (5×5, FLAT)

СІТКА 25 / 5×5 / 78% + FLAT + `Each item is a single ICON object or a round emote bubble face.`

```
Row 1 (goods): 1) a fresh whole lemon with a leaf, 2) a plastic water bottle with a water drop, 3) a sugar pot with a spoon (opaque pastel), 4) a stack of white paper cups, 5) a few ice cubes.
Row 2: 6) a chocolate chip cookie, 7) a pitcher of lemonade (opaque light-blue pitcher, yellow lemonade, lemon slice), 8) a cup of lemonade with a straw and lemon slice, 9) a wooden crate of lemons, 10) a shopping basket with a lemon.
Row 3 (emotes, each in a round soft-white bubble with a small tail pointing down): 11) a happy smiling face, 12) a face with heart eyes (love), 13) a sour face squinting with a pursed mouth, 14) an angry red face with steam, 15) a surprised face next to a gold price tag with a tiny coin (too expensive).
Row 4 (emotes): 16) an hourglass (waiting), 17) a pair of eyes looking sideways (noticed), 18) a musical note (music), 19) a thinking face with a hand on the chin, 20) a sad face with a tear (leaving unhappy).
Row 5: 21) a thumbs-up, 22) an exclamation mark in a red circle, 23) a green check mark in a circle, 24) a red cross in a circle, 25) a question mark in a blue circle.
```

Імена: `ui_gd_lemon, ui_gd_water, ui_gd_sugar, ui_gd_cups, ui_gd_ice, ui_gd_cookie, ui_gd_pitcher, ui_gd_cup, ui_gd_crate, ui_act_market, ui_em_happy, ui_em_love, ui_em_sour, ui_em_angry, ui_em_money, ui_em_wait, ui_em_look, ui_em_music, ui_em_think, ui_em_sad, ui_thumbs_up, ui_alert, ui_ok, ui_cancel, ui_help`

## Лист 11. Іконки апгрейдів (5×5, FLAT)

СІТКА 25 / 5×5 / 78% + FLAT + `Each item is a single ICON object.`

```
Row 1: 1) a small chalkboard sign on a stand (blank), 2) a loyalty card with a star stamp (blank), 3) a yellow banner on two poles (blank), 4) a loudspeaker with sound waves, 5) a stack of yellow paper cups with a lemon drawing.
Row 2: 6) a person in a funny lemon costume (mascot), 7) a striped sun umbrella (yellow-white), 8) a small delivery van, white with a yellow stripe, 9) a drink dispenser with a tap (opaque), 10) an orange bicycle with a basket.
Row 3: 11) a pop-up canopy tent, striped, 12) an orange kick scooter, 13) a retro television with a cartoon star on the screen, 14) two market tables side by side (big stand), 15) a cute yellow food truck with a window and an awning.
Row 4: 16) a hand citrus squeezer with a lemon half, 17) a blue cooler bag, 18) a modern white hand mixer, 19) a lever juicer machine, 20) a padlock with a coin.
Row 5: 21) a red toolbox with tools, 22) a stack of flyers, 23) a friendly helper worker with a green apron, waist-up, 24) a small market kiosk with a striped awning, 25) a brown wooden storeroom door with a lock.
```

Імена: `ui_up_sign, ui_up_loyalty, ui_up_banner, ui_up_speaker, ui_up_branded_cups, ui_up_mascot, ui_up_umbrella, ui_up_delivery, ui_up_dispenser, ui_up_bike, ui_up_tent, ui_up_scooter, ui_up_tv, ui_up_big_stand, ui_up_truck, ui_up_juicer_hand, ui_up_cooler, ui_up_mixer, ui_up_juicer_lever, ui_up_cash_lock, ui_up_toolkit, ui_up_flyers, ui_up_helper, ui_up_kiosk, ui_up_storeroom`

## Лист 12. Іконки локацій і кнопок (5×4, FLAT)

СІТКА 20 / 5×4 / 78% + FLAT + `Each item is a single ICON object.`

```
Row 1 (places): 1) a cozy cottage with a red roof, 2) a round green tree with a bench, 3) a school building with a clock tower, 4) a beach: a palm tree and a red-white umbrella on sand, 5) a railway station: a small yellow train.
Row 2: 6) a shopping mall: a building with a big orange circle on the front, 7) a market stall with fruit, 8) a kitchen: a cooking pot with a lemon, 9) a shopping bag, 10) a crescent moon with a small star (sleep).
Row 3: 11) a settings gear, 12) an open book (glossary), 13) a flag on a hill (road map), 14) a newspaper (blank lines), 15) a small stand with a tag, a flag and a coin (my stands).
Row 4: 16) a megaphone, 17) a calculator (blank keys), 18) a coin bag with a gold coin, 19) a map with a red pin, 20) a gift box with a ribbon.
```

Імена: `ui_loc_yard, ui_loc_park, ui_loc_school, ui_loc_beach, ui_loc_station, ui_loc_mall, ui_act_market2, ui_act_kitchen, ui_act_shop, ui_act_sleep, ui_btn_settings, ui_btn_glossary, ui_btn_roadmap, ui_btn_news, ui_btn_points, ui_btn_megaphone, ui_btn_calc, ui_btn_coinbag, ui_btn_map, ui_btn_gift`

## Лист 13. Машини в обидва боки (4×2, ISO)

СІТКА 8 / 4×2 / 75% + ISO +

```
Each vehicle is a cute toy-like small car with chunky rounded shapes. Row 1: cars driving toward the LOWER-RIGHT (we see the front and the left side). Row 2: the same cars driving toward the UPPER-LEFT (we see the back and the right side), identical colors and shapes to the car above.

Row 1: 1) a small yellow car, 2) a small red car, 3) a small green car, 4) a white delivery van with a yellow stripe.
Row 2 (exactly the same vehicles from behind): 5) the yellow car, 6) the red car, 7) the green car, 8) the white delivery van.
```

Імена: `prop_car_a_front, prop_car_b_front, prop_car_c_front, prop_van_front, prop_car_a_back, prop_car_b_back, prop_car_c_back, prop_van_back`

## Лист 14. Тварини й знахідки (4×3, ISO)

СІТКА 12 / 4×3 / 75% + ISO +

```
Animals are chibi toy-like, three-quarter isometric view.

Row 1: 1) a ginger cat with a blue collar walking toward the viewer, turned to the right (FRONT), 2) the same cat walking away (BACK), turned to the right, 3) a scruffy brown stray dog walking toward the viewer, turned to the right (FRONT), 4) the same dog from behind (BACK).
Row 2: 5) a second stray dog, black and white, FRONT view, turned to the right, 6) the same black-and-white dog BACK view, 7) a lost brown leather wallet lying flat, 8) a single red balloon on a string floating.
Row 3: 9) a shiny gold coin lying on the ground, 10) a boy running fast in a sports shirt, arms swinging, FRONT view turned to the right, 11) a seagull standing, 12) a street sign post with a blank paper poster (lost cat notice, no text).
```

Імена: `char_cat_front, char_cat_back, char_dog_a_front, char_dog_a_back, char_dog_b_front, char_dog_b_back, item_wallet, item_balloon, item_coin_ground, char_runner_front, char_seagull, prop_notice_post`

## Лист 15. Емблема гри (одна велика картинка)

```
A single large 3D render of the game emblem, centered on a perfectly flat solid magenta background (#FF00FF), square canvas 2048x2048, the emblem filling about 70% of the canvas, wide empty margin on all sides, nothing cut off. A golden crown with colorful round jewels sitting on top of a big plump yellow lemon with a green leaf, the lemon has a friendly smile and big round eyes, tiny arms. Cute stylized soft clay / toy-like look, rounded chunky shapes, bright cheerful saturated colors, soft studio lighting from the top-left, FRONT VIEW, slightly glossy clay material, very high detail, crisp edges. NO text, NO letters, NO ground shadow, NO glow, NO halo.
```

## Великі суцільні текстури землі (4 окремі картинки 2048×2048)

```
A large flat top-down texture of [МАТЕРІАЛ], filling the entire square canvas edge to edge, 2048x2048, strictly orthographic straight-from-above view, NO perspective, NO horizon, NO shadows, NO objects, NO borders, even flat lighting without gradients or vignette, uniform overall brightness and color across the whole image (no large dark or bright patches), small soft detail evenly spread everywhere. Cute stylized soft clay / toy-like look, bright cheerful saturated colors, matching the attached style reference.
```

Матеріали: `fresh light-green grass with tiny soft tufts and a few small white and yellow flowers` · `warm yellow beach sand with soft ripples and a few tiny shells` · `turquoise water with soft light-blue wavy lines` · `dark gray asphalt with fine soft grain`.

## Анімації: як замовляти ще

Для кожного листа з людьми/тваринами, пари «спереду + ззаду», можна замовити відео ходьби тим самим способом, що й для пішоходів (сітка з клітинок, фігури крокують на місці, лист на магентовому фоні, цикл мінімум 1 с). Далі `tools/walk_analyze.py` та `tools/make_walk.py`.
