import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { npmPack, today, writeVendor } from './common.ts';

// Lucide publishes aliases only as PascalCase re-exports (`AlarmCheck` for `alarm-clock-check`),
// so kebab aliases are derived and kept only when the same derivation reproduces the canonical name.
const toKebab = (pascal: string) =>
  pascal
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

export function fetchLucide() {
  const lib = npmPack('lucide');
  const tagsPkg = npmPack(`lucide-static@${lib.version}`);
  const tags: Record<string, string[]> = JSON.parse(readFileSync(join(tagsPkg.dir, 'tags.json'), 'utf8'));
  const names = Object.keys(tags);
  const known = new Set(names);

  const aliases: Record<string, string> = {};
  const exports = readFileSync(join(lib.dir, 'dist/esm/iconsAndAliases.mjs'), 'utf8');
  for (const match of exports.matchAll(/export \{ (.+?) \} from '\.\/icons\/(.+?)\.mjs';/g)) {
    const canonical = match[2];
    const exported = [...match[1].matchAll(/default as (\w+)/g)].map((m) => m[1]);
    const consistent = exported.some((p) => toKebab(p) === canonical);
    if (!consistent) continue;
    for (const alias of exported.map(toKebab)) {
      if (alias !== canonical && !known.has(alias)) aliases[alias] = canonical;
    }
  }

  writeVendor(
    {
      library: 'lucide',
      version: lib.version,
      fetched: today(),
      source: `npm:lucide@${lib.version} (dist/esm/iconsAndAliases.mjs), npm:lucide-static@${lib.version} (tags.json)`,
      names,
      aliases,
    },
    { library: 'lucide', tags },
  );
}

if (import.meta.main) fetchLucide();
