// The Windows version of the game (Electron, see docs/DESKTOP.md): one window with the game in it (the same files as
// the website, copied to desktop/game by scripts/desktop-prepare.mjs). The copy installed from GitHub updates itself
// from the "Windows (latest)" release; the Steam copy (a file named "steam" in its resources) is updated by Steam.
const { app, BrowserWindow, ipcMain, Menu, net, protocol, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const GAME_DIR = path.join(__dirname, 'game');
const STEAM = app.isPackaged && fs.existsSync(path.join(process.resourcesPath, 'steam'));
// --smoke: loads the game without a window, prints what it found and quits (a check for the build)
const SMOKE = process.argv.includes('--smoke');
// --check-update: no window; looks for a new version, downloads it (without installing), prints what happened
const CHECK_UPDATE = process.argv.includes('--check-update');
// --shots=<folder> [--lang=en]: pictures of the game for the Steam page, 1920x1080, without a window (see shots.cjs)
const SHOTS = (process.argv.find((a) => a.startsWith('--shots=')) ?? '').slice('--shots='.length);
const QUIET = SMOKE || !!SHOTS;

// the game is served as app://game/..., not from file:// (scripts, fetch and the saves work as on the website)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// one copy of the game at a time: a second start brings the open one to the front
if (!QUIET && !CHECK_UPDATE && !app.requestSingleInstanceLock()) app.quit();

/** @type {BrowserWindow | null} */
let win = null;
/** The version that has been downloaded and waits to be installed (shown in the game as "a new version"). */
let updateReady = null;

const prefsFile = () => path.join(app.getPath('userData'), 'window.json');
function readPrefs() {
  try {
    return JSON.parse(fs.readFileSync(prefsFile(), 'utf8'));
  } catch {
    return {};
  }
}
function writePrefs(patch) {
  try {
    fs.writeFileSync(prefsFile(), JSON.stringify({ ...readPrefs(), ...patch }));
  } catch {
    /* a read-only profile: the window simply starts the default way */
  }
}

function serveGame() {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(GAME_DIR, decodeURIComponent(pathname)));
    if (!file.startsWith(GAME_DIR)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

function createWindow() {
  const prefs = readPrefs();
  win = new BrowserWindow({
    // (the pictures for Steam are 1920x1080)
    width: SHOTS ? 1920 : 1280,
    height: SHOTS ? 1080 : 720,
    useContentSize: true,
    minWidth: 960,
    minHeight: 540,
    // like a game: the whole screen, until the player picks a window (F11, Alt+Enter or the settings)
    fullscreen: !QUIET && prefs.fullscreen !== false,
    show: false,
    backgroundColor: '#bfe6ff',
    // (the icon is the one of Lemonade King.exe, desktop/build/icon.ico)
    title: 'Lemonade King',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
      // the pictures are taken from a page drawn without a window
      offscreen: !!SHOTS,
    },
  });
  Menu.setApplicationMenu(null);
  if (!QUIET) win.once('ready-to-show', () => win.show());
  win.loadURL('app://game/index.html');
  // links open in the browser, never in the game's window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('app://')) return;
    e.preventDefault();
    if (/^https?:/.test(url)) void shell.openExternal(url);
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      e.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
  });
  win.on('enter-full-screen', () => writePrefs({ fullscreen: true }));
  win.on('leave-full-screen', () => writePrefs({ fullscreen: false }));
  win.on('closed', () => {
    win = null;
  });
}

/** The copy from GitHub: looks for a new version now and every 4 hours, downloads it, and tells the game; it is
 * installed when the player taps "Update" in the game or when the game is closed. */
function setupUpdates() {
  if (STEAM || !app.isPackaged || QUIET) return null;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', (info) => {
    updateReady = info.version;
    win?.webContents.send('lk:update', info.version);
  });
  // offline or GitHub is away: the next check tries again
  autoUpdater.on('error', () => undefined);
  const check = () => void autoUpdater.checkForUpdates().catch(() => undefined);
  check();
  setInterval(check, 4 * 60 * 60 * 1000);
  return autoUpdater;
}

