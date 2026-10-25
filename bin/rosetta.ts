#!/usr/bin/env node
import rosetta, { libraries, names, resolve, translate, translateAll } from '../src/index.ts';

const USAGE = `rosetta-icons <name> [--to <library>] [--fill] [--json]
rosetta-icons --list | --libraries

Translate an icon name between SF Symbols, Material Symbols, Lucide and Heroicons.
Input may be a Rosetta name, an alias, or any mapped library name (arrow_forward, square.and.arrow.up, ArrowRight).`;

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--to');

if (flag('help') || (!positional.length && !flag('list') && !flag('libraries'))) {
  console.log(USAGE);
  process.exit(positional.length ? 0 : 1);
}

if (flag('libraries')) {
  for (const lib of Object.values(libraries))
    console.log(`${lib.id.padEnd(10)} ${lib.name} — ${lib.version} (fetched ${lib.fetched})`);
  process.exit(0);
}

if (flag('list')) {
  console.log(names.join('\n'));
  process.exit(0);
}

const input = positional[0];
const target = option('to');
const options = { fill: flag('fill') || undefined };

if (target) {
  const result = translate(input, target, options);
  if (!result) fail(input, target);
  console.log(flag('json') ? JSON.stringify(result, null, 2) : result.name);
  process.exit(0);
}

const resolved = resolve(input);
const all = translateAll(input, options);
if (!resolved || !all) fail(input);

if (flag('json')) {
  console.log(JSON.stringify({ ...resolved, icon: undefined, translations: all }, null, 2));
} else {
  const viaNote = resolved.via === 'canonical' ? '' : ` (via ${resolved.via})`;
  console.log(`${resolved.name}${viaNote}${resolved.fill ? ' [fill]' : ''}`);
  for (const [library, t] of Object.entries(all)) {
    if (!t) continue;
    const quality = t.exact ? '' : ` (${t.match === 'exact' ? 'fallback' : t.match}${t.note ? `: ${t.note}` : ''})`;
    const variant = t.variant ? ` [${t.variant}]` : '';
    console.log(`  ${library.padEnd(10)} ${t.name}${variant}${quality}`);
  }
}

function fail(name: string, library?: string): never {
  const known =
    library && !libraries[library]
      ? `unknown library "${library}"; try ${Object.keys(rosetta.libraries).join(', ')}`
      : '';
  console.error(known || `no icon matches "${name}"${library ? ` in ${library}` : ''}`);
  process.exit(2);
}
