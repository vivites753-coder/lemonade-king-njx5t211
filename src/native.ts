// The game inside the Android app (Capacitor, see docs/ANDROID.md). The website does not load the plugins.
import { Capacitor } from '@capacitor/core';

/** True inside the Android app, false on the website. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export interface NativeHooks {
  /** Closes the window or tip on top; false when nothing was open. */
  closeTop(): boolean;
  /** Asks before the app is closed (the game is paused meanwhile). */
  confirmExit(onYes: () => void): void;
  /** The app went to the background: pause the day. */
  pause(): void;
}

/** The phone's Back button closes the window on top, or asks whether to leave the game. */
export async function initNativeApp(hooks: NativeHooks): Promise<void> {
  if (!isNativeApp()) return;
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', () => {
    if (hooks.closeTop()) return;
    hooks.confirmExit(() => void App.exitApp());
  });
  await App.addListener('pause', () => hooks.pause());
}

/** A fast pulsing buzz of the phone (the mixer runs): a pulse every BUZZ_MS. Stops with stopBuzz, by itself after
 * BUZZ_MAX_MS. In the app through the Haptics plugin, on the website through the browser (Android only). */
const BUZZ_PULSE_MS = 25;
const BUZZ_MS = 80;
const BUZZ_MAX_MS = 5000;
let buzzGen = 0;
let buzzTimer = 0;

export function startBuzz(): void {
  stopBuzz();
  const gen = buzzGen;
  if (isNativeApp()) {
    void import('@capacitor/haptics').then(({ Haptics }) => {
      // the mixer may have stopped while the plugin was loading
      if (gen !== buzzGen) return;
      const started = Date.now();
      const pulse = () => {
        if (Date.now() - started > BUZZ_MAX_MS) return stopBuzz();
        void Haptics.vibrate({ duration: BUZZ_PULSE_MS }).catch(() => undefined);
      };
      pulse();
      buzzTimer = window.setInterval(pulse, BUZZ_MS);
    });
    return;
  }
  if (typeof navigator.vibrate !== 'function') return;
  const pattern: number[] = [];
  for (let t = 0; t < BUZZ_MAX_MS; t += BUZZ_MS) pattern.push(BUZZ_PULSE_MS, BUZZ_MS - BUZZ_PULSE_MS);
  navigator.vibrate(pattern);
}

export function stopBuzz(): void {
  buzzGen++;
  clearInterval(buzzTimer);
  buzzTimer = 0;
  if (!isNativeApp() && typeof navigator.vibrate === 'function') navigator.vibrate(0);
}

/** Saves a text file through the phone's share sheet (Files, Drive, a messenger…): downloads do not work in the app. */
export async function shareTextFile(name: string, text: string): Promise<boolean> {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const file = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, files: [file.uri] });
    return true;
  } catch {
    // the player closed the share sheet, or the phone could not share
    return false;
  }
}
