// What the Windows app offers the game (src/desktop.ts reads it as window.lkDesktop). Only these few calls cross over
// from the page to the app: the game itself runs like the website.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lkDesktop', {
  /** { steam, version, update }: the Steam copy or the one from GitHub, its version, a downloaded update (or null). */
  info: () => ipcRenderer.invoke('lk:info'),
  /** A new version has been downloaded (its number). */
  onUpdate: (cb) => {
    ipcRenderer.on('lk:update', (_e, version) => cb(version));
  },
  /** Installs the downloaded version and starts the game again. */
  installUpdate: () => ipcRenderer.send('lk:install'),
  /** The whole screen or a window. */
  toggleFullscreen: () => ipcRenderer.send('lk:fullscreen'),
  quit: () => ipcRenderer.send('lk:quit'),
});
