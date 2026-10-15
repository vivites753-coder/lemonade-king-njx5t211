# Lemonade King: звуки й музика

Зараз усі звуки в грі синтезовані кодом (`src/audio/sfx.ts`, 15 простих «біпів»), музики немає.
Цей список — що потрібно згенерувати, щоб гра звучала як справжня.

## Як генерувати й куди класти

- **Звукові ефекти**: генератор звуків за текстом (наприклад, ElevenLabs Sound Effects). Промпти англійською —
  так генератори розуміють краще. Для частих звуків (монета, налити, кнопка) зробіть **2–3 варіанти**
  (`_1`, `_2`, `_3`), гра чергуватиме їх, щоб не набридало.
- **Музика**: генератор музики (наприклад, Suno або Udio), режим **Instrumental** (без слів).
- Формат: MP3 або WAV (я сам переведу в потрібний), назви файлів — як у таблицях.
  Ефекти — `assets/audio/sfx/`, музика — `assets/audio/music/`.
- Ефекти: коротко, без луни (reverb), тиша на початку обрізана — звук має починатися одразу.
- Музика: 1,5–3 хв, рівна гучність, щоб **кінець плавно переходив у початок** (гра повторює трек по колу).
- Коли файли будуть, я підключу їх: окрема гучність музики й ефектів у налаштуваннях, плавний перехід
  між треками, вимкнення музики разом зі звуком.

---

## 1. Звукові ефекти (усього 78)

### Кнопки й вікна (10)

| Файл | Коли звучить | Промпт |
|---|---|---|
| `ui_tap` ×3 | будь-яка кнопка | Soft playful UI button tap, short wooden click with a tiny pop, cartoon mobile game, 0.15 s |
| `ui_open` | відкривається вікно | Light cartoon whoosh with a soft pop at the end, window opening in a cute mobile game, 0.4 s |
| `ui_close` | вікно закривається | Short soft reverse whoosh, gentle closing swish, cute mobile game UI, 0.3 s |
| `ui_toggle_on` | вмикач увімкнено | Tiny bright click with a rising blip, toggle switch on, playful UI, 0.2 s |
| `ui_toggle_off` | вмикач вимкнено | Tiny soft click with a falling blip, toggle switch off, playful UI, 0.2 s |
| `ui_error` | «не можна» (немає продуктів, грошей) | Gentle cartoon "nope" buzz, two short low soft tones, friendly not harsh, kids game, 0.4 s |
| `ui_toast` | спливає повідомлення | Soft notification bubble pop, light and friendly, 0.3 s |
| `ui_tip` | Лемі дає підказку | Cute cheerful chirp of a small cartoon lemon character saying "hey!", wordless, bouncy, 0.5 s |
| `ui_price_up` | ціна + | Short bright tick going up, abacus bead click, 0.15 s |
| `ui_price_down` | ціна − | Short soft tick going down, abacus bead click, lower pitch, 0.15 s |

### Гроші, магазин, репутація (9)

| Файл | Коли | Промпт |
|---|---|---|
| `coin` ×3 | продано склянку | Single bright cartoon coin clink, one coin dropping on a counter, clean, 0.3 s |
| `coins_bonus` | знахідка, бонус, нагорода | Small shower of cheerful coins falling with a sparkle, rewarding, 1 s |
| `buy` | оплата на ринку | Cute toy cash register "ka-ching" with a little bell, 0.8 s |
| `upgrade` | куплено покращення | Magical sparkle chime rising, new item unlocked in a kids game, glittery, 1 s |
| `expense` | оренда, зарплата (гроші йдуть) | Few coins sliding away with a soft descending tone, light, not sad, 0.6 s |
| `rep_up` | зросла репутація (зірка) | Short triumphant fanfare with a star twinkle, bright brass and glockenspiel, 2 s |
| `rep_down` | впала репутація | Gentle sad descending "wah-wah" on a muted trumpet, cartoon, soft, 1.2 s |
| `unlock` | відкрито нове місце, точку | Bright magical unlock chime with a door-opening whoosh, exciting, 1.5 s |
| `hire` | найнято продавця | Friendly double chime with a light hand clap, welcoming, 0.8 s |

### Кухня (12)

