// Turns the Vite build in dist-single/ into ONE self-contained file: "Lemonade King.html".
// It opens with a double click (file://), works offline and needs no server or Node.js to play.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist-single');
const out = join(root, 'Lemonade King.html');

let html = readFileSync(join(dist, 'index.html'), 'utf8');

// <script type="module" crossorigin src="./assets/index-xxx.js"></script> → inline module
html = html.replace(/<script\b[^>]*\bsrc="\.?\/?([^"]+\.js)"[^>]*><\/script>/g, (_, src) => {
  const js = readFileSync(join(dist, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});

// <link rel="stylesheet" href="./assets/index-xxx.css"> → <style>
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*\bhref="\.?\/?([^"]+\.css)"[^>]*>/g, (_, href) => {
  return `<style>${readFileSync(join(dist, href), 'utf8')}</style>`;
});

// modulepreload hints are useless once everything is inline
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '');

if (/(src|href)="\.?\/?assets\//.test(html)) {
  console.error('✗ Some files are still referenced from assets/ — the single file would be incomplete.');
  process.exit(1);
}

writeFileSync(out, html);
rmSync(dist, { recursive: true, force: true });
console.log(`✓ ${out} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
