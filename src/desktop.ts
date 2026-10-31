// The game inside the Windows app (Electron, see docs/DESKTOP.md): what desktop/preload.cjs offers it as
// window.lkDesktop. The website and the Android app have no such bridge.

export interface DesktopBridge {
  /** The Steam copy or the one from GitHub, its version, and a downloaded update waiting to be installed. */
  info(): Promise<{ steam: boolean; version: string; update: string | null }>;
  onUpdate(cb: (version: string) => void): void;
  /** Installs the downloaded version and starts the game again. */
  installUpdate(): void;
  toggleFullscreen(): void;
  quit(): void;
}

export function desktopApp(): DesktopBridge | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { lkDesktop?: DesktopBridge }).lkDesktop ?? null;
}

/** True inside the Windows app. */
export function isDesktopApp(): boolean {
  return desktopApp() !== null;
}

/** A new version of the Windows app has been downloaded: `offer` shows it (its tap installs it and starts again). */
export function watchDesktopUpdates(offer: (install: () => void) => void): void {
  const d = desktopApp();
  if (!d) return;
  const show = () => offer(() => d.installUpdate());
  d.onUpdate(show);
  // it may have come before the game was ready
  void d
    .info()
    .then((i) => i.update && show())
    .catch(() => undefined);
}
