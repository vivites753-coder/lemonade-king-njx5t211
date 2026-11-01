# Lemonade King у Steam: покроковий план

Що вже готово в проєкті: Windows-версія з копією для Steam (вона не оновлюється сама, це робить Steam, див.
[DESKTOP.md](DESKTOP.md)), скрипт відправки збірки `steam/upload.bat`, 16 знімків екрана 1920×1080 (`art/steam/screenshots`,
українською й англійською), значки (`art/steam`), чернетки текстів сторінки (нижче). Решту робите ви на сайті Steamworks:
там гроші, документи й ваш вхід.

Перевірено 31.10.2026 на сторінках Steamworks (partner.steamgames.com: Steam Direct, Store Graphical Assets).

## 1. Акаунт розробника (15–30 днів)

1. Звичайний акаунт Steam з увімкненим Steam Guard (мобільний автентифікатор).
2. <https://partner.steamgames.com> → «Join Steamworks»: підписати угоду, ввести дані.
3. **Внесок Steam Direct — $100 за кожну гру.** Його не повертають, але віддають з виплат, коли гра заробить $1000.
4. Банківські реквізити (ім'я власника рахунку — як у паспорті), податкова анкета (для фізособи не з США — форма W-8BEN,
   анкета сама визначить ставку податку США) і перевірка особи. На це йде 15–30 днів.

## 2. Обмеження для першої гри

- Реліз — не раніше ніж через **30 днів після оплати** внеску.
- Сторінка «Незабаром» (Coming soon) має бути видимою щонайменше **2 тижні** до релізу.
- Valve перевіряє сторінку й збірку: по 1–5 днів кожну.

## 3. Гра в Steamworks

1. Після оплати Steamworks створить гру і дасть її номер — **App ID** (наприклад 3456780).
2. App Admin → SteamPipe → Depots: депо для Windows, його номер — **Depot ID** (зазвичай App ID + 1).
3. Installation → General Installation → Launch Options: Executable `Lemonade King.exe`, Operating System Windows,
   CPU Architecture 64-bit. Натисніть Publish (вкладка Publish угорі).
4. Впишіть обидва номери у `steam/app_build.vdf` замість `0000000` і `0000001` (один раз).

## 4. Відправити збірку

1. Подвійний клік на `steam\upload.bat`. Він сам завантажить SteamCMD від Valve і останню збірку гри для Steam з GitHub.
2. Введіть логін Steamworks; пароль і код Steam Guard SteamCMD спитає у своєму вікні (більше їх ніде не вводьте).
3. Steamworks → SteamPipe → Builds: нова збірка з'явиться в списку. Для перевірки зробіть її робочою на гілці `beta`
   (Set build live), а коли все добре — на `default`.
4. Перевірка: у бібліотеці Steam на своєму ПК встановіть гру й запустіть (до релізу її бачите тільки ви).

Після кожного оновлення гри: дочекайтеся збірки на GitHub (реліз Windows (latest)) і знову запустіть `upload.bat`.

## 5. Сторінка в магазині

| Поле | Що вписати |
|---|---|
| Назва | Lemonade King |
| Жанри | Casual, Simulation |
| Мітки (tags) | Casual, Simulation, Management, Economy, Educational, Family Friendly, Cute, Isometric, Singleplayer, Relaxing |
| Мови | Українська, English, Română: інтерфейс і субтитри (озвучення немає) |
| Керування | мишка (клік, колесо, права кнопка), сенсорний екран |
| Ціна | безкоштовно або платно: вирішуєте ви (Steam бере 30%) |
| Вікова анкета | без жорстокості, без чатів і покупок у грі |

**Системні вимоги:** Windows 10 або 11 (64-bit); процесор 2 ГГц, 2 ядра; 4 ГБ пам'яті; відео з DirectX 11 (підійде
вбудоване); 600 МБ на диску.

### Короткий опис (до 300 знаків)

> Стань Королем Лимонаду! Відкрий кіоск, купуй лимони на ринку, готуй лимонад за своїм рецептом і продавай перехожим.
> Рахуй гроші, плануй закупи, наймай помічників і збудуй мережу кіосків і власний магазин. Гра-тренажер підприємця
> для дітей.