| Файл | Коли | Промпт |
|---|---|---|
| `lemon_squeeze` ×2 | вичавлюємо лимон | Juicy lemon being squeezed by hand, wet squish with juice dripping, close-up, 0.6 s |
| `lemon_plop` | лимон падає в глечик | Small fruit plopping into liquid in a glass jug, cartoon plop, 0.4 s |
| `water_pour` | вода в глечик | Water pouring from a plastic bottle into a glass jug, short glug glug, 1 s |
| `sugar_pour` | цукор у глечик | Sugar crystals sprinkling from a spoon into water, soft fine granular hiss, 0.7 s |
| `pick_item` | беремо продукт з полиці | Soft quick swish, picking up a small object, cartoon, 0.2 s |
| `drop_item` | кладемо продукт | Soft muffled tap of a small object placed on wood, 0.2 s |
| `mixer_loop` | міксер працює (по колу) | Small kitchen hand mixer motor whirring steadily, toy-like, seamless loop, 2 s |
| `mixer_start` | міксер увімкнули | Small hand mixer motor spinning up, short, 0.4 s |
| `mixer_perfect` | ідеально перемішано | Happy sparkly success ding with a little "ta-da", kids cooking game, 0.8 s |
| `mixer_over` | перемішали забагато | Liquid sloshing over the rim of a jug with a cartoon splash, funny, 0.8 s |
| `stir_spoon` ×2 | мішаємо ложкою (міксер зламаний) | Metal spoon stirring in a glass jug, light clinks against glass, 0.5 s |
| `jug_ready` | глечик готовий | Lemonade poured from a jug into a big pitcher with ice cubes clinking, satisfying, 1.2 s |

### Продаж біля прилавка (11)

| Файл | Коли | Промпт |
|---|---|---|
| `pour_cup` ×3 | наливаємо склянку | Pouring cold lemonade into a paper cup, quick liquid pour with a fizz, 0.6 s |
| `ice_clink` | з холодильної сумки | Ice cubes clinking in a cup, crisp and cold, 0.4 s |
| `customer_happy` ×3 | покупець задоволений | Cute short happy "mmm!" yum sound of a cartoon person, wordless, cheerful, 0.5 s |
| `customer_angry` ×2 | пішов сердитий (довго чекав) | Short grumpy cartoon "hmph", wordless, funny not scary, 0.5 s |
| `customer_stop` | хтось зупинився біля прилавка | Light curious "ooh?" chirp, cartoon, wordless, 0.4 s |
| `sold_out` | лимонад закінчився | Empty glass jug clunk with a sad little tone, cartoon, 0.7 s |
| `cookie` | продано печиво | Crunchy cookie bite, crisp, short, 0.3 s |
| `speaker` | колонка кличе людей | Short cheerful public address chime "ding-dong" before an announcement, 1 s |
| `flyers` | листівки | Paper flyers being shuffled and handed out, quick rustle, 0.6 s |
| `stand_open` | відкрили продаж | Small shop doorbell ring, bright and welcoming, 0.8 s |
| `bike_bell` | доставка, велосипед, скутер | Classic bicycle bell ring twice, cheerful, 0.6 s |

### Події та пригоди (19)

| Файл | Коли | Промпт |
|---|---|---|
| `card` | з'являється картка події | Paper card sliding onto a table with a soft whoosh, 0.5 s |
| `thief_alarm` | лис-крадько біля каси | Short cartoon burglar alarm, comical siren wobble, not scary, 1.5 s |
| `thief_run` | лис тікає | Fast cartoon footsteps scurrying away, comedic, 1 s |
| `thief_hit` | влучили в лиса | Cartoon bonk, rubber mallet hit with a squeak, funny, 0.4 s |
| `thief_caught` | лиса впіймали | Victorious short jingle with a cartoon "gotcha" pop, 1.2 s |
| `ball_kick` | хлопці грають у футбол | Soccer ball kicked hard, rubbery thump, 0.3 s |
| `glass_break` | м'яч розбив глечик | Glass jug shattering with liquid splash, cartoonish, not violent, 1 s |
| `runner_crash` | хлопчик врізався в прилавок | Kid bumping into a wooden table, thud with cups wobbling and a splash, funny, 1 s |
| `spill` | помічник розлив | Liquid splashing on the ground from a tipped cup, 0.6 s |
| `blackout` | вимкнулось світло | Electric zap followed by a power-down whine, cartoon, 1.2 s |
| `dog_bark` | собаки | Friendly medium dog barking twice, playful, 0.8 s |
| `cat_meow` | кіт Мурчик | Cute kitten meow, soft and friendly, 0.6 s |
| `cat_purr` | кота знайшли | Short happy cat purr, 1 s |
| `balloon_pop` | кулька лопнула / впіймали | Balloon squeak and a light pop, cartoon, 0.5 s |
| `wallet` | знайшли гаманець | Leather wallet opened with a zipper and a coin jingle, 0.8 s |
| `equipment_break` | зламалось обладнання | Cartoon machine breaking: spring boing, rattle and a clunk, funny, 1 s |
| `repair` | полагодили | Wrench tightening a bolt, quick ratchet clicks and a ding, 0.8 s |
| `sneeze` | продавець захворів | Cartoon sneeze "achoo", wordless, cute, 0.6 s |
| `train_arrive` | на вокзалі прибуває потяг | Passenger train arriving at a station: rumble, brakes squeal, gentle, 4 s |

