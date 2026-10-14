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
