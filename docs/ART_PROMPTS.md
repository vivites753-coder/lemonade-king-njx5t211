# Промпти для решти графіки

До кожного запиту додавай референс стилю: `art/style-test/sheet_01.jpg`.
Для кожного листа промпт складається так: **СІТКА** (з числами) + **ЗАГОЛОВОК СТИЛЮ** (ISO або FLAT) + **СПИСОК**.

Негативний для всіх: `shadow, ground, text, letters, numbers, watermark, glow, halo, realistic, scary, transparent glass`.

## Що ще потрібно згенерувати (перевірено 15.10, від важливішого)

Перевірено по коду: що гра просить, але малює сама (кодом, CSS або емодзі).

1. ~~Лист 15. Емблема гри~~ — готово (логотип і значок додатка).
2. ~~Лист 08а. Лемі: 5 емоцій~~ — готово (`ui_lemi_<настрій>`: підказки, картки подій, урок дня).
   Решта портретів листа 08 — пізніше, за бажанням.
3. ~~Лист 18, скорочений: `kt_jug` і `kt_bowl`~~ — готово (лимонад набирає форму глечика).
4. ~~Лист 14, оновлений: тварини й знахідки~~ — готово (кіт, 3 собаки, гаманець, монетка, м'яч, 4 кульки).
5. ~~Лист 12в: іконки місць, склад, морозилка, реклама~~ — готово. Лишився порожній банер прилавка `stand_banner`
   (напис гра пише сама): окремо, пізніше.
6. ~~Лист 23: автобусна зупинка~~ — готово (автобус, навіс, знак).
7. ~~Лист 24: лід для кухні~~ — готово.
8. **Свій магазин (рівень 4, етап A):** ~~лист 25 (стіни)~~ — готово; лишились 26 (прилавок), 28 (столики й стільці
   окремо), 29 (покупці сидять), 27 (ратуша), 12г (іконки місць і апгрейдів магазину). Поки їх немає, гра малює все
   це кодом. Низькі передні стіни й скляні двері гра малює сама: для них картинок не треба.
9. За бажанням: пози «наливає» з листа 07 (4 шт.), текстури землі, банер 1024×500 для Google Play
   (знімки екрана для Play зроблю з гри сам).

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

## Лист 08а. Лемі: 5 емоцій (5×1, FLAT) — ГОТОВО

Прикріпіть емблему (`art/sheets/emblem.jpg`), щоб Лемі був тим самим лимоном.

```
A sprite sheet of 5 cute game assets arranged in a strict 5-column by 1-row grid on a perfectly flat solid magenta background (#FF00FF). Every item sits alone in its own grid cell, centered, filling about 78% of the cell, with a wide empty magenta margin around it (at least 12% of the cell on every side), no item touching or overlapping another or the cell edge, no grid lines, no labels, no numbers, no watermark.

Use the attached image as the character and style reference: cute stylized soft clay / toy-like 3D look, rounded chunky shapes, bright cheerful saturated colors, soft studio lighting from the top-left, FRONT VIEW, straight on, slightly glossy clay material, clean readable silhouette that stays clear when shrunk to 64 pixels. NO ground shadow, NO cast shadow, NO glow, NO halo, NO text, letters or numbers.

Each item is Lemi, the lemon mascot of the game: exactly the same character as in the attached image (plump yellow lemon, small green leaf on top, big round black eyes with a white shine, small mouth, tiny arms), but WITHOUT the crown, shown from the head down to the bottom of the lemon.
1) neutral: a friendly small smile, 2) happy: laughing with closed happy eyes, arms up, 3) thinking: one eyebrow up, a tiny hand on the chin, 4) surprised: wide eyes, small round open mouth, 5) sad: droopy eyes, a small frown.
```

Імена: `char_lemi_neutral, char_lemi_happy, char_lemi_think, char_lemi_surprised, char_lemi_sad`

## Лист 09. Іконки: погода й показники (5×4, FLAT)

СІТКА 20 / 5×4 / 78% + FLAT + `Each item is a single ICON object.`

```
Row 1 (weather): 1) a bright smiling sun, 2) a hot red-orange sun with a sweating funny face and heat waves, 3) a sun peeking out behind a white cloud, 4) a gray rain cloud with blue raindrops, 5) a blue-white wind swirl with leaves.
Row 2: 6) cold: a knitted striped scarf and a snowflake, 7) a stormy dark cloud with a lightning bolt, 8) a shiny gold coin with a lemon relief (no letters), 9) a small stack of three gold coins, 10) a golden five-point star.
Row 3: 11) a half-filled golden star (left half gold, right half gray), 12) an empty gray star, 13) a round clock face with a yellow rim (no numbers, only ticks), 14) a calendar page with a red top and a blank white page, 15) a green arrow pointing up (profit).
Row 4: 16) a red arrow pointing down (loss), 17) a golden crown with colorful jewels, 18) a golden trophy cup, 19) a red heart, 20) a closed padlock, gold and gray.
```

Імена: `ui_w_sunny, ui_w_hot, ui_w_cloudy, ui_w_rain, ui_w_wind, ui_w_cold, ui_w_storm, ui_coin, ui_coin_stack, ui_star_full, ui_star_half, ui_star_empty, ui_clock, ui_day, ui_profit_up, ui_profit_down, ui_crown, ui_trophy, ui_heart, ui_lock`

## Лист 10. Склад і емоції покупців (5×5, FLAT) — ГОТОВО

Склад ліворуч у грі показує: лимони, воду, цукор, стаканчики, печиво, готові склянки, охолоджені, «скільки глечиків можна зробити». Над головою покупця гра показує свою білу бульбашку, всередині неї картинку, тому емоції треба БЕЗ бульбашки, просто обличчя або символ.

СІТКА 25 / 5×5 / 78% + FLAT +

```
Each item is a single ICON object (no background bubble, no frame), readable when shrunk to 48 pixels.
Row 1 (stock): 1) a fresh whole yellow lemon with a green leaf, 2) a big glossy blue water drop, 3) a small pile of white sugar cubes with one cube on top, 4) a stack of three white paper cups, 5) a round chocolate chip cookie.
Row 2 (stock): 6) a tall glass of yellow lemonade with a straw and a lemon slice on the rim, 7) three light-blue ice cubes, 8) a pitcher of lemonade (opaque light-blue pitcher with a handle, yellow lemonade, a lemon slice), 9) a small shopping cart with a lemon in it, 10) a lemon cut in half showing the juicy inside.
Row 3 (customer faces, round yellow cartoon faces): 11) heart eyes and a big smile (in love with the lemonade), 12) a happy smiling face, 13) a neutral face with a flat mouth, 14) a sour face: squinting eyes, pursed mouth, a drop of sweat (too sour), 15) a dizzy face with spiral eyes and a wobbly mouth (too sweet).
Row 4: 16) an angry red face with steam from the ears, 17) a sad face with a big blue tear, 18) a shocked face with wide eyes and a gold coin with little wings flying away (too expensive), 19) a sand hourglass (waiting, the queue is full), 20) a wrapped gift box with a bow (a free cup).
Row 5: 21) a red exclamation mark, 22) a speech bubble with three dots, 23) a sick face with a thermometer in the mouth and a green tint, 24) a round alarm clock with two bells, 25) a glass of lemonade with a straw inside a small thought cloud (wants lemonade).
```

Імена: `ui_gd_lemon, ui_gd_water, ui_gd_sugar, ui_gd_cups, ui_gd_cookie, ui_gd_ready, ui_gd_ice, ui_gd_pitcher, ui_gd_market, ui_gd_lemon_half, ui_em_love, ui_em_happy, ui_em_meh, ui_em_sour, ui_em_dizzy, ui_em_angry, ui_em_sad, ui_em_money, ui_em_wait, ui_em_gift, ui_em_alert, ui_em_chat, ui_em_sick, ui_em_clock, ui_em_want`

## Лист 16. Мережа точок і опт (4×3, FLAT) — ГОТОВО

Іконки для «Моїх точок», картки точки, перемикача точок і оптового складу на ринку (зараз там емодзі 📦 🏪 👀 🛠️ 💹 👥).

СІТКА 12 / 4×3 / 78% + FLAT +

```
Each item is a single ICON object (no background, no frame), readable when shrunk to 48 pixels.
Row 1 (wholesale packs): 1) a wooden crate full of yellow lemons with green leaves, 2) a pack of six blue water bottles wrapped together in clear film with a carrying handle, 3) a big paper sack of white sugar with the top folded open and a wooden scoop, 4) a big cardboard box with a stack of white paper cups sticking out of the top.
Row 2 (my stands): 5) a small lemonade kiosk front with a yellow-and-white striped awning and a lemon on the counter, 6) a pair of round green binoculars, 7) a crossed wrench and screwdriver with a small yellow star, 8) a gold coin in front of a small green bar chart going up, with a green tick mark.
Row 3: 9) two cheerful little workers side by side, a girl and a boy in yellow aprons, waving, 10) one little worker in a yellow apron with a big green plus sign beside them, 11) a small warehouse building with a big roller door and stacked boxes in front, 12) a wooden door sign on a string that hangs crooked, plain, with a small red X on it (closed).
```

Імена: `ui_gd_lemon_bulk, ui_gd_water_bulk, ui_gd_sugar_bulk, ui_gd_cups_bulk, ui_pt_stand, ui_pt_look, ui_pt_upgrades, ui_pt_payback, ui_pt_team, ui_pt_hire, ui_pt_wholesale, ui_pt_closed`

## Лист 11. Іконки апгрейдів, яких ще немає (4×1, ISO) — ГОТОВО

Іконку вагончика тепер зроблено з картинки гри (`tools/make_icons.py`), лишилися ці чотири (великий прилавок — гарніший за складений зі столів).

СІТКА 4 / 4×1 / 75% + ISO +

```
Each item is one object of the game shop, a cute toy-like 3D object seen from the same isometric camera as the other game objects.
1) a loyalty card: a cream paper card with ten small circles for stamps, six of them filled with little yellow lemon stamps, a tiny gift box drawn in the last circle, no letters; 2) a long yellow cloth banner with an orange border, hanging between two short wooden poles, a big friendly lemon drawn in the middle, no letters; 3) a delivery order: a cardboard box full of lemons with two water bottles and a small paper sugar bag sticking out, and a small blue clipboard with a green check mark leaning against it, no letters; 4) a big market stand: two tables side by side, the left one with a blue-and-white striped cloth, the right one with a yellow-and-white striped cloth, a pitcher of lemonade and paper cups on each table, no people.
```

Імена: `ui_up_loyalty, ui_up_banner, ui_up_delivery, ui_up_big_stand` (кладуться в `assets/ui/`).

## Лист 12. Іконки локацій і кнопок (5×4, FLAT)

СІТКА 20 / 5×4 / 78% + FLAT + `Each item is a single ICON object.`

```
Row 1 (places): 1) a cozy cottage with a red roof, 2) a round green tree with a bench, 3) a school building with a clock tower, 4) a beach: a palm tree and a red-white umbrella on sand, 5) a railway station: a small yellow train.
Row 2: 6) a shopping mall: a building with a big orange circle on the front, 7) a market stall with fruit, 8) a kitchen: a cooking pot with a lemon, 9) a shopping bag, 10) a crescent moon with a small star (sleep).
Row 3: 11) a settings gear, 12) an open book (glossary), 13) a flag on a hill (road map), 14) a newspaper (blank lines), 15) a small stand with a tag, a flag and a coin (my stands).
Row 4: 16) a megaphone, 17) a calculator (blank keys), 18) a coin bag with a gold coin, 19) a map with a red pin, 20) a gift box with a ribbon.
```

Імена: `ui_loc_yard, ui_loc_park, ui_loc_school, ui_loc_beach, ui_loc_station, ui_loc_mall, ui_act_market2, ui_act_kitchen, ui_act_shop, ui_act_sleep, ui_btn_settings, ui_btn_glossary, ui_btn_roadmap, ui_btn_news, ui_btn_points, ui_btn_megaphone, ui_btn_calc, ui_btn_coinbag, ui_btn_map, ui_btn_gift`

## Лист 12б. Кнопки верхньої панелі й керування (5×2, FLAT) — ГОТОВО

Кнопки праворуч угорі (підказка Лемі, словник, звук, налаштування), кнопки швидкості, «Закінчити день». Гра вже чекає ці файли: щойно вони з'являться в `assets/ui/`, емодзі на кнопках замінюються самі.

СІТКА 10 / 5×2 / 78% + FLAT +

```
Each item is a single ICON object (no background, no frame, no button shape behind it), readable when shrunk to 40 pixels.
Row 1: 1) a cute yellow lemon with a tiny green leaf and a small glowing yellow light bulb above it (a hint), 2) an open book with blank cream pages and a red bookmark ribbon (a dictionary), 3) a blue loudspeaker with three curved sound waves (sound on), 4) the same blue loudspeaker with a small red X instead of the waves (sound off), 5) a round grey-blue settings gear with a yellow center.
Row 2: 6) a pause sign: two thick rounded vertical bars, deep blue, 7) a play sign: one thick rounded triangle pointing right, deep blue, 8) a fast forward sign: two thick rounded triangles pointing right, deep blue, 9) a faster sign: three thick rounded triangles pointing right, deep blue, 10) a yellow crescent moon with two small stars (end the day, go to sleep).
```

Імена: `ui_btn_tip, ui_btn_glossary, ui_btn_sound_on, ui_btn_sound_off, ui_btn_settings, ui_btn_pause, ui_btn_play, ui_btn_fast, ui_btn_faster, ui_btn_sleep`

## Лист 13. Машини в обидва боки (5×2, ISO)

СІТКА 10 / 5×2 / 75% + ISO + список нижче. Дорога в грі йде по діагоналі 2:1: машина, що їде вниз-праворуч, повернута до нас передом і ПРАВИМ боком; машина, що їде вгору-ліворуч, повернута задом і ЛІВИМ боком. Обидва рядки потрібні, бо дзеркало переставило б кермо й написи.

```
Each vehicle is a cute toy-like small car with chunky rounded shapes, big round wheels, simple windows with a soft sky reflection, no people inside, no text or numbers on plates. All vehicles are drawn at the same scale, their long axis along the same 2:1 isometric diagonal.
Row 1: vehicles driving toward the LOWER-RIGHT corner of the image (we see the FRONT with both headlights and the RIGHT side): 1) a small yellow hatchback, 2) a small red round car, 3) a small mint-green car, 4) a small sky-blue car, 5) a white delivery van with a yellow stripe.
Row 2: exactly the same five vehicles, same colors and shapes, in the same order, driving toward the UPPER-LEFT corner (we see the BACK with both tail lights and the LEFT side): 6) the yellow hatchback, 7) the red car, 8) the green car, 9) the blue car, 10) the white van.
```

Імена: `prop_car_a_front, prop_car_b_front, prop_car_c_front, prop_car_d_front, prop_van_front, prop_car_a_back, prop_car_b_back, prop_car_c_back, prop_car_d_back, prop_van_back`

## Лист 12в. Іконки місць і нових речей (5×2, FLAT) — ГОТОВО

Іконки місць стоять на картках ранку замість емодзі, кнопка складу зліва, дві нові іконки для магазину й вікна підготовки.

СІТКА 10 / 5×2 / 78% + FLAT +

```
Each item is a single ICON object (no background, no frame, no button shape behind it), readable when shrunk to 48 pixels.
Row 1 (places): 1) a cozy cottage with a red roof, 2) a round green tree with a small bench, 3) a school building with a little clock tower, 4) a palm tree and a red-white beach umbrella on a patch of sand, 5) a small yellow train in front of a station roof.
Row 2: 6) a shopping mall: a building with a big orange circle on the front, 7) a bus stop: a small green city bus next to a blue round bus sign, 8) a wooden crate of lemons with a water bottle and a paper sugar bag (the stock), 9) a small white chest freezer with a blue snowflake on the lid (a freezer), 10) a smartphone with a small megaphone and a heart bubble (ads on the internet).
```

Імена: `ui_loc_yard, ui_loc_park, ui_loc_school, ui_loc_beach, ui_loc_station, ui_loc_mall, ui_loc_busstop, ui_btn_stock, ui_up_freezer, ui_btn_onlineads`

## Лист 25. Стіни свого магазину (одна картинка 1536×1024, за шаблоном) — ГОТОВО

Магазин тепер показаний у розрізі, як ляльковий будиночок: підлога, дві задні стіни, а перед відкритим боком вулиця.
Стіни малюються **рівно, як фасад** (не в ізометрії), як для вокзалу й торгового центру: гра сама «загне» їх.
Обов'язково прикріпіть до запиту шаблон `docs/art/wall_store_layout.png` (вікна, табличка з назвою, годинник і дошка
меню стоять там на своїх місцях; ліва частина верхньої смуги пурпурна, бо ця стіна коротка). Назву «ЛИМОНАДНА»,
стрілки годинника й ціни в меню гра пише сама.

