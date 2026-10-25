# Rosetta Icons

One icon name, every library. A curated translation table between **SF Symbols**, **Material Symbols**, **Lucide** and **Heroicons** (the Tailwind set), built so that a person or a language model can name an icon once and get the right identifier in whichever library the platform uses.

```ts
import { icon, translate } from 'rosetta-icons';

icon('search', 'sf');                 // 'magnifyingglass'
icon('search', 'heroicons');          // 'magnifying-glass'
icon('magnifyingglass', 'lucide');    // 'search'   — any library's name works as input
icon('home', 'lucide');               // 'house'    — including names a library has since renamed
icon('auto_awesome', 'material');     // 'wand_stars' — Material Symbols dropped auto_awesome

translate('heart', 'sf', { fill: true });   // { name: 'heart.fill', fill: true, exact: true, … }
translate('heart.fill', 'material');        // { name: 'favorite', fill: true, variant: 'FILL 1', … }
```

```sh
npx rosetta-icons trash
# trash
#   sf         trash
#   material   delete
#   lucide     trash
#   heroicons  trash
npx rosetta-icons chevron.down --to material    # keyboard_arrow_down
```

## Why

Every icon library names the same glyph differently (`magnifyingglass`, `search`, `magnifying-glass`), renames things between versions (Lucide's `home` is now `house`), and drops names in rewrites (Material Symbols has no `auto_awesome` or `expand_more`). Models trained on all of them confidently emit names that don't exist in the library actually in use. Rosetta gives a stable vocabulary, accepts whatever the model already knows, and emits what the target library actually ships — verified against the vendors' own name lists.

## The contract

Written for models as much as people; `dist/llm.md` is the prompt-sized version.

1. **Names are kebab-case, subject first, qualifier after**: `arrow-up`, `check-circle`, `user-plus`, `bell-off`. When several libraries agree on a name, that's the Rosetta name; otherwise it follows Lucide.
2. **Any mapped library name is accepted as input, in its native spelling.** `arrow_forward`, `square.and.arrow.up`, `ArrowRight`, `24/solid/heart`, `sf:gearshape` all resolve. Separators and case don't matter.
3. **Renamed and retired names still resolve.** Each library's own alias tables are folded in, plus curated aliases for names that disappeared (`expand_more`, `smartphone`, `alert-triangle`).
4. **Reordered qualifiers resolve** (`circle-check` → `check-circle`) when the token set is unambiguous.
5. **Fill is a style, not a name.** Ask with `{ fill: true }` or a suffix (`heart.fill`, `heart-solid`, `heart-fill`). Each library answers in its own way: SF returns `heart.fill`, Material returns the same name with `variant: 'FILL 1'`, Heroicons returns `variant: '24/solid'`, Lucide (stroke-only) falls back to the outline with `exact: false`.
6. **If it resolves, it's right.** Every mapping is checked against the vendor's current name list, so the output exists. Mappings that are only close carry `match: 'close' | 'approximate'` and `exact: false` with a note. Names that mean different things in different libraries (`forward` is fast-forward in SF and Heroicons but forward-a-message in Material and Lucide) deliberately don't resolve on their own; use the explicit Rosetta name.
7. **Vendor restrictions are surfaced.** Apple restricts some symbols to depicting its own products or apps (`message`, `video`, `iphone`, `icloud.*`); those mappings carry a note, and the table prefers unrestricted alternatives where one exists.

## API

```ts
import rosetta, { resolve, translate, translateAll, icon, names, icons, libraries, normalize } from 'rosetta-icons';
import type { IconName, Translation } from 'rosetta-icons';

resolve('Trash2');                       // { name: 'trash', via: 'alias', fill: false, icon: {…} }
translateAll('trash');                   // { sf: Translation, material: Translation, lucide: Translation, heroicons: Translation }
names;                                   // every canonical name; `IconName` is the same list as a union type
weights.regular.libraries.lucide.value;  // 1.8 — Lucide strokeWidth matching SF regular at equal glyph size (1.5 in a shared 24 px box)
libraries.sf.version;                    // which vendor release the table was verified against
```

`Translation` is `{ library, name, concept, exact, match, fill, variant?, note? }`.

Other languages read `dist/rosetta.json` directly: `icons[name].libraries[library].name`, with `index` mapping every normalized input (canonical, alias or library name) to a canonical name. `normalize` is small enough to port: lowercase, split on `_ . / space` and camelCase, join with `-`, strip a trailing style word.

## Data

```
data/libraries/<id>.yaml   what each library is called, how names look, how fill works, usage snippets
data/icons/<category>.yaml  the curated table, one entry per concept
data/weights.yaml           canonical weight scale (thin … black) → each library's weight, wght or strokeWidth
docs/weights.md             how the weights were measured; docs/stroke-weights.json has the raw numbers
vendor/<id>.json            the library's current names, aliases, fill pairs, restrictions (fetched, not edited)
vendor/<id>.meta.json       tags, categories, popularity, introduction dates — for tooling, not shipped
dist/rosetta.json           compiled dataset (committed; CI checks it matches the source)
dist/llm.md                 prompt-sized reference: rules plus every name by category
```

An entry:

```yaml
search:
  aliases: [find, magnifier, magnifying-glass, lookup]
  sf: magnifyingglass
  material: search
  lucide: search
  heroicons: magnifying-glass
share:
  aliases: [export, send-to, action]
  sf: square.and.arrow.up
  material: { name: share, note: Android's node-and-lines glyph; ios_share is the box-and-arrow }
  lucide: share
  heroicons: share
rocket:
  sf: { name: paperplane, match: approximate, note: SF has no rocket glyph }
  material: rocket_launch
  lucide: rocket
  heroicons: rocket-launch
```

A mapping is a bare name (exact) or `{ name, match?, note?, fill?, bridge? }`. `match` is `exact` (default), `close` (same meaning, visibly different drawing) or `approximate` (nearest available). Only exact mappings teach the resolver what that library name means; `bridge: false` opts an exact mapping out when the name is ambiguous across libraries. `fill` overrides the vendor's own outline→filled pairing (SF) when it's wrong for the concept.

## Scripts

| Command | Does |
| --- | --- |
| `npm run fetch [lib…]` | Refresh `vendor/` from upstream: Lucide and Heroicons from npm, Material from Google's icon metadata, SF Symbols from the catalogue macOS ships in `CoreGlyphs.bundle` (needs a Mac). |
| `npm run validate` | Every mapped name exists in its vendor list; no alias collisions; restricted symbols acknowledged. Renamed names are reported with their replacement. |
| `npm run build` | Compile `data/` → `dist/rosetta.json`, `dist/llm.md`, `dist/names.txt`, `src/data.generated.ts`, then `tsc`. Refuses to build on validation errors. |
| `npm run coverage` | Per-library coverage and the most popular library icons not yet in the table. |
| `npm run propose` | Candidate concepts: names several libraries share verbatim but the table lacks. Output is YAML to curate, not to paste blindly. |
| `npm test` | Unit tests for normalization, resolution, bridging and fill handling. |
| `node scripts/grep.ts <lib> <regex…>` | Search a vendor's names and aliases while curating (`node scripts/grep.ts sf '^cloud'`). |
| `scripts/calibrate-weights/` | Measure stroke weights across libraries and find matching weights; results and equivalence tables in [docs/weights.md](docs/weights.md). |
| `swift scripts/render-sf.swift <dir> < names.txt` | Render SF Symbols to PNG on a Mac for local review sheets. Output goes to the gitignored `renders/`; Apple's license doesn't allow committing or hosting it. |

## Keeping up with the libraries

Vendors move; the table has to notice. See [ROADMAP.md](ROADMAP.md) for the full update design. In short:

- `vendor/` is regenerated by `npm run fetch`, committed, and diffed. A weekly workflow runs it and opens a PR when anything changed, with the validator's output in the body, so a rename upstream becomes a reviewable diff here rather than a silent break.
- `npm run validate` is the gate: a mapping to a name the vendor no longer ships fails CI and names the replacement when the vendor publishes one.
- Old names never stop resolving. Vendor aliases are folded into the index automatically; names a vendor drops without a forwarding alias get a curated alias here.
- Rosetta names are permanent. Renaming one keeps the old name as an alias forever.

## Adding a library

1. Describe it in `data/libraries/<id>.yaml` (naming style, how fill works, usage snippets).
2. Write `scripts/fetch/<id>.ts` producing `vendor/<id>.json` from an authoritative source, and register it in `scripts/fetch/all.ts`.
3. Add `<id>:` mappings to entries in `data/icons/`. `npm run propose` lists the verbatim matches to start from; `npm run coverage` tracks what's left.

Candidates: Phosphor, Tabler, Fluent UI, Bootstrap Icons, Font Awesome, Radix, Iconoir, Feather.

## Development

```sh
npm install
npm run fetch      # optional; vendor/ is committed
npm run validate
npm run build
npm test
npm run check      # biome
```

Node ≥ 22.6 runs the TypeScript sources directly.

## License

MIT. The table maps names only; the icons themselves belong to their vendors under their own licenses (Apple's SF Symbols terms, Apache 2.0 for Material Symbols, ISC for Lucide, MIT for Heroicons). SF Symbols glyphs are never included or hosted: anything that needs to display one renders it on the Mac that's viewing it.