/** --check-update: what the updater of this copy finds on GitHub (for checking the releases). */
function checkUpdateOnly() {
  const say = (s) => process.stdout.write(`UPDATE ${s}\n`);
  if (STEAM) {
    say('steam copy: Steam updates it');
    return app.exit(0);
  }
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  let shown = -10;
  autoUpdater.on('checking-for-update', () => say(`checking (this is ${app.getVersion()})`));
  autoUpdater.on('update-not-available', () => {
    say('none: this is the newest');
    app.exit(0);
  });
  autoUpdater.on('update-available', (i) => say(`found ${i.version}, downloading`));
  autoUpdater.on('download-progress', (p) => {
    if (p.percent - shown < 10) return;
    shown = p.percent;
    say(`${Math.round(p.percent)}%`);
  });
  autoUpdater.on('update-downloaded', (i) => {
    say(`downloaded ${i.version}: it would be installed now`);
    app.exit(0);
  });
  autoUpdater.on('error', (e) => {
    say(`error: ${e && e.message ? e.message.split('\n')[0] : e}`);
    app.exit(1);
  });
  void autoUpdater.checkForUpdates();
  setTimeout(() => {
    say('timeout');
    app.exit(1);
  }, 10 * 60 * 1000);
}

async function smokeTest() {
  const wc = win.webContents;
  await new Promise((res) => wc.once('did-finish-load', res));
  await new Promise((res) => setTimeout(res, 4000));
  // one picture and one sound of the game, loaded the way the game loads them
  const files = fs.readdirSync(path.join(GAME_DIR, 'assets'));
  const pic = files.find((f) => f.endsWith('.webp'));
  const snd = files.find((f) => f.endsWith('.ogg'));
  const report = await wc.executeJavaScript(`(async () => {
    const lk = window.LK;
    let errors = [];
    try {
      errors = JSON.parse(localStorage.getItem('lemonadeKing.errors') || '[]').map((e) => e.where + ': ' + e.msg);
    } catch {}
    const picture = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i.naturalWidth);
      i.onerror = () => res(-1);
      i.src = './assets/${pic}';
    });
    const sound = await fetch('./assets/${snd}').then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? b.byteLength : -1), () => -1);
    return {
      title: document.title,
      game: !!lk && typeof lk.game === 'object',
      phase: lk ? lk.game.phase : null,
      desktop: !!window.lkDesktop,
      canvas: !!document.querySelector('canvas'),
      picture,
      sound,
      errors,
    };
  })()`);
  process.stdout.write(`SMOKE ${JSON.stringify(report)}\n`);
  app.exit(report.game && report.desktop && report.picture > 0 && report.sound > 0 && !report.errors.length ? 0 : 1);
}

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  if (CHECK_UPDATE) return checkUpdateOnly();
  serveGame();
  const updater = setupUpdates();
  ipcMain.handle('lk:info', () => ({ steam: STEAM, version: app.getVersion(), update: updateReady }));
  ipcMain.on('lk:quit', () => app.quit());
  ipcMain.on('lk:fullscreen', () => win?.setFullScreen(!win.isFullScreen()));
  ipcMain.on('lk:install', () => {
    // silent: the installer of the new version runs without questions and starts the game again
    if (updater && updateReady) updater.quitAndInstall(true, true);
  });
  createWindow();
  if (SMOKE) void smokeTest();
  if (SHOTS) {
    const lang = (process.argv.find((a) => a.startsWith('--lang=')) ?? '--lang=uk').slice('--lang='.length);
    void require('./shots.cjs')
      .takeShots(win, path.resolve(SHOTS), lang)
      .then(() => app.exit(0), (e) => {
        process.stdout.write(`SHOTS failed: ${e.message}
`);
        app.exit(1);
      });
  }
});

app.on('window-all-closed', () => app.quit());
