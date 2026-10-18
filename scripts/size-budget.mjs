// Fails CI if the shell's JS grows past the budget (all shell chunks, gzip).
// Today ~186 KB: React + React DOM + React Router + React Query + the Module
// Federation runtime. Remotes reuse these, so they stay small.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 220;
const dir = resolve(import.meta.dirname, '..', 'dist-web', 'assets');
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
const total = files.reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0) / 1024;
const largest = files
  .map((f) => ({ f, kb: statSync(join(dir, f)).size / 1024 }))
  .sort((a, b) => b.kb - a.kb)
  .slice(0, 3)
  .map((x) => `${x.f} ${x.kb.toFixed(0)} KB`);

console.log(`shell JS (all chunks, gzip): ${total.toFixed(1)} KB / budget ${BUDGET_KB} KB`);
console.log(`largest: ${largest.join(', ')}`);
if (total > BUDGET_KB) {
  console.error('Over budget. Lazy-load the new code or share the dependency.');
  process.exit(1);
}
