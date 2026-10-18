// Every class in a remote must carry that remote's Tailwind prefix (cat:, cart:, adm:,
// chk:), or it may clash with the shell's CSS. This catches a forgotten prefix
// in className="..." strings and simple template literals.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const prefixes = { catalog: 'cat', cart: 'cart', checkout: 'chk', admin: 'adm' };
let problems = 0;

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
  });

for (const [app, prefix] of Object.entries(prefixes)) {
  for (const file of walk(join(root, 'apps', app, 'src'))) {
    const src = readFileSync(file, 'utf8');
    const strings = [...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2]);
    // also the quoted class lists inside ternaries in template literals
    strings.push(...[...src.matchAll(/'((?:[a-z-]+:)?[a-z][\w:/.[\]-]*(?: [\w:/.[\]-]+)*)'/g)].map((m) => m[1]).filter((s) => s.includes(`${prefix}:`)));
    for (const s of strings) {
      for (const cls of s.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(Boolean)) {
        if (!cls.startsWith(`${prefix}:`)) {
          console.error(`${file.replace(root + '/', '')}: class "${cls}" needs the "${prefix}:" prefix`);
          problems++;
        }
      }
    }
  }
}
if (problems) process.exit(1);
console.log('CSS prefixes OK');