> Become the Lemonade King! Open a stand, buy lemons at the market, mix your own recipe and sell to passers-by. Count
> your money, plan your shopping, hire helpers and grow a chain of stands and your own store. A business game for
> kids.

### Про гру

> **Ранок.** Обери місце, купи на ринку лимони, цукор і стаканчики, приготуй лимонад на кухні.
> **День.** Продавай: наливай вчасно, не тримай чергу, стеж за ціною й погодою.
> **Вечір.** Подивись звіт дня — дохід, витрати, прибуток — і купи покращення: парасольку, вивіску, колонку, намет.
>
> Щасливі покупці підіймають репутацію, а вона відкриває нові місця: парк, пляж, вокзал, торговий центр, автобусну
> зупинку — і власний магазин зі столиками, меню й прибиральницею. Найми продавців у свої кіоски, купуй гуртом, лови
> лиса-злодія і шукай кота Мурчика.
>
> Гра вчить рахувати гроші, планувати й думати як підприємець — без реклами й покупок у грі.

> **Morning.** Pick a place, buy lemons, sugar and cups at the market, make lemonade in the kitchen.
> **Day.** Sell: pour on time, keep the queue short, watch the price and the weather.
> **Evening.** Read the day's report — income, costs, profit — and buy upgrades: an umbrella, a sign, a speaker, a tent.
>
> Happy customers raise your reputation, and it opens new places: the park, the beach, the station, the mall, the bus
> stop — and your own store with tables, a menu and a cleaner. Hire sellers for your stands, buy wholesale, catch the
> thieving fox and find Murchyk the cat.
>
> The game teaches kids to count money, plan ahead and think like an entrepreneur — no ads, no in-game purchases.

## 6. Картинки для сторінки

| Що | Розмір | Стан |
|---|---|---|
| Знімки екрана (щонайменше 5) | 1920×1080 | ✅ `art/steam/screenshots/uk` і `en` (8 + 8) |
| Значок ярлика | 256×256 (.ico або .png) | ✅ `art/steam/shortcut_icon_256.png` |
| Значок спільноти | 184×184 (.jpg) | ✅ `art/steam/community_icon_184.jpg` |
| Header capsule | 920×430 | ✅ `art/steam/store/header_capsule_920x430.jpg` |
| Small capsule | 462×174 | ✅ `art/steam/store/small_capsule_462x174.jpg` |
| Main capsule | 1232×706 | ✅ `art/steam/store/main_capsule_1232x706.jpg` |
| Vertical capsule | 748×896 | ✅ `art/steam/store/vertical_capsule_748x896.jpg` |
| Library capsule | 600×900 | ✅ `art/steam/store/library_capsule_600x900.jpg` |
| Library header | 920×430 | ✅ `art/steam/store/library_header_920x430.jpg` |
| Library hero | 3840×1240, PNG | ✅ `art/steam/store/library_hero_3840x1240.png` |
| Library logo | 1280 в ширину та/або 720 у висоту, PNG з прозорим фоном | ✅ `art/steam/store/library_logo.png` |
| Фон сторінки | 1438×810 | ✅ `art/steam/store/page_background_1438x810.jpg` |
| Трейлер | відео | за бажанням, але дуже допомагає |

Правила Steam: на капсулах **лише логотип гри й малюнок**, жодного іншого тексту; на Library hero — малюнок без
логотипа (логотип Steam кладе зверху сам). Усе це робить `python tools/make_store_art.py` з ключових малюнків
`art/steam/keyart_wide.jpg`, `keyart_tall.jpg` і логотипа `logo.png` (промпти: docs/ART_PROMPTS.md); там же банер
Google Play `google_play_feature_1024x500.jpg`.

Знімки екрана можна зробити знову (після змін у грі): `electron desktop --shots=<папка> --lang=uk` (див. DESKTOP.md).

## 7. Пізніше (за бажанням)

- **Steam Cloud** — збереження в хмарі: гра має зберігати прогрес у файл (зараз — у сховище браузера всередині програми).
- **Досягнення** — через Steamworks API (окремий модуль для Electron).
- **Steam Deck**: дотик і мишка працюють; для позначки «Verified» потрібне ще керування геймпадом.
- Діти до 13 років грають через сімейну групу Steam (Steam Families), де батьки створюють їм дитячі акаунти.
