# PROMPT FOR THE CODING MODEL — "Lemonade King" (HTML5 vertical slice)

> Скопіюйте все нижче (від рядка `=== BEGIN PROMPT ===` до `=== END PROMPT ===`) і дайте моделі разом із двома файлами: `LemonadeKing_GDD.md` та `LemonadeKing_ASSETS.md`. Промпт навмисно англійською (точніше для моделі); весь текст **у грі** — українською, і вже прописаний нижче.

=== BEGIN PROMPT ===

# ROLE
You are a senior game developer (HTML5 / TypeScript, 2D isometric games, educational games for children). You will build the first playable **vertical slice** of **"Lemonade King"**, a kids' business-simulator that teaches entrepreneurship basics. The same code base will later be wrapped with **Capacitor** and shipped on Google Play, so everything must be mobile-ready from day one.

Two reference documents are attached: `LemonadeKing_GDD.md` (full game design — read it entirely first) and `LemonadeKing_ASSETS.md` (the art list and naming of the PNG assets the owner will generate later). **This prompt is authoritative where it is more specific than the GDD.**

# PRODUCT SUMMARY
- Audience: children 6–12. Tone: warm, funny, never punishing. Zero ads, zero chat, zero external links, zero network calls. No personal data. All saves are local.
- The player runs a lemonade stand on the street, buys ingredients at a market (this costs time), prepares lemonade, chooses a **location** and a **price**, and sells to **pedestrians who walk past continuously — but only a small percentage stop**. That percentage depends on banner, sign, speaker (sound invitation), weather, reputation, etc. The player earns money, buys upgrades, and gradually grows. A friendly lemon mascot, **Lemi**, explains every new concept in simple words.
- Monetization (design only, do not implement purchases now): free **demo** (stage 1) + paid **full version** unlocked by a one-time purchase behind a parental gate. Add a build flag `EDITION = 'demo' | 'full'` and an end-of-demo screen, nothing more.
- Currency is **coins** (a coin icon drawn in code, never a real-currency symbol). Game name: **Lemonade King**.

# SCOPE OF THIS TASK (Milestone M1)
Deliver a complete, polished, bug-free, playable **Stage 1: "Table in the yard"** (goal: reach **600 coins** and **1.5★ reputation**, then show a "Stage complete / demo ends" screen and allow endless play), including:
1. Title screen, new game / continue, settings (sound, language placeholder, age mode).
2. The full daily loop: Morning → Market → Prepare → Sell → Evening report → Shop → Sleep.
3. **Isometric diorama scene** with 4 selectable locations (yard, park, school, beach), continuously walking pedestrians, a stand with visible upgrades, weather, time-of-day lighting.
4. The **pedestrian funnel** (passed → stopped → agreed price → bought) with live counters and a "Why?" breakdown.
5. 7 upgrades, 5 random events, Lemi tips/tutorial, daily "Lesson of the day", save/load.
6. **Placeholder graphics drawn by code** (clear, colorful, each object instantly recognizable and labeled where useful) behind an **asset abstraction** so PNGs from the ASSETS file can replace them with zero logic changes.

Out of scope for M1: stages 2–6, staff, baking/cookies, mini-games (juicing etc.), sound assets (use tiny WebAudio beeps behind a mute toggle), real purchases. But **design the code so they can be added** (data-driven content, event bus, scene/state separation).