### Ранок, вечір, транспорт (7)

| Файл | Коли | Промпт |
|---|---|---|
| `morning` | початок дня | Morning birds chirping with a short rooster call in the distance, cheerful, 2.5 s |
| `school_bell` | біля школи (перерва) | Old school bell ringing, short, 2 s |
| `evening` | кінець дня | Evening crickets with a soft wind chime, calm, 2.5 s |
| `sleep` | лягаємо спати | Short sleepy music box chime, three soft notes descending, lullaby, 2 s |
| `car_pass` ×3 | машина проїжджає (двір) | Small car passing by on a quiet street, left to right, 2 s |
| `scooter` | скутер | Small electric scooter whirring past, short, 1.5 s |
| `truck_horn` | вагончик (покращення) | Cute toy-like food truck horn, two short honks, funny, 0.6 s |

### Фонові звуки місць і погоди — по колу, 30–60 с (10)

| Файл | Де | Промпт |
|---|---|---|
| `amb_yard` | Двір | Quiet suburban backyard ambience, birds, distant children, faint car now and then, seamless loop |
| `amb_park` | Парк | City park ambience, birds singing, rustling leaves, fountain splashing, distant laughter, seamless loop |
| `amb_school` | Біля школи | Schoolyard ambience at recess, children playing and chatting in the distance, seamless loop |
| `amb_beach` | Пляж | Sunny beach ambience, gentle waves, seagulls, distant happy crowd, seamless loop |
| `amb_station` | Вокзал | Indoor train station hall, echoing footsteps, murmur of travellers, distant train hum, seamless loop |
| `amb_mall` | ТРЦ | Shopping mall ambience, soft crowd murmur, footsteps on tiles, distant fountain, seamless loop |
| `amb_rain` | дощ надворі | Steady gentle rain on a street, soft and cozy, no thunder, seamless loop |
| `amb_rain_roof` | дощ, коли ми під дахом | Rain heard from indoors, drumming on a glass roof, muffled, seamless loop |
| `amb_wind` | вітряно | Gusty wind in trees, moderate, not stormy, seamless loop |
| `amb_heat` | спека | Hot summer afternoon, cicadas buzzing, still air, seamless loop |

---

## 2. Музика

Спільне для всіх треків (додайте до кожного промпту): *Instrumental, no vocals, kid-friendly, warm and
clean mix, simple memorable melody, not distracting, for a cozy mobile game about running a lemonade
stand.* Для фонових треків: *seamless loop, no big intro or ending.*

### Основні фонові треки (по колу)

1. **`music_title` — титульний екран, головна тема** (60–90 с)
   > Cheerful catchy main theme for a kids business game, ukulele, glockenspiel and hand claps, sunny and
   > optimistic, 108 BPM, C major, light whistled melody, seamless loop.

2. **`music_morning` — ранок, ринок, підготовка** (2 хв)
   > Calm bright morning music, fingerpicked acoustic guitar and soft piano, light shaker, relaxed and
   > hopeful, planning the day, 88 BPM, G major, seamless loop.

3. **`music_kitchen` — кухня** (1,5 хв)
   > Playful bouncy cooking music, pizzicato strings and marimba, light percussion like kitchen utensils,
   > curious and fun, 104 BPM, F major, seamless loop.

4. **`music_sell_sunny` — продаж у ясний день** (2–3 хв)
   > Upbeat feel-good summer music for selling lemonade, ukulele strumming, bass, light drums, hand claps and
   > whistling, energetic but not distracting, 112 BPM, D major, seamless loop.

5. **`music_sell_hot` — продаж у спеку** (2 хв)
   > Lazy hot summer afternoon groove, steel drums and kalimba, soft congas, tropical and relaxed, 96 BPM,
   > A major, seamless loop.

6. **`music_sell_cloudy` — хмарно, вітер, холодно** (2 хв)
   > Mellow cozy music for a cloudy day, acoustic guitar, warm Rhodes piano, soft brushes, calm and steady,
   > 94 BPM, E minor to G major feeling, seamless loop.

