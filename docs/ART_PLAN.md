# Графіка: порядок листів

Стиль затверджено на листі `art/style-test/sheet_01.jpg` (м'який «глиняний» вигляд, ізометрія 2:1, світло зліва зверху).
**До кожного нового запиту в генератор додавайте цей лист як референс стилю.**

Робочий цикл: лист на однотонному маджента-фоні (#FF00FF) → `tools/cut_sheet.py` → `assets/<група>/<id>.png` → підбір
розміру в `src/render/spriteMeta.ts` → перевірка в браузері.

```
python tools/cut_sheet.py <лист.jpg> <папка> <id1,id2,...> [стовпців] [рядків]
```

Правила для кожного листа (з досвіду листів 1–2):
- скляні й прозорі предмети — суцільні, непрозорі, пастельні (магента просвічує крізь скло);
- без свічення, ореолів, променів, без тіней на землі, без жодного тексту на предметах;
- між предметами широкі поля, без накладання.

## Статус

| Лист | Що | Сітка | Статус |
|---|---|---|---|
| 01 | 25 малих предметів (стиль) | 5×5 | готово, нарізано в `art/style-test/cut` |
| 02 | земля (тайли) | 5×4 | готово, `assets/tiles`, `tools/make_tiles.py` |
| 03 | вулиця: дерева, лавка, машини, пляж | 5×5 | готово, встановлено (крім машин і хмар: гра малює їх з напрямком руху) |
| 04 | будівлі й предмети залів | 5×5 | готово, встановлено; склад, кафе, кіоск, магазин, вишка (синя) і соковижималка лежать у `art/cut` до потрібних етапів |
| 05 | прилавок і обладнання | 5×5 | готово, підключено (assets/stand, місця й шари в spriteMeta і stand.ts) |
| 06 | пішоходи, пари «спереду + ззаду» (12 осіб) | 3×4 | готово, `assets/chars`, анімація ходьби кодом |
| 07 | гравець, помічник, лис у позах | 5×3 | промпт готовий, `docs/ART_PROMPTS.md` |
| 17 | ефекти й оздоблення кухні | 5×5 | готово, на стіні кухні вікно, рушник, фартух, годинник; бризки; решта в art/cut/kitchen2 |
| 09 | іконки: погода й показники (20) | 5×5 (4-й рядок продубльовано) | готово: assets/ui/ui_*.png; у грі: шапка (монета, день, час, погода, зірки), прогноз, замок, стрілки звіту, корона/кубок; ui_heart, ui_coin_stack ще не використано |
| 18a | фон кухні (kt_bg.jpg, 4:3) | | готово; сцена кухні 900×672, координати підігнано; чекаємо лист 18 (глечик kt_jug, миска kt_bowl, мікшери, ложка) |
| 08, 10–15 | портрети, іконки (товари, емоції, апгрейди, локації), машини, тварини, емблема | | промпти в `docs/ART_PROMPTS.md` |
| 08 | предмети, інгредієнти, іконки UI | | |

Листи лежать у `art/sheets`, нарізані спрайти — у `art/cut`, встановлені — у `assets/props` і `assets/buildings`.
Розміри на екрані підбираються у `src/render/spriteMeta.ts` (можна підлаштовувати наживо в консолі браузера через `import('/src/render/spriteMeta.ts')`).

## Люди

Гра шукає `char_<тип>_<a|b|c>_<front|back>`; лівий бік отримує дзеркалом.
- `front` повернутий **вправо-вниз** (йде до глядача), `back` — та сама фігура, розвернута: **вліво-вгору** (йде від глядача).
  Генератор сам так малює пару (поворот на 180°), гра враховує це при дзеркаленні.
- Чашку в руці, парасольку в дощ і мішок лиса малює гра, тож на картинках їх немає.
- Ходьба: погойдування кодом, кадри не потрібні.

### Лист 06 — пішоходи (3×4, кожна клітинка = пара: ліворуч front, праворуч back)

```
kid_a,kid_b,kid_c,
adult_a,adult_b,adult_c,
granny_a,granny_b,sport_a,
sport_b,tourist_a,tourist_b
```
Нарізання: `char_<ім'я>_front` і `char_<ім'я>_back` (ліва й права половини клітинки).

### Лист 07 — гравець, помічник, лис (5×3)

```
char_player_boy_front,char_player_boy_serving,char_player_boy_juicing,char_player_boy_splashed,char_helper_boy_front,
char_player_girl_front,char_player_girl_serving,char_player_girl_juicing,char_player_girl_splashed,char_helper_girl_front,
char_helper_boy_serving,char_helper_girl_serving,char_fox_front,char_fox_back,char_fox_dizzy
```

## Будинок

Будинок із листа 04 замалий (283×254) і має власну зелену плиту з огорожею. Замінюємо окремою великою картинкою без плити
(один предмет на лист, велике зображення). Імена: `bld_house_yard`.

## Лист 03 — вулиця (5×5), імена за порядком

```
prop_tree_a,prop_tree_b,prop_tree_c,prop_palm,prop_bush,
prop_flowers,prop_bench,prop_lamp,prop_fence_post,prop_mailbox,
prop_parasol,prop_boat,prop_sandcastle,prop_beachball,prop_ball,
prop_flagpole,prop_bike_rack,prop_duck,prop_car_a,prop_car_b,
prop_car_c,prop_trash_bin,prop_cloud_a,prop_cloud_b,prop_cloud_c
```

## Лист 04 — будівлі й зали (4×4), імена за порядком

```
bld_house_yard,bld_school,bld_fountain,bld_lifeguard,
bld_stage,prop_kiosk_info,prop_vending,prop_column,
prop_luggage,prop_sign_platform,prop_plant,prop_balloons,
prop_bin,bld_kiosk,bld_cafe,bld_warehouse
```

Стіни залів (`wall_mall`, `wall_station`) лишаються з коду: на них гра сама малює вивіски, щоб працювали переклади.

## Лист 05 — прилавок і обладнання (5×5), імена за порядком

```
stand_table,stand_table_blue,stand_chair,stand_umbrella,stand_tent,
stand_banner,stand_scooter,stand_toolkit,stand_cashbox,stand_juicer_hand,
stand_juicer_electric,stand_dispenser,stand_flyers,stand_mascot,item_cups_pack,
item_cups_branded,item_lemon_pile,item_coin_jar,item_pitcher_empty,item_pitcher_full,
item_lemon_half,item_lemon_rotten,item_spoon,item_ice_bag,item_piggy
```

Беремо з наявних листів: `stand_juicer_lever` (лист 04), `stand_cooler`=cooler, `stand_speaker`=speaker, `stand_tv`=tv, `stand_bike`=bike,
`stand_sign`=sign, `item_cookies`=cookies (лист 01).
Стан малює гра: ціна на дошці, рівень у глечику (повний глечик обрізається за рівнем), вкл/викл колонки й ТБ.
Вагончик (`stand_truck`) лишається з коду: його кольори, логотип і текст налаштовує гравець.

## Далі

- Лист 05: прилавок, парасолька, дошка, банер, колонка, соковижималки, велосипед, скутер, ТБ, касa, холодильна сумка,
  великий прилавок, вагончик (білим/сірим під перефарбування у грі).
- Листи 06–07: люди. Гра малює ходьбу кодом (погойдування), тож потрібні лише «спереду» і «ззаду».
- Лист 08: предмети й інгредієнти, іконки інтерфейсу (плоскі, не ізометричні).
