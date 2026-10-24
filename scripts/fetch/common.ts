import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface VendorList {
  library: string;
  version: string;
  fetched: string;
  source: string;
  names: string[];
  /** Library's own legacy or alternate names → current name. */
  aliases: Record<string, string>;
  /** Outline name → filled name, for libraries where fill is a distinct name. */
  fill?: Record<string, string>;
  /** Named subsets (e.g. Heroicons `24/solid`). */
  sets?: Record<string, string[]>;
  /** Names the vendor restricts to specific uses. */
  restricted?: string[];
  /** Names from a predecessor set (Material Icons) that the current set no longer ships. */
  legacy?: string[];
}

export interface VendorMeta {
  library: string;
  tags: Record<string, string[]>;
  categories?: Record<string, string[]>;
  popularity?: Record<string, number>;
  introduced?: Record<string, string>;
}

export const VENDOR_DIR = new URL('../../vendor/', import.meta.url).pathname;

export const today = () => new Date().toISOString().slice(0, 10);

export function npmPack(spec: string): { dir: string; version: string } {
  const dest = mkdtempSync(join(tmpdir(), 'rosetta-'));
  const [info] = JSON.parse(
    execFileSync('npm', ['pack', spec, '--pack-destination', dest, '--json', '--silent'], {
      encoding: 'utf8',
    }),
  );
  execFileSync('tar', ['xzf', join(dest, info.filename), '-C', dest]);
  return { dir: join(dest, 'package'), version: info.version };
}

export const sortedUnique = (names: Iterable<string>) => [...new Set(names)].sort();

export const sortObject = <T>(obj: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

export function writeVendor(list: VendorList, meta?: VendorMeta) {
  mkdirSync(VENDOR_DIR, { recursive: true });
  const normalized = {
    ...list,
    names: sortedUnique(list.names),
    aliases: sortObject(list.aliases),
    fill: list.fill && sortObject(list.fill),
    restricted: list.restricted && sortedUnique(list.restricted),
    legacy: list.legacy && sortedUnique(list.legacy),
  };
  writeFileSync(join(VENDOR_DIR, `${list.library}.json`), `${JSON.stringify(normalized, null, 1)}\n`);
  if (meta) {
    const compact = Object.fromEntries(
      Object.entries(meta).map(([k, v]) => [k, typeof v === 'object' ? sortObject(v) : v]),
    );
    writeFileSync(join(VENDOR_DIR, `${list.library}.meta.json`), `${JSON.stringify(compact)}\n`);
  }
  console.log(
    `${list.library} ${list.version}: ${normalized.names.length} names, ${Object.keys(normalized.aliases).length} aliases`,
  );
}
