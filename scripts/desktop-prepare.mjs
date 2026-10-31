// Copies the built game (dist, made by "npm run build") into the Windows app (desktop/game), see docs/DESKTOP.md.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'dist');
const to = join(root, 'desktop', 'game');
if (!existsSync(join(from, 'index.html'))) {
  console.error('No game in dist: run "npm run build" first.');
  process.exit(1);
}
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
console.log('the game is in desktop/game');