```
Flat front view (elevation, NOT isometric, no perspective) of the two inner walls of a cozy cartoon lemonade café, for a kids' mobile game. Same style as the game: soft 3D clay-like cartoon look, warm light, rounded shapes, clean simple details, no people.

Follow the attached layout image EXACTLY: the same 1536x1024 canvas, the same positions and sizes of every shape.
- Everything outside the grey areas stays pure flat magenta #FF00FF (also the whole left part of the top strip: that wall is short).
- The top grey area is the short side wall of the café, the bottom strip is its long back wall. Paint each grey area as a wall, filling it edge to edge.
- Magenta shapes INSIDE the grey areas are see-through windows. Keep them pure flat #FF00FF with crisp edges, paint nothing inside them; give them white wooden frames with a small sill.
- Yellow rectangle: an empty name board in a decorative orange frame, cream colour inside, NO letters.
- White circle: a round wall clock face with hour dots but NO hands.
- Dark rectangle: an empty dark green chalkboard (a menu board) in a wooden frame, NO writing.
The walls: warm cream plaster on top, a turquoise wooden wainscot on the lower third with a white rail, a wooden baseboard. On the back wall, under the name board, two wooden shelves with glass jars of yellow lemonade and fresh lemons. A string of small round colourful lights along the top of both walls, a small framed picture of a lemon on the short wall. No text or letters anywhere. Even front light, no floor, no ceiling, no perspective lines.
```