7. **`music_sell_rain` — дощ** (2 хв)
   > Cozy rainy day lo-fi music, soft Rhodes piano, muted bass, gentle brushed drums, warm and comforting,
   > 78 BPM, F major, seamless loop.

8. **`music_evening` — звіт дня, магазин покращень** (2 хв)
   > Warm reflective evening music, gentle piano with soft strings and a little celesta, satisfied and calm,
   > counting the day's coins, 76 BPM, B-flat major, seamless loop.

9. **`music_night` — сон, перехід до нового дня** (40–60 с)
   > Soft lullaby on a music box with gentle harp, sleepy and peaceful, 66 BPM, C major, seamless loop.

### Треки місць (замість звичайного треку продажу, за бажанням)

10. **`music_beach` — пляж**
    > Sunny beach party music, ukulele and steel drums, shakers and bongos, carefree vacation mood, 110 BPM,
    > seamless loop.

11. **`music_station` — вокзал**
    > Light swing jazz for a busy train station, upright bass, brushed drums, clarinet melody, rhythm like
    > train wheels, cheerful hustle, 118 BPM, seamless loop.

12. **`music_mall` — ТРЦ**
    > Smooth bossa nova shopping mall music, nylon guitar, soft electric piano, light percussion, pleasant
    > background, 100 BPM, seamless loop.

13. **`music_school` — біля школи**
    > Playful school recess music, toy piano, xylophone and recorder, bouncy and silly, 116 BPM, seamless
    > loop.

### Події (по колу, поки триває подія)

14. **`music_rush` — довга черга, наплив покупців** (1 хв)
    > Fast exciting busy-hour music, ukulele and bright brass stabs, driving bass and drums, playful urgency,
    > 128 BPM, D major, seamless loop.

15. **`music_thief` — лис-крадько біля каси** (30 с)
    > Sneaky comedic chase music, pizzicato strings, bassoon and woodblocks, tiptoeing then running, cartoon
    > heist, 132 BPM, seamless loop.

16. **`music_festival` — свято в місті** (2 хв)
    > Joyful festival music with a brass band, accordion and Ukrainian folk flavour (sopilka flute, tambourine),
    > dancing crowd mood, 120 BPM, seamless loop.

17. **`music_concert` — концерт у ТРЦ** (1,5 хв)
    > Upbeat pop-rock instrumental from a stage concert, electric guitar riff, punchy drums, crowd energy,
    > 124 BPM, seamless loop.

### Короткі музичні вставки (2–6 с, без повтору)

| Файл | Коли | Промпт |
|---|---|---|
| `jingle_day_start` | початок дня | Short bright morning jingle, ukulele and glockenspiel, 3 seconds, rising and hopeful |
| `jingle_profit` | день із прибутком | Short happy success jingle, ukulele and brass, cheerful ending, 4 seconds |
| `jingle_loss` | день у мінусі | Short gentle "better luck tomorrow" jingle, soft piano and muted trumpet, kind not sad, 4 seconds |
| `jingle_rep_up` | нова зірка репутації | Triumphant level-up fanfare, brass and sparkling bells, 4 seconds |
| `jingle_unlock` | нове місце / нова точка | Exciting discovery jingle, harp glissando and brass, 4 seconds |
| `jingle_king` | гравець став Королем Лимонаду | Grand royal victory fanfare with trumpets and timpani, festive and funny, 6 seconds |

---

## Встановлення (поетапно)

Згенеровані файли лежать у `assets/soundFX` (їх немає в git). `python tools/install_audio.py <етап>` чистить їх
(обкладинка, тиша, другий звук у файлі), вирівнює гучність, робить музику безшовною по колу й кладе в
`assets/audio` (OGG). Етапи описано в самому інструменті.

- **Етап 2 — встановлено:** уся музика: кухня, вечір (звіт), ніч (магазин покращень), продаж у хмарну /
  вітряну / холодну погоду й у дощ, ТРЦ, події (довга черга, лис, свято, концерт).
- **Етап 1 — встановлено:** `coin`, `pour_cup`, `ui_tap`, `buy`, `ui_error`; музика `music_title`,
  `music_morning` (ранок, ринок, кухня, звіт), `music_sell_sunny` (продаж у будь-яку погоду).

## Порядок (що генерувати першим)

1. `coin`, `pour_cup`, `ui_tap`, `buy`, `ui_error` — їх чути найчастіше.
2. `music_title`, `music_sell_sunny`, `music_morning` — без них гра «мовчить».
3. Кухня: `lemon_squeeze`, `water_pour`, `sugar_pour`, `mixer_loop`, `mixer_perfect`.
4. Фони місць і погоди (`amb_*`).
5. Події, решта треків і вставки.
