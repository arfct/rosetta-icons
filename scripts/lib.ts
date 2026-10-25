import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse } from 'yaml';
import { normalize } from '../src/normalize.ts';
import type { Dataset, Icon, Library, Mapping, MatchQuality, Weight, WeightValue } from '../src/types.ts';
import type { VendorList, VendorMeta } from './fetch/common.ts';

export const ROOT = new URL('../', import.meta.url).pathname;
export const CANONICAL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type MappingInput = string | { name: string; fill?: string; match?: MatchQuality; note?: string; bridge?: boolean };
interface IconInput {
  aliases?: string[];
  description?: string;
  [library: string]: unknown;
}

export interface LibraryDefinition extends Omit<Library, 'version' | 'fetched'> {}

export interface Problem {
  level: 'error' | 'warning' | 'info';
  where: string;
  message: string;
}

export interface Source {
  libraries: Record<string, LibraryDefinition>;
  weights: Record<string, Weight>;
  vendors: Record<string, VendorList>;
  icons: Icon[];
  problems: Problem[];
}

const readYaml = <T>(file: string): T => parse(readFileSync(file, 'utf8')) as T;
const listFiles = (dir: string, ext: string) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .sort()
    .map((f) => join(dir, f));

export function loadVendors(): Record<string, VendorList> {
  const vendors: Record<string, VendorList> = {};
  for (const file of listFiles(join(ROOT, 'vendor'), '.json')) {
    if (file.endsWith('.meta.json')) continue;
    const list: VendorList = JSON.parse(readFileSync(file, 'utf8'));
    vendors[list.library] = list;
  }
  return vendors;
}

export const loadVendorMeta = (library: string): VendorMeta | undefined => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'vendor', `${library}.meta.json`), 'utf8'));
  } catch {
    return undefined;
  }
};

export function loadSource(): Source {
  const problems: Problem[] = [];
  const libraries: Record<string, LibraryDefinition> = {};
  for (const file of listFiles(join(ROOT, 'data/libraries'), '.yaml')) {
    const lib = readYaml<LibraryDefinition>(file);
    libraries[lib.id] = lib;
  }
  const vendors = loadVendors();

  const icons: Icon[] = [];
  const seen = new Map<string, string>();
  for (const file of listFiles(join(ROOT, 'data/icons'), '.yaml')) {
    const category = basename(file, '.yaml');
    const entries = readYaml<Record<string, IconInput>>(file) ?? {};
    for (const [name, input] of Object.entries(entries)) {
      const where = `${category}/${name}`;
      if (!CANONICAL_NAME.test(name))
        problems.push({ level: 'error', where, message: 'name must be kebab-case ascii' });
      if (seen.has(name)) problems.push({ level: 'error', where, message: `duplicate of ${seen.get(name)}/${name}` });
      seen.set(name, category);

      const mappings: Icon['libraries'] = {};
      for (const [key, value] of Object.entries(input ?? {})) {
        if (key === 'aliases' || key === 'description') continue;
        if (!libraries[key]) {
          problems.push({ level: 'error', where, message: `unknown library "${key}"` });
          continue;
        }
        mappings[key] = toMapping(value as MappingInput, vendors[key]);
      }
      icons.push({
        name,
        category,
        aliases: input?.aliases ?? [],
        description: input?.description,
        libraries: mappings,
      });
    }
  }

  problems.push(...checkMappings(icons, vendors));
  const weights = loadWeights(libraries, problems);
  return { libraries, weights, vendors, icons, problems };
}

type WeightInput = { ratio: number; box?: number; [library: string]: unknown };

function loadWeights(libraries: Record<string, LibraryDefinition>, problems: Problem[]): Record<string, Weight> {
  const entries = readYaml<Record<string, WeightInput>>(join(ROOT, 'data/weights.yaml')) ?? {};
  const weights: Record<string, Weight> = {};
  for (const [name, input] of Object.entries(entries)) {
    const mapped: Weight['libraries'] = {};
    for (const [library, raw] of Object.entries(input)) {
      if (library === 'ratio' || library === 'box') continue;
      if (!libraries[library]) {
        problems.push({ level: 'error', where: `weights/${name}`, message: `unknown library "${library}"` });
        continue;
      }
      const value: WeightValue =
        typeof raw === 'object' && raw !== null
          ? { ...(raw as WeightValue), match: (raw as WeightValue).match ?? 'exact' }
          : { value: raw as string | number, match: 'exact' };
      mapped[library] = value;
    }
    weights[name] = { ratio: input.ratio, box: input.box, libraries: mapped };
  }
  return weights;
}

function toMapping(value: MappingInput, vendor?: VendorList): Mapping {
  const raw = typeof value === 'string' ? { name: value } : value;
  const mapping: Mapping = { name: String(raw.name), match: raw.match ?? 'exact' };
  if (raw.note) mapping.note = raw.note;
  if (raw.bridge === false) mapping.bridge = false;
  const fill = raw.fill ?? vendor?.fill?.[mapping.name];
  if (fill) mapping.fill = fill;
  return mapping;
}

