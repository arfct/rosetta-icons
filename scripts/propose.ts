import { normalize } from '../src/normalize.ts';
import { loadSource, loadVendorMeta } from './lib.ts';

// Proposes new concepts: names that exist verbatim (after normalization) in several libraries
// but aren't in the table yet. Output is YAML to paste into data/icons/ and curate — SF rarely
// shares spellings, so its column is filled from SF's own semantic aliases where one exists.
const source = loadSource();
const minLibraries = Number(process.argv[2] ?? 2);
const limit = Number(process.argv[3] ?? 50);

const bridged = new Set<string>();
for (const icon of source.icons) {
  bridged.add(icon.name);
  for (const alias of icon.aliases) bridged.add(normalize(alias).key);
  for (const m of Object.values(icon.libraries)) if (m) bridged.add(normalize(m.name).key);
}

const candidates = new Map<string, Record<string, string>>();
for (const [id, vendor] of Object.entries(source.vendors)) {
  const names = id === 'heroicons' ? (vendor.sets?.['24/outline'] ?? vendor.names) : vendor.names;
  for (const name of names) {
    const { key, fill } = normalize(name);
    if (fill || bridged.has(key)) continue;
    const entry = candidates.get(key) ?? {};
    entry[id] ??= name;
    candidates.set(key, entry);
  }
}

const popularity = loadVendorMeta('material')?.popularity ?? {};
const sf = source.vendors.sf;
const ranked = [...candidates.entries()]
  .filter(([, libs]) => Object.keys(libs).length >= minLibraries)
  .sort(
    (a, b) =>
      Object.keys(b[1]).length - Object.keys(a[1]).length ||
      (popularity[b[1].material] ?? 0) - (popularity[a[1].material] ?? 0),
  )
  .slice(0, limit);

for (const [key, libs] of ranked) {
  const sfName = libs.sf ?? sf?.aliases[key.replace(/-/g, '.')] ?? sf?.aliases[key.replace(/-/g, '')];
  console.log(`${key}:`);
  for (const [id, name] of Object.entries({ ...libs, ...(sfName ? { sf: sfName } : {}) }))
    console.log(`  ${id}: ${name}`);
}
