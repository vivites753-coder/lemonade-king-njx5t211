import type { CapacitorConfig } from '@capacitor/cli';

// The Android app: the built game (dist) inside a full-screen WebView, see docs/ANDROID.md.
const config: CapacitorConfig = {
  // the app's permanent id on phones and in Google Play (can still be changed before the first upload to Play)
  appId: 'io.github.vivites753coder.lemonadeking',
  appName: 'Lemonade King',
  webDir: 'dist',
  android: {
    // the saves live in the WebView's storage of https://localhost: keep that address for good
    // (another scheme or host would start the players with no saves)
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    // the Android 12+ splash: the app icon on the game's sky colour
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