# TECH STACK AND CONSTRAINTS
- **TypeScript (strict) + Vite**. **No game engine.** Custom lightweight **Canvas 2D** renderer for the isometric world; **DOM/CSS overlay** for all UI (panels, buttons, HUD) — easy to scale, translate, make accessible and wrap in Capacitor.
- Minimal dependencies (Vitest for tests is welcome). No CDN, everything bundled; the app must work offline.
- Layout: **landscape-first**, responsive from 640×360 to 1920×1080, touch-first (min touch target 48 CSS px), also works with mouse/keyboard. Respect `env(safe-area-inset-*)`. Canvas must handle `devicePixelRatio` crisply (render at DPR, cap at 2).
- 60 fps on a mid-range Android phone (WebView): avoid per-frame allocations in hot loops, sort only what moves, cache gradients/sprites to offscreen canvases, keep < 150 draw calls per frame.
- **Data-driven**: all numbers, texts, locations, upgrades, events live in `src/data/*.ts` (or JSON) — never hard-coded in logic. **All UI strings in `src/i18n/uk.ts`** (key → string, with simple `{param}` interpolation); create `en.ts` with a full English translation too and a language switch.
- **Deterministic simulation core**: game logic (economy, funnel, events, day loop) must be **separated from rendering**, driven by a fixed-timestep `update(dt)` and a **seedable RNG** (e.g., mulberry32) so it can be unit-tested and replayed.
- Save to `localStorage` (versioned schema + migration stub, try/catch everywhere because storage can fail). Autosave on every evening report and shop purchase.
- Accessibility: readable fonts (≥ 16 px UI, big numbers), not-colour-only signalling, optional dyslexia-friendly font toggle (use a system fallback stack; do not load web fonts from the network), reduce-motion toggle.
- Kid safety: a **parental gate** (simple math question, e.g. "5 × 4 − 3 = ?") in front of settings that matter ("Reset progress", "Buy full version" placeholder).

# FILE STRUCTURE (suggested; improve if you have a good reason)
```
index.html
src/
  main.ts                 bootstrap, loop, resize
  core/ rng.ts clock.ts events.ts(eventbus) save.ts types.ts config.ts
  sim/  state.ts day.ts economy.ts traffic.ts pedestrians.ts queue.ts weather.ts randomEvents.ts upgrades.ts lessons.ts reputation.ts
  render/ iso.ts camera.ts scene.ts drawGround.ts drawProps.ts drawStand.ts drawPeople.ts drawFx.ts lighting.ts assets.ts (asset manager + procedural fallbacks)
  ui/   hud.ts panels/{title,morning,market,prepare,report,shop,settings,gate,end}.ts lemi.ts toast.ts tooltip.ts
  data/ locations.ts goods.ts upgrades.ts pedestrianTypes.ts weather.ts events.ts tips.ts
  i18n/ uk.ts en.ts index.ts
  audio/ sfx.ts
tests/  economy.test.ts traffic.test.ts day.test.ts
```