function checkMappings(icons: Icon[], vendors: Record<string, VendorList>): Problem[] {
  const problems: Problem[] = [];
  for (const icon of icons) {
    for (const [library, mapping] of Object.entries(icon.libraries)) {
      const vendor = vendors[library];
      if (!vendor || !mapping) continue;
      const where = `${icon.category}/${icon.name} → ${library}`;
      const known = new Set(vendor.names);
      for (const candidate of [mapping.name, mapping.fill]) {
        if (!candidate || known.has(candidate)) continue;
        const renamed = vendor.aliases[candidate];
        const legacy = vendor.legacy?.includes(candidate);
        problems.push({
          level: 'error',
          where,
          message: renamed
            ? `"${candidate}" was renamed to "${renamed}"`
            : legacy
              ? `"${candidate}" is a legacy name the current ${library} set no longer ships`
              : `"${candidate}" is not in ${library} ${vendor.version}`,
        });
      }
      const restriction = vendor.restricted?.includes(mapping.name);
      if (restriction && !mapping.note) {
        mapping.note = `${library} restricts this symbol's use; see the vendor's terms`;
        problems.push({
          level: 'warning',
          where,
          message: `"${mapping.name}" is use-restricted by the vendor; add a note to acknowledge it`,
        });
      }
    }
  }
  return problems;
}

/** Normalized key → canonical, with conflicts reported. Canonical names and aliases outrank library-name bridges. */
export function buildIndex(
  icons: Icon[],
  vendors: Record<string, VendorList> = {},
): { index: Record<string, string>; problems: Problem[] } {
  const problems: Problem[] = [];
  const owners = new Map<string, { icon: string; kind: 'canonical' | 'alias' | 'library'; via: string }>();
  const legacyNames = Object.fromEntries(
    Object.entries(vendors).map(([id, vendor]) => {
      const byCurrent = new Map<string, string[]>();
      for (const [legacy, current] of Object.entries(vendor.aliases))
        byCurrent.set(current, [...(byCurrent.get(current) ?? []), legacy]);
      return [id, byCurrent];
    }),
  );

  const claim = (key: string, icon: string, kind: 'canonical' | 'alias' | 'library', via: string) => {
    const existing = owners.get(key);
    if (!existing) return owners.set(key, { icon, kind, via });
    if (existing.icon === icon) return;
    const existingCurated = existing.kind !== 'library';
    const curated = kind !== 'library';
    if (existingCurated && curated) {
      problems.push({
        level: 'error',
        where: icon,
        message: `"${key}" (${via}) already belongs to ${existing.icon} (${existing.via})`,
      });
    } else if (!existingCurated && !curated) {
      problems.push({
        level: 'error',
        where: icon,
        message: `bridge "${key}" (${via}) also claimed by ${existing.icon} (${existing.via}); mark one as match: close or add a curated alias`,
      });
    } else if (curated) {
      owners.set(key, { icon, kind, via });
      problems.push({
        level: 'info',
        where: existing.icon,
        message: `bridge "${key}" (${existing.via}) is shadowed by ${icon} (${via})`,
      });
    } else {
      problems.push({
        level: 'info',
        where: icon,
        message: `bridge "${key}" (${via}) is shadowed by ${existing.icon} (${existing.via})`,
      });
    }
  };

  for (const icon of icons) claim(icon.name, icon.name, 'canonical', 'canonical');
  for (const icon of icons)
    for (const alias of icon.aliases) claim(normalize(alias).key, icon.name, 'alias', `alias ${alias}`);
  for (const icon of icons) {
    for (const [library, mapping] of Object.entries(icon.libraries)) {
      // Only exact mappings define what a library name means; approximations don't bridge back.
      if (mapping?.match !== 'exact' || mapping.bridge === false) continue;
      claim(normalize(mapping.name).key, icon.name, 'library', `${library}:${mapping.name}`);
      // The library's own legacy names (Lucide `history` → `rotate-ccw-clock`) bridge to the same concept.
      for (const legacy of legacyNames[library]?.get(mapping.name) ?? []) {
        claim(normalize(legacy).key, icon.name, 'library', `${library}:${legacy} (legacy)`);
      }
    }
  }

  const index = Object.fromEntries([...owners.entries()].sort().map(([key, owner]) => [key, owner.icon]));
  return { index, problems };
}

export function compile(source: Source, version: string): { dataset: Dataset; problems: Problem[] } {
  const { index, problems } = buildIndex(source.icons, source.vendors);
  const libraries = Object.fromEntries(
    Object.entries(source.libraries).map(([id, lib]) => [
      id,
      {
        ...lib,
        version: source.vendors[id]?.version ?? 'unknown',
        fetched: source.vendors[id]?.fetched ?? 'never',
      },
    ]),
  );
  const icons = Object.fromEntries(source.icons.map((icon) => [icon.name, icon]));
  return {
    // Dated by the newest vendor snapshot rather than the clock, so rebuilding without changes is a no-op.
    dataset: { version, generated: newestFetch(libraries), libraries, icons, weights: source.weights, index },
    problems: [...source.problems, ...problems],
  };
}

const MARK = { error: '✗', warning: '!', info: '·' };

const newestFetch = (libraries: Record<string, Library>) =>
  Object.values(libraries).reduce((latest, lib) => (lib.fetched > latest ? lib.fetched : latest), '');

export function report(problems: Problem[], verbose = process.argv.includes('--verbose')): boolean {
  const count = (level: Problem['level']) => problems.filter((p) => p.level === level).length;
  for (const p of problems) {
    if (p.level !== 'info' || verbose) console.log(`${MARK[p.level]} ${p.where}: ${p.message}`);
  }
  console.log(
    `${count('error')} errors, ${count('warning')} warnings, ${count('info')} notes${verbose ? '' : ' (--verbose to list)'}`,
  );
  return count('error') === 0;
}

export const packageVersion = (): string => JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
