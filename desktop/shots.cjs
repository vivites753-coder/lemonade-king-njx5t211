// Pictures of the game for its Steam page (docs/STEAM.md), 1920x1080: electron desktop --shots=<folder> [--lang=en]
// Not part of the installed game. Every scene is set up through the game's own objects (window.LK, as in the
// browser console), played for a while so that people walk and buy, then photographed.
const fs = require('node:fs');
const path = require('node:path');

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

// helpers in the page: a ready-made game, the cards closed, a selling day played for a while
const PRELUDE = `
  const g = LK.game, ui = LK.ui, r = LK.renderer;
  const ok = () => { for (let k = 0; k < 5; k++) document.querySelectorAll('#modal button, #lemi [data-lemi="ok"]').forEach((b) => b.click()); };
  const fresh = (lang, rep) => {
    g.newGame({ name: 'Lemonade King', cheat: true, ageMode: 'pro', avatar: 'girl', lang, seed: 7 });
    ui.setLang(lang);
    g.S.coins = 2400;
    g.S.rep = rep;
    g.S.bestRep = rep;
    ok();
  };
  const play = (n) => { for (let i = 0; i < n; i++) { g.update(0.05); if (!g.serving && !g.making) g.serve(); } };
  const sell = (loc, ups, o) => {
    for (const id of ups) g.S.upgrades[id] = true;
    g.chooseLocation(loc);
    if (o.weather) g.D.weather = o.weather;
    g.D.cupsReady = 40;
    g.S.stock.cups = 80;
    g.setPhase('prepare');
    if (o.helpers) g.D.helpers = o.helpers;
    g.startSelling();
    ok();
    ui.userPaused = false;
    g.paused = false;
    g.setSpeed(1);
    play(o.warm || 600);
    ok();
    r.user = { z: o.z || 1, x: o.x || 0, y: o.y || 0 };
  };
`;

/** The scenes: what each one sets up (in the page, with LANG) and how long it then plays before the picture. */
const SCENES = [
  { name: '01-park', setup: `fresh(LANG, 2.6); sell('park', ['umbrella', 'sign', 'banner', 'cooler', 'speaker', 'juicer_hand'], { weather: 'sunny', helpers: 1, z: 1.25 });` },
  { name: '02-beach', setup: `fresh(LANG, 3.4); sell('beach', ['umbrella', 'tent', 'sign', 'banner', 'mascot', 'big_stand', 'cooler', 'dispenser'], { weather: 'hot', helpers: 2 });` },
  {
    name: '03-store',
    setup: `fresh(LANG, 4.3); g.S.coins = 9000; g.openStore('townhall'); g.setCleaner('townhall', true);
      sell('townhall', ['store_tables', 'store_neon', 'store_terminal', 'store_ac'], { weather: 'sunny', warm: 900, z: 1.2 });`,
  },
  { name: '04-morning', setup: `fresh(LANG, 2.2); g.setPhase('morning'); ok();`, wait: 2500 },
  { name: '05-market', setup: `fresh(LANG, 2.2); g.chooseLocation('park'); g.goMarket(); g.addPitcherKit(); g.addPitcherKit(); ok();`, wait: 2500 },
  { name: '06-kitchen', setup: `fresh(LANG, 2.2); g.chooseLocation('park'); g.goMarket(); g.addPitcherKit(); g.addPitcherKit(); g.pay(); ok();`, wait: 3500 },
  { name: '07-mall', setup: `fresh(LANG, 3.2); sell('mall', ['sign', 'banner', 'mascot', 'big_stand', 'tv', 'speaker'], { helpers: 1, warm: 800 });` },
  { name: '08-report', setup: `fresh(LANG, 2.4); sell('busstop', ['umbrella', 'sign', 'banner'], { weather: 'sunny', warm: 1500 }); g.endDay(); ok();`, wait: 3000 },
];

async function takeShots(win, dir, lang) {
  const wc = win.webContents;
  await new Promise((res) => wc.once('did-finish-load', res));
  // the pictures load
  await wait(4000);
  fs.mkdirSync(dir, { recursive: true });
  for (const s of SCENES) {
    try {
      await wc.executeJavaScript(`(() => { const LANG = ${JSON.stringify(lang)}; ${PRELUDE} ${s.setup} })()`);
    } catch (e) {
      process.stdout.write(`SHOT ${s.name} failed: ${e.message}\n`);
      continue;
    }
    await wait(s.wait ?? 4000);
    const img = await wc.capturePage();
    const file = path.join(dir, `${s.name}.png`);
    fs.writeFileSync(file, img.toPNG());
    const { width, height } = img.getSize();
    process.stdout.write(`SHOT ${s.name} ${width}x${height}\n`);
  }
}

module.exports = { takeShots };