# GAME LOOP (one day)
`MORNING → (MARKET, optional) → PREPARE → SELL → REPORT → SHOP → SLEEP → next day`
- A day runs **08:00 → 20:00** game time. During SELL, **1 game hour = 12.5 s** at speed ×1 (day ≈ 2.5 min). Speed buttons: ⏸ pause, ×1, ×2, ×3. Serving and patience use *simulation* time (so speed-ups don't make the game harder), but the thief event timer uses *real* time.
- **Time costs** (core lesson "time = money"): going to the market costs **2 h** (1 h with bike); travel to a location costs its `travel` hours (reduced by 1 h with the bike, min 0). Selling starts at `08:00 + marketTrips + travel`. The Morning/Prepare panels always show *"Продаж почнеться о HH:MM"*. A second market trip is allowed (costs time again).
- **Fresh lemonade lasts one day.** Unsold cups are poured out at night (shown in the report as waste with their cost) — lesson about planning.

## 1. Morning panel
- Day number, **weather forecast** icon+name (forecast is **right 80%** of the time; otherwise an adjacent weather — teaches that forecasts can be wrong), short news line (festival/football match/none).
- **Location chooser**: 4 cards with icon, name, description, **traffic stars (1–5)**, rent per day, travel time, hint about peaks. Clicking a card instantly switches the live isometric scene behind the panel so the child *sees* how crowded each place is (ambient pedestrians keep walking in every phase). Day 1 is locked to the yard (tutorial).
- Buttons: **"🛒 На ринок (−2 год)"**, **"📋 Готуватись без ринку"** (only if the player has some stock).

## 2. Market panel (illustrated flat scene + shopping cart)
Vendors (name, character emoji as placeholder, price per unit):
| Good | Vendor | Price | Pack | Notes |
|---|---|---|---|---|
| Lemons | Тітка Галя | 4 | 1 pc | Fresh, last 4 days |
| Lemons (cheap) | Кіоск «Все по 3» | 3 | 1 pc | **25% of each lemon is rotten** (revealed after payment) |
| Water 1.5 L | Пан Богдан | 3 | 1 bottle | does not spoil |
| Sugar | Пан Богдан | 10 | 10 spoons | does not spoil |
| Cups | Мілана | 10 | 10 cups | does not spoil |
- **Cart UI**: per-row `[−] qty [+]`, running total, "Оплатити" disabled if total > coins (explain why), shows stock owned. Paying records the expense.
- Market events (see Events): sugar price +30%; "cups sold out → buy at the supermarket for 2× price or skip"; "Galya's delivery unlucky: 30% of the lemons are bad".
- After payment, show an arrival summary toast (e.g., "З 8 дешевих лимонів 2 виявились гнилими 😕").
- Lemons have **age** (batches). Each night age+1; **age ≥ 4 → spoil** (removed, counted in report). Use oldest first.

## 3. Prepare panel
- Stock with freshness indicators (e.g., 2 lemons "3-й день ⚠").
- **Recipe sliders**: lemons per pitcher 2–6 (default 4), sugar spoons 0–5 (default 2). Water is fixed at 2 bottles, cups fixed at 10 per pitcher. **Taste meter** (sour ↔ sweet) and a "quality" bar. Quality formula: `q = clamp(1 − 0.17·|L−4| − 0.17·|S−2|, 0.25, 1)`. Taste label: `d=(L−4)−(S−2)`: `d≥2` "Дуже кисло 😝", `d≤−2` "Дуже солодко", else "Смачно 😋".
- **Juicer upgrades reduce lemons actually consumed** per pitcher (`consumed = max(1, L − reduction)`), taste still uses the chosen L.
- **Cost per cup** live: `(consumedLemons·4 + 2·3 + S·1 + 10·1) / 10` (lemon 4, water bottle 3, one sugar spoon 1, one cup 1 — i.e. pack price ÷ pack size, using the *current base prices*); for the default recipe (4 lemons, 2 spoons) = **3.4 coins**. Show **profit per cup = price − cost**.
- **Pitchers to make** stepper (each = 10 cups, limited by stock). Ingredients are consumed when the sale starts.
- **Price stepper** 1–30 with hint: "Людям тут зазвичай підходить ціна близько {fair} 🪙" (from location `fairPrice`).
- **Flyers** toggle (cost 25, one day, +25% stop chance).
- Buttons: "🛒 Ще раз на ринок (−X год)", "▶ Почати продаж".

## 4. Sell (the heart of the game)
See "Pedestrian simulation" below. Player interaction:
- Customers who join the queue stand in a line next to the table. **Tap the front customer (or the big "Налити 🥛" button / Space)** to serve: a short fill progress (1.6 sim-seconds), then the customer pays `price`, smiles/grimaces, and leaves. The player must keep up with the queue — patience bars are visible.
- If `cupsReady == 0` and stock allows a pitcher, a **"Приготувати глечик" (6 sim-seconds)** button appears; while making, no serving. If no stock — customers get a polite "sold out" state (the stand shows a sign) and the player can end the day early.
- During SELL the player may change the price (±1) and toggle the speaker on/off at any time.
- Day ends at 20:00 or by "Закінчити день".

## 5. Report panel (evening)
Income, Expenses (ingredients bought today + location rent + flyers), **Profit = Income − Expenses**, cups sold, waste (unsold cups poured out, spoiled lemons), reputation change, the **funnel table** (passed by / were close enough to notice / stopped / agreed on price / bought / left because of price / queue / impatience) and a **bar of "why people didn't buy"**. Plus one **"Урок дня"** card (see Lessons). Money from upgrades is *investment*, not an expense; show leftover stock value separately.

## 6. Shop panel
Upgrade cards (icon, name, price, kid-friendly description of the *effect and the idea*, buy button, requirement). Buying is instant; show what changed (new item appears on the stand). "Спати 🌙" → day++.

# ISOMETRIC WORLD AND RENDERING
- **Projection**: tile 64×32 (2:1 dimetric). `screen.x = (x − y)·32`, `screen.y = (x + y)·16 − z`. World diorama = **12×12 tiles**, camera fixed, scaled to fit between the top HUD and the bottom controls.
- **Layers / draw order**: sky gradient + drifting clouds → ground tiles (flat, with thick "diorama" side edges) → large background buildings/water objects → depth-sorted dynamic list (`depth = x + y` of the foot point: trees, lamps, fence pieces, pedestrians, cars, the stand, queue) → floating texts → weather FX → lighting tint overlay. Split long objects (fences) into small pieces so depth sorting stays correct.
- **Placeholder art (drawn in code, must look good)**: boxes with 3 shaded faces (top lightest, left mid, right darkest), simple rounded characters (shadow ellipse, legs, body, head, hair, per-type accessory: granny bun+cane, sporty headband, tourist hat+camera, kid backpack, player apron), trees, house with roof, school with flag, fountain with animated jets, benches, parasols, boat bobbing on water, palm trees, lifeguard tower, cars driving along the road in the yard. Eyes/face visible only when facing the camera (`vx+vy ≥ 0`), otherwise the back of the head. Walk = bobbing + leg swing synchronised with speed. Emotes (emoji or small icon) in a white bubble above heads. Floating "+8" texts for coins. Text on banner/sign/chalkboard is drawn **by code with a shear transform** so it follows the isometric plane (`ctx.transform(1, 0.5, 0, 1, x, y)` for faces whose normal is +y; `(1, −0.5, 0, 1, …)` for +x faces).
- **Stand** is a single draw routine reading the game state, showing: table with striped cloth, chair, player character, pitcher with a liquid level that matches cups left, cup stack, lemon pile, coin jar, and each purchased upgrade **visibly**: umbrella, chalk sign, banner (text "ЛИМОНАД"), speaker (animated sound waves when on, ♪ notes), bike parked, juicer (hand → lever), flyers stack. A yellow dashed ellipse on the ground shows the **attention zone** (radius from upgrades); on touch devices there is a small toggle to hide it.
- **Asset abstraction (important)**: `assets.ts` exposes `getSprite(id)`; on startup it tries to load `assets/<group>/<id>.png` for every ID listed in a manifest (IDs match `LemonadeKing_ASSETS.md`). If the file is missing it silently falls back to the **procedural drawer** registered for that ID. Each sprite entry has an **anchor** (foot/base point), scale, and optional `flipX`. The renderer never branches on "is it a placeholder". Include a tiny `README` explaining how the owner drops PNGs in.
- **Day-night tint**: soft warm overlay 08–09, none 10–16, orange 17–19, dusk blue ≥ 19:30. **Weather FX**: sun glare (sunny/hot), heat shimmer (hot), clouds + darkening (cloudy), rain streaks + puddle ripples + gloom (rain), flying leaves (wind), cool desaturation (cold).
- Window resize and DPR changes must re-fit the scene without distortion. Hit-testing for taps converts screen → world coordinates by inverting the projection.

# PEDESTRIAN SIMULATION (implement exactly)
**Constants**: `HOUR_SEC = 12.5`, `BASE_STOP_CHANCE = 0.14`, `MAX_QUEUE = 6`, `STAND = (5.5, 3.6)` tile coordinates, `QUEUE_SPOT(i) = (5.5 + 0.65·i, 4.45)`.

**Lanes** (horizontal, along x, every location): `near` lane at `y = 5.5 ± 0.25` (spawn weight 0.65), `far` lane at `y = 8.5 ± 0.25` (weight 0.35). Pedestrians spawn off-map at x = −0.8 or 12.8 (random direction) and walk to the other side, then despawn.

**Spawn rate** (per game hour): `rate = loc.density · loc.hourCurve(hour) · weatherPed(loc) · eventPed`, where `weatherPed = max(0.05, 1 + (weather.ped − 1)·loc.weatherSensitivity)`. Accumulate fractional spawns each update. Pedestrians spawn in **every phase** (ambient life), but are counted and evaluated **only while SELL is active**.

**Types** (`speed` tiles/s at ×1, `scale`, `priceMult` for wallet, `interest`):
| type | speed | scale | priceMult | interest |
|---|---|---|---|---|
| kid | 1.1 | 0.72 | 0.75 | 1.25 |
| adult | 1.2 | 1.0 | 1.10 | 1.0 |
| granny | 0.65 | 0.92 | 0.90 | 0.85 |
| sport | 2.0 | 1.0 | 1.20 | 1.30 |
| tourist | 0.9 | 1.0 | 1.50 | 1.10 |
Each pedestrian gets random speed ±15%, random colours, and `maxPrice = loc.fairPrice · priceMult · rand(0.8, 1.3)` at spawn.

**Attention**: `radius = 2.6 + (banner ? 0.7 : 0) + (speaker && speakerOn ? 2.3 : 0)` tiles from `STAND`. With the speaker the far lane (≈ 5 tiles away) falls inside the radius — this is the visible reward of buying the speaker. The first time a pedestrian enters the radius while SELL is active, they are **evaluated exactly once**:
1. `stopChance = min(0.8, interestChance() · type.interest)`; roll. If fail → keep walking (count `inRange` only).
2. If stopped: if `price > maxPrice` → emote 💸 "Дорого!", keep walking (`tooExpensive++`). Else if `queue.length ≥ MAX_QUEUE` → emote ⏳, keep walking (`queueFull++`). Else join the queue and walk to the next spot (`joined++`); show 🍋/👀 emote.
3. In queue, `patience` (sim seconds) = `rand(18, 30) · (umbrella ? 1.3 : 1)`. When it reaches 0 (and the customer is not being served) → leaves angry 😠, `impatient++`, reputation −0.05.

**Counters (per day)**: `passed` (spawned during SELL), `inRange`, `stopped`, `tooExpensive`, `queueFull`, `joined`, `sold`, `impatient`, plus `outOfRange = passed − inRange` (finalize at day end). Show live in the HUD as a compact funnel: **Пройшло повз → Зупинилось → Купили**, and in the report as the full funnel.

**`interestChance()`** (also returns a list of parts for the "Чому так?" panel; show each as a line "label + effect"):
```
ads    = (sign? .20:0) + (banner? .45:0) + (speaker&&on? .35:0) + (flyers? .25:0)     // additive, max +1.25
chance = BASE_STOP_CHANCE · (1 + ads) · weather.thirst · (umbrella? 1.10:1)
         · (0.85 + 0.06·reputationStars) · (festival? 1.30:1)
```
Clamp to 0.80. Display as a percentage, e.g., "Шанс, що перехожий зупиниться: 18%". Parts to show: base 14%, signs/ads (+X%), weather (×), comfort (×), reputation (×), event (×).

**Serving/satisfaction**: `sat = clamp(0.35 + 0.65·quality − max(0, price/maxPrice − 0.8)·0.3 − (waited/patienceMax)·0.2, 0, 1)`. Emote by sat: ≥0.75 😍, ≥0.5 🙂, else 😝 if too sour or 😐. Reputation delta per served customer = `(sat − 0.55)·0.04`. Reputation is clamped 0–5, starts at **1.0**, shown as stars with a number.

**Locations** (all data-driven):
| id | name | density/h | rent | travel (h) | fairPrice | weatherSensitivity | mix (kid/adult/granny/sport/tourist) | hourCurve | cars |
|---|---|---|---|---|---|---|---|---|---|
| yard | Двір біля дому | 9 | 0 | 0 | 8 | 0.7 | .20/.35/.25/.10/.10 | `<9:0.6, <16:0.9, <19.5:1.5, else 0.8` | yes |
| park | Парк | 22 | 20 | 1 | 10 | 1.0 | .25/.30/.15/.20/.10 | `<10:1.0, <16:1.2, <19:1.3, else 0.7` | no |
| school | Біля школи | 15 | 10 | 1 | 6 | 1.0 | .65/.15/.05/.05/.10 | peaks ×3 at 10–10.5, ×3.5 at 12–13, ×3 at 15–16, otherwise ×0.3 | no |
| beach | Пляж | 28 | 30 | 2 | 12 | 1.8 | .20/.25/.00/.15/.40 | `<10:0.4, <12:1.0, <17:1.8, <19:1.0, else 0.5` | no |
Ground/props per location: **yard** — grass, near sidewalk (y=5), road (y=6–7, cars drive by), far sidewalk (y=8), grandma's house at the back-left, fence pieces, trees, mailbox, lamp. **park** — grass, two paths, fountain, benches, many trees, flower beds. **school** — school building at the back with a flag, paved schoolyard with hopscotch, fence, bike rack, trees. **beach** — water rows at the back (animated shimmer, a bobbing boat), sand, two boardwalk lanes, parasols, palms, lifeguard tower, sandcastle, beach ball. Pass thresholds of expected profits in the unit tests so that **school has the most people but the lowest profit per person**, **beach is the best in hot weather and the worst in rain**, **yard is the safest**.

**Weather** (data): `sunny {ped 1.0, thirst 1.10}`, `hot {1.05, 1.50}`, `cloudy {0.85, 0.80}`, `rain {0.30, 0.60}`, `wind {0.90, 0.85}`, `cold {0.70, 0.50}`. Weights for random days: sunny 35, hot 20, cloudy 20, rain 15, wind 5, cold 5. Scripted: day 1 & 2 sunny, **day 3 rain** (tutorial moment), afterwards random (no more than 2 identical days in a row).

# ECONOMY (starting point — expose in one config file)
- Start: **100 coins**, reputation 1.0, no upgrades, no stock.
- Default pitcher: 4 lemons, 2 water, 2 spoons sugar, 10 cups → cost **34** (3.4/cup). Fair price in yard 8 → profit per cup 4.6.
- Expected result for a sensible day-1 at the yard: ~10–14 cups sold, **profit ≈ 45–70 coins**.
- Stage 1 goal: **600 coins and ≥ 1.5★**. Typical completion: 8–14 days.
- Upgrades:
| id | name | price | effect | taught idea |
|---|---|---|---|---|
| umbrella | Парасолька | 80 | ×1.10 stop chance, patience ×1.3 | comfort invites customers |
| sign | Крейдова табличка | 60 | +20% ads | advertising |
| banner | Банер | 150 | +45% ads, radius +0.7 | bigger advertising, visibility |
| speaker | Колонка | 250 | +35% ads, radius +2.3 (reaches far lane), toggle | sound attracts; reach |
| bike | Велосипед | 300 | market trip 1 h, travel −1 h | time = money |
| juicer_hand | Ручна соковижималка | 120 | −1 lemon per pitcher | efficiency |
| juicer_lever | Механічна соковижималка | 300 | −2 lemons total (requires juicer_hand) | automation |
Also: **flyers** (25 coins/day, +25% ads) bought in the Prepare panel.

# RANDOM EVENTS (data-driven; each shows a card with an image/emoji, 1–2 sentences, optional choice, and a Lemi explanation)
1. **Rain / weather** (see above) — tip about stock planning on day 3.
2. **Bad lemons** (market, 8% for Galya after day 3): 30% of the purchased lemons are rotten. Choice: buy again (another trip) or sell with fewer pitchers. Lesson: check quality; cheap isn't always better.
3. **Cups sold out / supplier late** (market, 12% after day 3): choose supermarket (cups ×2 price) or make fewer pitchers.
4. **Fox thief** (day ≥ 3, 20%/day, random time 11:00–17:00): a fox runs toward the stand; the player has ~5 **real seconds** to tap it. Caught → +10 coins "hero" bonus + Lemi praise. Not caught → loses `min(40, 50% of today's income, coins)`. Lemi explains locks/insurance.
5. **Festival** (day ≥ 4, 10%/day; announced in the morning news): pedestrians ×1.6, stop chance ×1.3. Lesson: prepare more when you know a crowd is coming.
Make the event system generic (conditions, weights, effects, texts) so more events can be added through data only.

# LEMI (mascot / tutor) AND LESSONS
- Lemi is a small lemon character at the bottom-left (CSS-drawn placeholder with eyes and a speech bubble). Tips are shown **once** (flag in the save), one idea per bubble (≤ 2 short sentences, big text), "Зрозуміло!" button, never during a critical action. A "?" button in the HUD re-shows the last tip; a **business glossary** lists concepts already met (profit, cost, demand, advertising, reputation, investment, ...).
- Two reading levels: **"Малюк 6–8"** (shorter text, more emoji, optional read-aloud via the Web Speech API if a Ukrainian voice exists) and **"Підприємець 9–12"** (full text, a few numbers). Store both versions of each tip; the Prepare panel in the young mode hides the numeric formulas.
- **Lesson of the day** (pick the highest-priority one that applies): rain/weak weather → low traffic; spoiled lemons; ran out of cups early (lost customers); too many "too expensive" decisions; negative profit; impatient customers; location comparison; default: profit = income − expenses. Always include a concrete number from *that* day.
- Provided texts (put them into `uk.ts`; translate to `en.ts`):
  - welcome: «Привіт! Я Лемі 🍋 Бабуся дала тобі 100 монет і столик. Заробимо 600 монет і станемо справжніми підприємцями!»
  - morning: «Кожен день починається вранці. Подивись прогноз погоди й обери місце. Різні місця — різна кількість людей!»
  - location: «У парку людей більше, але за місце треба платити. А біля школи багато дітей, проте в них мало монет.»
  - market: «Ринок! Тут купуємо лимони, воду, цукор і стаканчики. Поїздка забирає 2 години, а столик у цей час порожній. Час — це теж гроші!»
  - cheap_lemons: «Дешеві лимони можуть бути зіпсовані. Дешево — не завжди вигідно!»
  - prepare_cost: «Собівартість — це скільки монет ти витратив на одну склянку. Ціна має бути вищою, тоді залишається прибуток.»
  - recipe: «Забагато лимонів — кисло, забагато цукру — приторно. Знайди смачний баланс!»
  - price: «Ціна занадто висока — люди підуть. Занадто низька — заробиш мало. Шукай золоту середину.»
  - sell_start: «Люди ходять постійно, але зупиняється лише невеликий відсоток! Подивись на «Шанс зупинитись». Табличка, банер і колонка збільшують його. Торкнись покупця, щоб налити лимонад!»
  - first_sale: «Перший покупець! Дохід — це гроші, які ти отримав. Прибуток — це дохід мінус витрати.»
  - expensive: «Людина подивилась на ціну й пішла. Для цього місця ціна завелика.»
  - queue: «Довга черга! Люди не люблять чекати — поспішай наливати.»
  - rain: «Іде дощ — людей на вулиці мало. Іноді розумніше купувати менше.»
  - spoiled: «Лимони псуються! Купуй стільки, скільки встигнеш продати.»
  - thief: «Лис-крадько! Швидко торкнись його!»
  - report: «Це звіт дня. Дохід мінус Витрати дорівнює Прибуток. Якщо прибуток менше нуля — витрат було більше, ніж заробітку.»
  - shop: «Апгрейд — це інвестиція: витрачаєш зараз, щоб заробляти більше потім.»
  - stage1_done: «Ти заробив 600 монет! Тепер ти справжній підприємець. Лимонний візок чекає!»

# HUD (during SELL)
Top bar: coins (animated tick-up), day, clock, weather chip, location chip, reputation stars, goal progress bar ("Ціль етапу: 340 / 600"), speed buttons. Right: **funnel card** (counts + "Шанс зупинитись N%" + "Чому так?" expander). Bottom: price stepper, speaker toggle (if owned), cups left (🥛 7/10), queue length, big serve button (min 72×72 px), "Закінчити день". Everything must be operable with one finger.

# QUALITY REQUIREMENTS
- **No console errors**, no layout overflow at 640×360 and 1920×1080, no stuck states when the tab loses focus (pause the sim on `visibilitychange`).
- **Unit tests (Vitest)**: funnel never produces negative stock/coins; `interestChance` parts multiply to the displayed result; spawn rate respects weather sensitivity; location comparison tests from the Locations paragraph; lemon spoilage ageing; save→load round-trip; a **headless 14-day bot simulation** (a simple strategy) that finishes without exceptions and reaches 600 coins in 6–20 days (log the result; tune config if it doesn't).
- **Debug panel** (toggle with backtick or `?debug=1`): force weather/location/day, add coins, run ×10 speed, show RNG seed, dump state.
- Clean, commented-where-needed, typed code; no giant files (> 500 lines) unless unavoidable.
- Provide `README.md`: how to run (`npm i && npm run dev`), build, test, how to drop PNG assets in, how to add a location / upgrade / event / tip / language, and a short "path to Android with Capacitor" section.

# HOW TO WORK
1. First reply **briefly** with your plan: architecture, any deviations from this prompt (with reasons), and the order of work. Ask questions only if something blocks you.
2. Build in small, verifiable steps: (a) iso renderer + ground + one location with walking pedestrians → (b) funnel, stand and selling → (c) day loop and panels → (d) economy, upgrades, events → (e) Lemi, lessons, i18n → (f) all 4 locations, weather and lighting → (g) tests, polish, README.
3. **Run and look at the game** (headless browser screenshots at several sizes and times of day, or a dev server) after each step. Fix visual problems: overlapping UI, misaligned shadows, wrong draw order, unreadable text.
4. Prefer correctness and clarity of the *teaching moments* over feature count. When in doubt, make the cause→effect relation visible (what changed the chance, why the customer left).
5. Finish with: a summary of what works, known limitations, tuning knobs, and 10 concrete suggestions for the next milestone.

# DEFINITION OF DONE (acceptance checklist)
- [ ] `npm run dev` shows the title screen; "Нова гра" starts day 1 at the yard with Lemi's welcome.
- [ ] Day 1 can be completed end-to-end (market → prepare → sell → report → shop → sleep) and the profit shown equals income − expenses exactly.
- [ ] Pedestrians walk continuously in every phase, on both lanes, in all 4 locations; only a minority stops; the funnel counters add up (`stopped = tooExpensive + queueFull + joined`, `joined ≥ sold`).
- [ ] Buying the banner/sign/speaker visibly appears on the stand, raises the displayed chance exactly as in the "Why?" list, and the speaker visibly extends the attention zone to the far lane.
- [ ] Switching location changes the scene, traffic level, price tolerance and costs as specified; the school shows lots of people but they refuse high prices.
- [ ] Weather visibly changes the scene and the numbers; day 3 is rainy.
- [ ] All 5 events can occur and are explained.
- [ ] Unsold lemonade is poured out; lemons spoil after 4 days; both appear in the report with lessons.
- [ ] Reaching 600 coins & 1.5★ shows the stage-complete (demo-end) screen and allows continuing.
- [ ] Save/continue works; reload restores the exact state.
- [ ] UI works on touch (emulated phone landscape 800×360) and mouse; text is Ukrainian by default, English switch works.
- [ ] Replacing a procedural sprite by a PNG with the right ID/path works without code changes (demonstrate with one example, e.g., `assets/props/prop_tree_a.png`).
- [ ] Tests pass; no console errors.

=== END PROMPT ===

---

## Як користуватись
1. Дайте моделі цей промпт + файли `LemonadeKing_GDD.md` і `LemonadeKing_ASSETS.md`.
2. Після першої відповіді з планом перегляньте відхилення від промпту — погоджуйте або відхиляйте.
3. Перші ж результати просіть **показувати скриншотами**; тоді легко скоригувати вигляд ще до генерації PNG.
4. Коли будуть готові PNG, покладіть їх у `public/assets/<група>/<id>.png` — гра підхопить їх автоматично.
5. Наступний промпт (M2): етапи 2–3, працівники, печиво, міні-ігри — я підготую після перевірки M1.
