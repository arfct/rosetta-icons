import { normalize } from '../src/normalize.ts';
import { loadSource, loadVendorMeta } from './lib.ts';

// Per-library coverage of the curated table, plus the most popular library icons still unmapped.
const source = loadSource();
const total = source.icons.length;
const bridged = new Set(
  source.icons.flatMap((icon) => Object.values(icon.libraries).map((m) => m && normalize(m.name).key)),
);

console.log(`${total} concepts\n`);
console.log('library     mapped  exact  close  approx');
for (const id of Object.keys(source.libraries)) {
  const mappings = source.icons.map((icon) => icon.libraries[id]).filter(Boolean);
  const by = (q: string) => mappings.filter((m) => m?.match === q).length;
  const pct = Math.round((100 * mappings.length) / total);
  console.log(
    `${id.padEnd(11)} ${String(mappings.length).padStart(4)} ${String(`${pct}%`).padStart(5)}  ${String(by('exact')).padStart(5)}  ${String(by('close')).padStart(5)}  ${String(by('approximate')).padStart(6)}`,
  );
}

const limit = Number(process.argv[2] ?? 25);
const popularity = loadVendorMeta('material')?.popularity ?? {};
const unmapped = Object.entries(popularity)
  .filter(([name]) => !bridged.has(normalize(name).key))
  .sort((a, b) => b[1] - a[1])
  .slice(0, limit);
console.log(`\nMost popular Material Symbols not yet in the table (top ${limit}):`);
console.log(unmapped.map(([name]) => name).join(', '));

const heroicons = source.vendors.heroicons;
if (heroicons) {
  const missing = heroicons.sets?.['24/outline'].filter((name) => !bridged.has(normalize(name).key)) ?? [];
  console.log(`\nHeroicons not yet in the table (${missing.length}):`);
  console.log(missing.join(', '));
}
