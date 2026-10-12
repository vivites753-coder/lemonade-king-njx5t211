import { defineConfig } from 'vitest/config';

// base './' keeps all asset URLs relative, which Capacitor (Android) needs.
// Mode "single" (npm run build:play) inlines every image so the whole game fits in one HTML file.
export default defineConfig(({ mode }) => ({
  base: './',
  // a new id for every build: published updates start with clean saves (see wipeOnUpdate)
  define: {
    __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA ?? `local-${Date.now()}`),
  },
  server: { host: '127.0.0.1', port: 5173 },
  build: {
    target: 'es2020',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 0,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
