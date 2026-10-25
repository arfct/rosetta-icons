import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { npmPack, today, writeVendor } from './common.ts';

const SETS = ['24/outline', '24/solid', '20/solid', '16/solid'];

export function fetchHeroicons() {
  const pkg = npmPack('heroicons');
  const sets = Object.fromEntries(
    SETS.map((set) => [
      set,
      readdirSync(join(pkg.dir, set))
        .filter((file) => file.endsWith('.svg'))
        .map((file) => file.slice(0, -4))
        .sort(),
    ]),
  );

  writeVendor({
    library: 'heroicons',
    version: pkg.version,
    fetched: today(),
    source: `npm:heroicons@${pkg.version}`,
    names: [...sets['24/outline'], ...sets['24/solid']],
    aliases: {},
    sets,
  });
}

if (import.meta.main) fetchHeroicons();