Ім'я: `wall_store` (встановлено: `python tools/make_walls.py art/sheets/walls_store.jpg store 224`; генератор
лишив сіру рамку шаблону й змінив розмір полотна, тому стіни вирізаються з рамки, а коротка стіна стає на u 224–384).
Табличку, годинник і дошку меню на картинці гра знаходить за `WALL_ART` у `src/render/proc/store.ts` (виміряно на
картинці). Підлогу магазину (дерев'яні дошки)
можна згенерувати окремо як велику текстуру: `warm honey-colored wooden floor planks with soft grain` (див. «Великі
суцільні текстури»), ім'я `tile_store_floor`.

## Лист 26. Прилавок магазину (одна картинка, ISO)

Довгий прилавок усередині магазину, замість столика. На ньому гра сама ставить глечики, стаканчики й касу, тож верх пустий.

```
A single 3D render of ONE long shop counter for a lemonade shop, centered on a perfectly flat solid magenta background (#FF00FF), canvas 2048x1024, the counter filling about 80% of the width, wide empty magenta margin on all sides, nothing cut off.
Use the attached image as the exact style reference: isometric 3D render, cute stylized soft clay / toy-like look, rounded chunky shapes, bright cheerful saturated colors (lemon yellow #FFD93B, fresh green #8FD16A, turquoise #2BB3A3, sky blue #7CC8F0, warm orange #FF9F43, pink #FF7AA8, brown #8A5A35, cream #FFF8E1), soft studio lighting from the top-left, gentle ambient occlusion, 2:1 dimetric isometric camera (about 30 degrees elevation, rotated 45 degrees), clean readable silhouette, kid-friendly mobile game art.
The counter is a long low box, waist-high, about three times longer than deep. Its LONG front side faces the LOWER-LEFT of the image, its short end faces the lower-right. The top is a flat cream stone counter top, completely EMPTY (nothing on it). The front: on the left third a glass display case with lemons and small cakes inside, the rest warm wood panels, a turquoise trim along the top edge and along the bottom.
NO people, NO objects on the top, NO ground shadow, NO text, letters or numbers.
```

Ім'я: `stand_store_counter`.

## Лист 28. Столики й стільці магазину (2×2, ISO)

Столики для покупців і стільці — **окремі** картинки: на стільці сідають покупці (гра садить людину між стільцем і
столиком). Стілець 3 стоїть ліворуч від столика (спинка вгорі зліва, хто сидить, дивиться на нас), стілець 4 —
праворуч (спинка внизу справа, людину видно зі спини). Буфета біля задньої стіни більше немає: там тепер прилавок.

СІТКА 4 / 2×2 / 72% + ISO +

```
Each item is one piece of furniture of a cozy lemonade café, a cute toy-like 3D object with chunky rounded shapes, no text, letters or numbers anywhere. All at the same scale and the same camera.
Row 1: 1) a small round café table WITHOUT chairs: a white round top on one dark grey leg with a round foot; on it a small vase with a pink flower and a tall cup of yellow lemonade; 2) exactly the same table WITHOUT chairs, with a small plate with a slice of lemon cake and a cup on it instead.
Row 2: 3) one turquoise wooden café chair with four thin dark legs, its backrest on the UPPER-LEFT side, so the empty seat faces the LOWER-RIGHT; 4) exactly the same chair turned around: its backrest on the LOWER-RIGHT side, the seat faces the UPPER-LEFT.
```

Імена: `prop_cafe_table, prop_cafe_table_b, prop_cafe_chair_l, prop_cafe_chair_r`

## Лист 29. Покупці сидять за столиком (3×4 пари, ISO)

Ті самі 12 людей, що й на листі 06 (пішоходи), у тому самому порядку, але сидять із лимонадом у руках. Кожна клітинка —
пара: ліворуч вигляд спереду (так людина сидить на лівому стільці, обличчям до нас), праворуч ззаду (на правому стільці).
Обидва вигляди повернуті праворуч, як у пішоходів: гра сама дзеркалить того, хто сидить спиною. Стільця на картинці
немає: гра садить людину на свій стілець, а ноги частково ховає столик. Прикріпіть дві картинки: спершу лист людей
`art/sheets/sheet_people.jpg` (хто є хто), потім референс стилю `art/style-test/sheet_01.jpg`. До негативного промпта
додайте `chair, stool, bench, table, furniture`.

```
A character sprite sheet arranged in a strict 3-column by 4-row grid on a perfectly flat solid magenta background (#FF00FF). Each of the 12 cells holds ONE character shown twice side by side: on the left a FRONT view, on the right a BACK view, with a clear magenta gap between the two and a wide empty magenta margin around the cell (at least 12% of the cell), no overlap, no grid lines, no labels, no numbers, no text, no watermark.

The 12 characters are EXACTLY the same people as in the first attached image, in the same order, with the same faces, hair, skin, clothes, colours and accessories, the same chibi proportions and the same size. Row 1: a boy with a red backpack, a girl in a pink dress with two pigtails, a boy in a green cap and a green hoodie. Row 2: a man in a grey jacket, a woman with long brown hair in a red coat, a bearded man in a mustard sweater with a briefcase. Row 3: a granny with glasses and a cane in a lilac cardigan, a granny with white curly hair in a blue coat and a pink scarf, a sporty man with a red headband in an orange tank top. Row 4: a sporty woman with a dark ponytail in a turquoise top and black leggings, a tourist man in a straw hat and a flowery shirt with a camera, a tourist woman in a wide sun hat and a yellow dress.

Now every character is SITTING on an INVISIBLE chair: NO chair, NO stool, NO bench, NO table, NO furniture at all is drawn. The hips are at knee height, the thighs horizontal, the lower legs hanging down (the kids' feet dangle). Each one holds a paper cup of yellow lemonade with a straw in both hands in front of the chest, relaxed and happy; bags, the briefcase and the cane rest against the legs.
FRONT view (the left figure of each pair): three-quarter isometric view, FACING THE VIEWER and turned toward the RIGHT side of the image, the knees pointing to the lower-right, the face visible.
BACK view (the right figure of each pair): the same sitting pose seen from BEHIND, turned toward the RIGHT: the back of the head and the back visible, the knees pointing to the upper-right, the cup hidden in front of the body.

Use the second attached image as the exact style reference: isometric 3D render, cute stylized soft clay / toy-like look, rounded chunky shapes, bright cheerful saturated colors (lemon yellow #FFD93B, fresh green #8FD16A, turquoise #2BB3A3, sky blue #7CC8F0, warm orange #FF9F43, pink #FF7AA8, brown #8A5A35, cream #FFF8E1), soft studio lighting from the top-left, gentle ambient occlusion, 2:1 dimetric isometric camera (about 30 degrees elevation, rotated 45 degrees), clean readable silhouettes, kid-friendly mobile game art. NO ground shadows, NO cast shadows, NO glow, NO halo, NO light rays, NO text, letters or numbers on any object. Same camera, same lighting, same level of detail and consistent scale for all characters.
```

Імена (наріжу з `--pairs`): `char_<ім'я>_sit_front, char_<ім'я>_sit_back` для `kid_a, kid_b, kid_c, adult_a, adult_b,
adult_c, granny_a, granny_b, sport_a, sport_b, tourist_a, tourist_b`. Поки їх немає, гра садить людину, опустивши й
обрізавши її звичайну картинку.

## Лист 27. Ратуша (одна велика картинка, ISO)

```
A single large 3D render of ONE small town hall building, centered on a perfectly flat solid magenta background (#FF00FF), square canvas 2048x2048, the building filling about 75% of the width, wide empty magenta margin on all sides, nothing cut off.
Use the attached image as the exact style reference: isometric 3D render, cute stylized soft clay / toy-like look, rounded chunky shapes, bright cheerful saturated colors (lemon yellow #FFD93B, fresh green #8FD16A, turquoise #2BB3A3, sky blue #7CC8F0, warm orange #FF9F43, pink #FF7AA8, brown #8A5A35, cream #FFF8E1), soft studio lighting from the top-left, gentle ambient occlusion, 2:1 dimetric isometric camera (about 30 degrees elevation, rotated 45 degrees), clean readable silhouette, kid-friendly mobile game art.
The town hall: two storeys of light warm stone, its front faces the LOWER-LEFT of the image. Four white columns at the entrance, a big wooden double door with three steps, tall arched windows on both floors, a triangular pediment above the columns, an EMPTY plaque above the door. In the middle of the roof a small square clock tower with a round white clock face (only dots for the hours, no numbers) and a pointed turquoise roof with a small blue flag on top.
NO ground plate, NO ground shadow, NO people, NO text, letters or numbers anywhere.
```

Ім'я: `bld_townhall`.

## Лист 12г. Іконки магазину й його апгрейдів (5×2, FLAT)

СІТКА 10 / 5×2 / 78% + FLAT +

```
Each item is a single ICON object (no background, no frame, no button shape behind it), readable when shrunk to 48 pixels.
Row 1: 1) a town hall building with white columns and a small clock tower, 2) a small shop with a yellow-white striped awning next to a round green tree, 3) a shop front with a striped awning and a big lemon on its signboard, 4) a paper receipt with a big percent sign on it (a tax), 5) a yellow light bulb with a blue water drop next to it (electricity and water bills).
Row 2: 6) a simple balance scale with a gold coin on one pan and a cup of lemonade on the other, 7) a small round café table with two turquoise chairs, 8) a white wall air conditioner with three light blue curved wind lines, 9) a dark rounded sign with a pink neon border and a small lemon on it, no letters, 10) a small card payment terminal with a bank card sticking out of its top.
```

Імена: `ui_loc_townhall, ui_loc_parkside, ui_store, ui_tax, ui_utilities, ui_breakeven, ui_up_store_tables,
ui_up_store_ac, ui_up_store_neon, ui_up_store_terminal`

## Лист 23. Автобусна зупинка (2×2, ISO) — ГОТОВО

Автобус їде по діагоналі 2:1, як машини з листа 13: той, що їде вниз-праворуч, повернутий до нас передом і ПРАВИМ боком, той, що їде вгору-ліворуч, задом і ЛІВИМ боком. Двері в нього на правому боці (боці від нас), тому з цього боку їх не видно.

СІТКА 4 / 2×2 / 75% + ISO +

```
Each item is one object of a city bus stop, a cute toy-like 3D object with chunky rounded shapes, no text, letters or numbers anywhere. All at the same scale.
1) a small chubby city bus in green with a white stripe along the side, big round wheels and a row of windows with a soft sky reflection, driving toward the LOWER-RIGHT corner of the image (we see the FRONT with both headlights and the RIGHT side), no people inside; 2) exactly the same bus, same color and shape, driving toward the UPPER-LEFT corner (we see the BACK with both tail lights and the LEFT side); 3) a bus shelter: a green flat roof on four thin dark posts, the back wall and one side wall made of opaque pale-blue frosted plastic panels, a wooden bench inside and an empty poster frame on the back wall, open to the front; 4) a bus stop sign: a thin grey pole with a round blue sign with a white bus silhouette.
```

Імена: `prop_bus_front, prop_bus_back, prop_bus_shelter, prop_bus_sign` (розмір і точку прив'язки підберу в `spriteMeta.ts`, коли побачу картинки; для кількох кольорів автобуса зробимо ще один лист)

## Лист 24. Лід для кухні (2×1, FLAT) — ГОТОВО

СІТКА 2 / 2×1 / 78% + FLAT +

```
Each item is a single object, front view slightly from above, no background shape behind it.
1) a light-blue plastic ice cube tray holding six clear, slightly bluish ice cubes with soft white highlights; 2) a single big clear ice cube with a white highlight on one corner.
```

Імена: `kt_ice_tray, kt_ice` (кладуться в `assets/kitchen/`)

## Лист 14. Тварини й знахідки (4×3, ISO), оновлений — ГОТОВО

У грі вони бігають уздовж вулиці, тому досить одного вигляду: три чверті, обличчям праворуч (у другий бік гра
дзеркалить). Собак три, бо гра пускає зграйку з трьох різних. Кульки чотирьох кольорів, як зараз у грі.

СІТКА 12 / 4×3 / 75% + ISO +

```
Animals are chibi toy-like, small and round, three-quarter isometric view, all facing to the RIGHT (toward the lower right of the image).

Row 1: 1) a ginger cat with a blue collar walking, three-quarter view facing right; 2) the same ginger cat sitting and looking up, three-quarter view facing right; 3) a scruffy brown stray dog running, three-quarter view facing right, tongue out; 4) a sandy golden stray dog running, three-quarter view facing right.
Row 2: 5) a gray stray dog with a white chest running, three-quarter view facing right; 6) a brown leather wallet lying flat on the ground, slightly open, one coin peeking out; 7) a single shiny gold coin lying flat on the ground; 8) a classic black-and-white football (soccer ball).
Row 3: 9) a red party balloon on a thin white string; 10) the same balloon in sky blue; 11) the same balloon in purple; 12) the same balloon in light green.
```

Імена: `char_cat_walk, char_cat_sit, char_dog_brown, char_dog_sand, char_dog_gray, item_wallet, item_coin_ground, item_ball, item_balloon_red, item_balloon_blue, item_balloon_purple, item_balloon_green`

## Лист 15. Емблема гри (одна велика картинка) — ГОТОВО (логотип і значок додатка)

```
A single large 3D render of the game emblem, centered on a perfectly flat solid magenta background (#FF00FF), square canvas 2048x2048, the emblem filling about 70% of the canvas, wide empty margin on all sides, nothing cut off. A golden crown with colorful round jewels sitting on top of a big plump yellow lemon with a green leaf, the lemon has a friendly smile and big round eyes, tiny arms. Cute stylized soft clay / toy-like look, rounded chunky shapes, bright cheerful saturated colors, soft studio lighting from the top-left, FRONT VIEW, slightly glossy clay material, very high detail, crisp edges. NO text, NO letters, NO ground shadow, NO glow, NO halo.
```

## Великі суцільні текстури землі (4 окремі картинки 2048×2048)

```
A large flat top-down texture of [МАТЕРІАЛ], filling the entire square canvas edge to edge, 2048x2048, strictly orthographic straight-from-above view, NO perspective, NO horizon, NO shadows, NO objects, NO borders, even flat lighting without gradients or vignette, uniform overall brightness and color across the whole image (no large dark or bright patches), small soft detail evenly spread everywhere. Cute stylized soft clay / toy-like look, bright cheerful saturated colors, matching the attached style reference.
```

Матеріали: `fresh light-green grass with tiny soft tufts and a few small white and yellow flowers` · `warm yellow beach sand with soft ripples and a few tiny shells` · `turquoise water with soft light-blue wavy lines` · `dark gray asphalt with fine soft grain`.

## КУХНЯ. Лист 16: предмети кухні (5×5, FLAT)

Кухня в грі показується спереду (як сцена на екрані), а не ізометрично, тому заголовок FLAT. Рівні запасів (скільки лимонів, води, цукру) гра вибирає з кількох станів.

СІТКА 25 / 5×5 / 78% + FLAT +

```
Each item is a single kitchen object seen straight from the FRONT, slightly glossy clay material.

Row 1 (lemons): 1) an empty wooden crate, 2) a wooden crate with only three lemons at the bottom, 3) a wooden crate half full of lemons, 4) a wooden crate full of fresh lemons heaping above the rim, 5) a single whole fresh lemon with a leaf.
Row 2 (water and sugar): 6) one plastic water bottle, 1.5 liters, blue cap, 7) two plastic water bottles side by side, 8) three plastic water bottles in a row, 9) an empty open paper sugar sack, 10) a full open paper sugar sack with white sugar crystals heaping at the top, no text.
Row 3 (sugar and cups): 11) a half-full open paper sugar sack, 12) a stack of two white paper cups, 13) a stack of three white paper cups, 14) a tall stack of five white paper cups, 15) a stack of four yellow paper cups each with a small lemon drawing.
Row 4 (tools): 16) a wide white bowl with a half lemon pressed on a reamer (hand squeezing), 17) a lever citrus juicer machine, orange and steel, with a big lever, 18) a wooden cutting board with a knife, 19) a pink hand mixer with two beaters, 20) a modern stainless-steel stand mixer with a mixing bowl.
Row 5: 21) the pink hand mixer BROKEN: cracked casing, a loose cable, a small wrench lying next to it, 22) a blue cooler bag with a zipper and a handle, 23) a red toolbox with a handle, closed, 24) a big EMPTY pitcher with a handle, opaque light-blue, wide open top, 25) the same big pitcher FILLED to the top with yellow lemonade and a lemon slice on the rim, opaque.
```

Імена: `kt_crate_0, kt_crate_1, kt_crate_2, kt_crate_3, kt_lemon, kt_water_1, kt_water_2, kt_water_3, kt_sugar_0, kt_sugar_3, kt_sugar_2, kt_cups_2, kt_cups_3, kt_cups_5, kt_cups_branded, kt_juicer_hand, kt_juicer_lever, kt_board, kt_mixer_basic, kt_mixer_pro, kt_mixer_broken, kt_cooler, kt_toolkit, kt_pitcher_empty, kt_pitcher_full`

## КУХНЯ. Лист 17: ефекти й оздоблення кухні (5×4, FLAT)

СІТКА 20 / 5×4 / 78% + FLAT +

```
Row 1 (effects): 1) a yellow lemon-juice splash burst, 2) three yellow juice drops, 3) a small pile of white sugar crystals with sparkles, 4) a blue water splash with drops, 5) a yellow swirl of mixing lines in a circle.
Row 2: 6) a lemon half cut open, 7) a lemon slice wheel, 8) a curl of yellow lemon peel, 9) a golden sparkle star (perfect mix), 10) a wrench crossed with a screwdriver (broken marker).
Row 3 (furniture): 11) a long wooden work table seen from the front, empty top, four legs, one drawer, 12) a wooden wall shelf with two boards and brackets, empty, 13) a window with white frame and a small curtain, opaque sky-blue pane, 14) a round wall clock, blank face with ticks only, 15) a small wooden stool.
Row 4 (decor): 16) a pot with fresh green mint, 17) a kitchen towel hanging on a hook, 18) a yellow apron hanging on a peg, 19) a blank black chalkboard in a wooden frame, 20) a fruit bowl with lemons and an apple.
```

Імена: `kt_fx_splash, kt_fx_drops, kt_fx_sugar, kt_fx_water, kt_fx_swirl, kt_lemon_half, kt_lemon_slice, kt_peel, kt_sparkle, kt_broken, kt_table, kt_shelf, kt_window, kt_clock, kt_stool, kt_mint, kt_towel, kt_apron, kt_chalkboard, kt_fruit_bowl`

## КУХНЯ. Фон (одна велика картинка, без предметів, 3:2)

Кухня в грі це сцена 900×600 (3:2). Фон кладеться на всю сцену, а полиці, інструменти та інвентар ставляться поверх нього за відсотками, тому ПОЛИЦІ Й СТОЛЕШНИЦЯ ПОВИННІ БУТИ ТАМ, ДЕ ВКАЗАНО. Після генерації я підганяю координати під картинку.

```
A single wide 3D render of an empty cozy kids' lemonade kitchen interior seen straight from the front (orthographic front view, no perspective tilt), canvas 1536x1024 (3:2). Cute stylized soft clay / toy-like look, rounded chunky shapes, bright cheerful saturated colors, soft studio light from the top-left, very high detail. Layout, measured from the top-left corner of the canvas:
- Back wall: mint-green square glossy tiles from the top down to 66% of the height.
- LEFT: a wooden wall shelf unit on the wall at 2%-29% of the width, with THREE empty horizontal wooden planks (brackets under them) whose top edges are at 21%, 39% and 58% of the height. The wall above each plank must stay completely empty for about 17% of the height so goods can stand on the planks.
- TOP CENTER: a big white-framed window at 33%-62% of the width and 5%-40% of the height with a small red-and-white checkered curtain, opaque pale sky-blue pane with a couple of soft green treetops, lit by daylight.
- RIGHT: one short empty wooden wall plank with brackets at 77%-98% of the width, its top edge at 42% of the height, empty wall above it for about 17% of the height. Above it, hanging on the wall: a red-and-white checked kitchen towel on a hook (at about 66%-70% of the width, 5%-18% of the height), a yellow apron on a peg (at 72%-80% of the width, 4%-20% of the height) and a round wall clock with a blank face and tick marks only (at 85%-95% of the width, 4%-20% of the height).
- COUNTER: a long wooden work counter across the whole width, its flat top surface seen from the front as a light-wood band between 65% and 70% of the height, EMPTY on top; under it two big cabinet doors with simple round knobs down to 93% of the height, then a darker wooden floor strip at the bottom 7%.
- The center area (28%-75% of the width, 40%-65% of the height) must stay a calm empty tiled wall so a jug and a juicer can stand there.
NO objects on the shelves, NO items on the counter, NO furniture other than described, NO food, NO tools, NO characters, NO text, NO letters, NO numbers, NO magenta.
```

Ім'я: `kt_bg` (кладеться в `assets/kitchen/kt_bg.png`, гра сама його підхопить і сховає намальовані кодом стіну, полиці, стіл і прикраси).

## КУХНЯ. Лист 18: глечик, миска й інше, що досі малював код (FLAT)

Глечик ОБОВ'ЯЗКОВО молочно-біле «скло» (майже біле, легкий блакитний відтінок, світлі відблиски), без прозорості: гра накладає на нього жовтий лимонад зі змішуванням кольору.

СІТКА 10 / 5×2 / 78% + FLAT +

```
Row 1: 1) a BIG kitchen pitcher for mixing lemonade, made of milky white frosted glass-like material (opaque, almost white with a faint sky-blue tint and soft highlights), with a wide round body, a spout on the left, a handle on the right, a wide open top, measurement lines but no numbers, EMPTY; 2) a wide ceramic bowl in cream with an orange rim, empty, for squeezing lemons by hand; 3) a pink hand mixer standing vertically with its two beaters pointing DOWN, as if dipped into a pitcher, front view; 4) a modern stainless-steel mixer with a vertical whisk pointing DOWN, as if dipped into a pitcher, front view; 5) the broken pink hand mixer with the beaters pointing down, cracked casing and a loose cable.
Row 2: 6) a wooden spoon, standing upright; 7) a measuring cup with a handle, milky white, blank marks; 8) a half lemon on a hand squeezer, juice dripping; 9) a squeezed lemon peel half, empty and wrinkled; 10) a small round wooden tray.
```

Імена: `kt_jug, kt_bowl, kt_mixer_v_basic, kt_mixer_v_pro, kt_mixer_v_broken, kt_spoon, kt_cup_measure, kt_squeeze, kt_peel_used, kt_tray`

## Лист 20. Вагончик з неоном у 5 кольорах (4×2, ISO)

Як гра покаже продавців усередині: вагончик малюється картинкою, потім наші продавці (ті самі, що за столом) малюються лише в межах отвору вікна (обрізка по контуру вікна, який я виміряю на картинці), і нижче підвіконня їх не видно — ніби вони стоять у вагончику. Напис на даху («ЛИМОНАД» чи текст гравця) і логотип на боці гра малює сама на порожніх місцях. Столик і барні стільці окремими картинками, щоб їх правильно перекривали ліхтарі й люди.

СІТКА 8 / 4×2 / 78% + ISO +

```
Row 1 and the first cell of row 2: five food trucks for selling lemonade, EXACTLY the same shape, size, camera and position in their cells, only the colours differ. Each truck: a cute toy-like rounded food truck seen from the isometric camera, its long side with the serving window faces the LOWER-LEFT, its short back end faces the lower-right, four chunky wheels. In the long side a big rectangular serving window, wide and tall (about two thirds of the side), completely EMPTY and OPEN: through it we see only the plain light cream interior back wall, NO people, NO objects inside. A flat wooden counter shelf runs along the bottom edge of the window. A striped awning sticks out above the window. On the roof a flat dark navy rectangular sign board, empty, NO letters. On the short back end a plain white round badge, empty, NO picture. No stools, no table, no text anywhere.
1) lemon yellow body, orange trim and orange-white striped awning; 2) mint green body, dark green trim, green-white striped awning; 3) soft pink body, raspberry trim, pink-white striped awning; 4) sky blue body, deep blue trim, blue-white striped awning; 5) coral red body, dark red trim, red-white striped awning.
Row 2, cells 6-8: 6) a small round white bistro table on one metal leg, 7) a tall bar stool with a round orange seat and a metal leg, 8) the same bar stool with a round mint green seat.
```

Імена: `stand_truck_lemon, stand_truck_mint, stand_truck_berry, stand_truck_sky, stand_truck_retro, stand_truck_bistro, stand_truck_stool_a, stand_truck_stool_b` (кольори збігаються з TRUCK_SKINS у грі).

## Лист 20б. Вагончик з ВЕЛИКИМ вікном (3×2, ISO)

У першому вагончику вікно вийшло низьким (11–18 px при висоті вагончика 131 px), тому з продавця видно лише голову. Тут вікно — головне: половина висоти кузова, підвіконня посередині, щоб продавця було видно до пояса. Столик і стільці вже є, вони не потрібні. Шостий колір (бузковий) — новий.

СІТКА 6 / 3×2 / 80% + ISO +

```
Six food trucks for selling lemonade, EXACTLY the same shape, size, camera and position in their cells, only the colours differ. Each truck: a cute toy-like boxy rounded food truck like an ice cream van, a bit taller than a car, seen from the isometric camera; its long side with the serving window faces the LOWER-LEFT, its short back end faces the lower-right, four chunky wheels.
THE MOST IMPORTANT PART: the serving window is HUGE. It is a wide open hatch that covers about 70% of the length of the long side and about half of the height of the body: its top edge is right under the roof, its bottom edge (a flat wooden counter shelf) is at the middle height of the body. A person standing inside would be seen from the waist up. The window is completely EMPTY and OPEN: through it we see only the plain light cream interior back wall, NO people, NO objects inside. A short striped awning sits on the roof edge above the window and does NOT cover the opening.
On the roof a flat dark navy rectangular sign board, empty, NO letters. No stools, no table, no text anywhere.
Colours: 1) lemon yellow body, orange trim, orange-white striped awning; 2) mint green body, dark green trim, green-white striped awning; 3) soft pink body, raspberry trim, pink-white striped awning; 4) sky blue body, deep blue trim, blue-white striped awning; 5) coral red body, dark red trim, red-white striped awning; 6) lilac purple body, deep violet trim, violet-white striped awning.
```

Імена: `stand_truck_lemon, stand_truck_mint, stand_truck_berry, stand_truck_sky, stand_truck_retro, stand_truck_lilac` (встановлює `tools/make_trucks.py`).

## Лист 21. Стіни вокзалу (одна картинка 1536×1024, за шаблоном) — ГОТОВО

Стіни малюються **рівно, як фасад** (не в ізометрії): гра сама «загне» їх на дві задні стіни залу.
Обов'язково прикріпіть до запиту шаблон `docs/art/wall_station_layout.png`: у ньому двері стоять саме там,
куди заходять люди, а вікна, табло, годинник і таблички — на своїх місцях. Без шаблону двері опиняться
не там, і люди йтимуть крізь стіну. Шаблони робить `python tools/make_wall_layouts.py`.

```
Flat front view (elevation, NOT isometric, no perspective) of the two inner walls of a cozy cartoon train station hall, for a kids' mobile game. Same style as the game: soft 3D clay-like cartoon look, warm light, rounded shapes, clean simple details, no people except the cashiers.

Follow the attached layout image EXACTLY: the same 1536x1024 canvas, the same positions and sizes of every shape.
- Everything outside the two grey strips stays pure flat magenta #FF00FF.
- Top strip = the entrance wall, bottom strip = the back wall. Paint each grey strip as a wall, filling it edge to edge.
- Magenta shapes INSIDE the strips are see-through openings (two doorways down to the floor, arched windows). Keep them pure flat #FF00FF with crisp edges, paint nothing inside them; give them handsome frames around the edges (wooden or stone arches with a keystone).
- Yellow rectangles: empty sign boards in a decorative frame, cream colour inside, NO letters.
- White circle: a big station wall clock face with hour marks but NO hands.
- Dark rectangle: an empty dark departures board in a metal frame, NO text.
- Light blue rectangles: three ticket office windows with friendly cashiers behind the glass, a small wooden counter under each.
The walls: warm cream plaster with tall pilasters, a decorative cornice along the top, a muted teal tiled wainscot on the lower fifth, brass wall lamps between the windows, a couple of posters with pictures only. No text or letters anywhere. Even front light, no floor, no ceiling, no perspective lines.
```

Імена: `wall_station` (встановлю сам).

## Лист 22. Стіни торгового центру (одна картинка 1536×1024, за шаблоном) — ГОТОВО

Так само рівно, як фасад, з шаблоном `docs/art/wall_mall_layout.png`.

```
Flat front view (elevation, NOT isometric, no perspective) of the two inner walls of a bright modern shopping mall, for a kids' mobile game. Same style as the game: soft 3D clay-like cartoon look, warm light, rounded shapes, clean simple details, no people.

Follow the attached layout image EXACTLY: the same 1536x1024 canvas, the same positions and sizes of every shape.
- Everything outside the two grey strips stays pure flat magenta #FF00FF.
- Top strip = the entrance wall, bottom strip = the wall with the shops. Paint each grey strip as a wall, filling it edge to edge.
- Magenta shapes INSIDE the strips are see-through openings (two glass entrance doorways down to the floor and two windows). Keep them pure flat #FF00FF with crisp edges, paint nothing inside them; give them slim light metal frames.
- Yellow rectangles: empty sign boards (small ones over the doors, a big one for the mall logo), friendly colours, NO letters. On the big board paint a simple round orange-fruit logo without words.
- Light blue rectangles: three shop windows full of goods behind glass: a toy shop (teddy bears, balls, a toy car), a clothes shop (colourful t-shirts and dresses on a rail), a cafe (cups, cakes, a coffee machine); each with a glass door in the middle.
The walls: white and light wood panels, soft pastel stripes, green plants in pots, round lamps, glass railings feel. No text or letters anywhere. Even front light, no floor, no ceiling, no perspective lines.
```

Імена: `wall_mall` (встановлю сам).

## Анімації: як замовляти ще

Для кожного листа з людьми/тваринами, пари «спереду + ззаду», можна замовити відео ходьби тим самим способом, що й для пішоходів (сітка з клітинок, фігури крокують на місці, лист на магентовому фоні, цикл мінімум 1 с). Далі `tools/walk_analyze.py` та `tools/make_walk.py`.
