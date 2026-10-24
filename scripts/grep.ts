import { readFileSync } from 'node:fs';

const [lib, ...patterns] = process.argv.slice(2);
const v: { names: string[]; aliases: Record<string, string> } = JSON.parse(
  readFileSync(`/Volumes/code/rosetta-icons/vendor/${lib}.json`, 'utf8'),
);
for (const p of patterns) {
  const re = new RegExp(p);
  const hits = v.names.filter((n) => re.test(n));
  const aliasHits = Object.entries(v.aliases)
    .filter(([k]) => re.test(k))
    .map(([k, val]) => `${k}→${val}`);
  console.log(
    `${p}: ${hits.slice(0, 40).join(', ')}${hits.length > 40 ? ` … (${hits.length})` : ''}${aliasHits.length ? ` | aliases: ${aliasHits.slice(0, 10).join(', ')}` : ''}`,
  );
}
