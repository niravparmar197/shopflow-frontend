// Puts the 4 builds into ONE folder, the same layout production serves:
//   dist-web/                 shell (index.html, assets/, mfe-manifest.json)
//   dist-web/mfe/<remote>/    each remote (remoteEntry.js, assets/)
import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist-web');
const remotes = ['catalog', 'cart', 'checkout'];

rmSync(out, { recursive: true, force: true });
for (const app of ['shell', ...remotes]) {
  const dist = resolve(root, 'apps', app, 'dist');
  if (!existsSync(dist)) throw new Error(`Missing ${dist}: build ${app} first`);
}
cpSync(resolve(root, 'apps/shell/dist'), out, { recursive: true });
for (const r of remotes) cpSync(resolve(root, 'apps', r, 'dist'), resolve(out, 'mfe', r), { recursive: true });
console.log(`assembled ${out}`);
