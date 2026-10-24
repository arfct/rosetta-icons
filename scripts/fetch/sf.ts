import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { today, writeVendor } from './common.ts';

// Apple ships the full SF Symbols catalogue with macOS; no download needed.
const BUNDLE = '/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources';
const NAME = /^[a-z0-9][a-z0-9.]*$/;

const plist = <T>(file: string): T =>
  JSON.parse(
    execFileSync('plutil', ['-convert', 'json', '-o', '-', join(BUNDLE, file)], {
      encoding: 'utf8',
      maxBuffer: 64 << 20,
    }),
  );

const onlyNamed = (map: Record<string, string>) =>
  Object.fromEntries(Object.entries(map).filter(([k, v]) => NAME.test(k) && NAME.test(v)));

export function fetchSF() {
  if (!existsSync(BUNDLE)) throw new Error(`SF Symbols metadata needs macOS (${BUNDLE} not found)`);

  const availability = plist<{
    symbols: Record<string, string>;
    year_to_release: Record<string, Record<string, string>>;
  }>('name_availability.plist');
  const names = Object.keys(availability.symbols).filter((n) => NAME.test(n));
  const legacy = onlyNamed(plist<Record<string, string>>('name_aliases.strings'));
  const semantic = onlyNamed(plist<Record<string, string>>('semantic_to_descriptive_name.strings'));
  const fill = onlyNamed(plist<Record<string, string>>('nofill_to_fill.strings'));
  const restricted = Object.keys(plist<Record<string, string>>('symbol_restrictions.strings'));
  const search = plist<Record<string, string[]>>('symbol_search.plist');

  const years = Object.keys(availability.year_to_release).sort();
  const latest = years[years.length - 1];
  const macOS = execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim();

  writeVendor(
    {
      library: 'sf',
      version: `${latest} (macOS ${macOS})`,
      fetched: today(),
      source: `${BUNDLE} (name_availability, name_aliases, semantic_to_descriptive_name, nofill_to_fill, symbol_restrictions, symbol_search)`,
      names,
      aliases: { ...legacy, ...semantic },
      fill,
      restricted,
    },
    {
      library: 'sf',
      tags: Object.fromEntries(names.map((n) => [n, search[n] ?? []])),
      introduced: availability.symbols,
    },
  );
}

if (import.meta.main) fetchSF();
