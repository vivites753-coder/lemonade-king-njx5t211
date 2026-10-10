# 🍋 Lemonade King — HTML5 prototype (M1)

A kids' (6–12) business simulator: run a lemonade stand, choose a location and a price, watch pedestrians walk by — only some stop — and learn income, expenses, profit, demand, advertising, risk and more.

## Як запустити (UA)

| Що хочу | Що робити |
|---|---|
| **Просто пограти** | Двічі клацнути **`Lemonade King.html`**. Це один файл з усією грою: працює без інтернету й без встановлень, його можна скопіювати куди завгодно (на робочий стіл, флешку, відправити на інший комп'ютер). Прогрес зберігається в браузері. |
| **Оновити цей файл** після змін у коді або нових PNG у `assets/` | Двічі клацнути **`Оновити гру.bat`**: збирає гру заново й відкриває її. |
| **Розробляти** (зміни видно одразу) | Двічі клацнути **`Режим розробки.bat`**: запускає сервер і відкриває браузер. Щоб зупинити, закрийте чорне вікно. |

Для `.bat`-файлів потрібен Node.js (уже встановлено). Для гри в `Lemonade King.html` нічого не потрібно.

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # unit tests + headless bot balance check
npm run build      # production build into dist/ (demo edition)
npm run build:full # full edition flag
npm run build:play # one self-contained file: "Lemonade King.html" (images inlined)
```

Requires Node.js 20+.

## What is in M1

* Full day loop: **Morning → Market → Prepare → Sell → Report → Shop → Sleep**, saved locally after every phase.
* Isometric diorama with **4 locations** (yard, park, school, beach), living pedestrians on two lanes, cars, weather (sun, heat, clouds, rain, wind, chill), day/evening light.
* **Pedestrian funnel**: walked by → noticed (attention zone) → stopped (chance %) → agreed to the price (wallet) → bought. Live counters + "Why?" breakdown + report funnel.
* 7 upgrades that visibly appear on the stand (sign, umbrella, banner, speaker, bike, two juicers) + daily flyers.
* 5 random events (festival, thief, sugar price hike, cups sold out, rotten lemons) + rain day 3 + grandma's safety net.
* Lemi tips (two reading levels), lesson of the day, business glossary, Ukrainian + English. No synthesized voice (browser text-to-speech was removed: it sounded wrong); a recorded voice can be added later.
* Settings with a parental gate, demo/full flag, debug panel.

## Controls

Tap a customer (or anywhere on the scene) / **Space** — pour · **N** — new pitcher · **P** — pause · **1/2/3** — speed · **`** — debug panel (or open with `?debug=1`).

## Project layout

```
src/core      config (all balance numbers), RNG, event bus, save/load
src/data      locations (maps, decor, traffic), goods, upgrades, weather, pedestrian types, events, glossary
src/sim       game controller (day loop), street (pedestrians, queue, thief), economy formulas, traffic, lessons
src/render    isometric renderer, ground cache, weather fx, asset manager + procedural drawers (render/proc)
src/ui        HUD, panels (one per phase), Lemi/cards/modals queue, debug panel
src/i18n      uk.ts (main), en.ts (must contain every key — a test checks it)
tests         Vitest: economy, traffic, day loop invariants, safety nets, i18n, headless bot (balance)
assets        drop PNG art here (see assets/README.md)
```

The simulation (`src/sim`) has no DOM access, so it runs headless in tests.

## Replacing the placeholder art

Put `assets/<any-folder>/<asset-id>.png` (IDs from `LemonadeKing_ASSETS.md`). It is picked up automatically; tune size/anchor in `src/render/spriteMeta.ts`. Stand layers used by the code: `stand_table`, `stand_chair`, `stand_umbrella`, `stand_sign`, `stand_banner`, `stand_speaker`, `stand_bike`, `stand_flyers`, `stand_juicer_hand`, `stand_juicer_lever`, `item_pitcher`, `item_cups_pack`, `item_lemon_pile`. Characters: `char_<kind>_<a|b|c>_<front|back>`, `char_player_<boy|girl>_front`, `char_fox_front`.

## How to add content

* **Location**: add an entry to `src/data/locations.ts` (map rows, decor, density, rent, fair price, hour curve) + texts `loc.<id>.*` in both languages.
* **Upgrade**: `src/data/upgrades.ts` + `up.<id>.*` texts; draw it in `render/proc/stand.ts`.
* **Event**: `src/data/events.ts` + handling in `sim/randomEvents.ts` / `sim/game.ts` + `card.<id>.*` texts.
* **Tip**: call `this.tip('<key>')` in the simulation + `tip.<key>` (and optional `tip.<key>.kid`) texts.
* **Language**: copy `src/i18n/en.ts`, translate, register in `src/i18n/index.ts`.

## Balance (tuned with the headless bot)

Base stop chance 18% (the GDD draft had 14%; raised so day 1 at the yard earns ~45–70 coins). Densities per hour: yard 14, park 26, school 24 (×3 during breaks, ×0.35 otherwise), beach 34. Reputation grows slowly and falls fast. A sensible player reaches stage 1 (600 coins, 1.5★) in about 7–12 days. All numbers live in `src/core/config.ts` and `src/data/*`.

## Path to Android (Capacitor)

The build uses relative URLs (`base: './'`), no network requests and no web fonts, so it can be wrapped as is:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Lemonade King" com.example.lemonadeking --web-dir dist
npm run build
npx cap add android
npx cap sync android
npx cap open android   # build the signed AAB in Android Studio
```

Lock the orientation to landscape in `AndroidManifest.xml`, add an app icon and a splash screen, then go through Google Play's Families policy, Data safety form and closed testing.
