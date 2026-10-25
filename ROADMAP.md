# Roadmap

What Rosetta Icons is for, how it's built, and how it stays current. Status and priorities live in GitHub Issues; this file is the design.

## Goal

A model (or a person) writing UI for an unknown platform should be able to name an icon once, with confidence, and have it render correctly whether the target is SwiftUI, Compose, React with Lucide, or Tailwind with Heroicons. Confidence comes from three properties:

1. **The vocabulary is predictable.** Kebab-case, subject-first, and aligned with the names most libraries already use, so a good guess is usually a canonical name.
2. **Everything the model already knows is accepted.** Any library's native name, in any spelling, including names that have since been renamed or retired, resolves to the same concept.
3. **Output is verified.** Every emitted name is checked against the vendor's current list, so the thing a model gets back actually exists in the version of the library it's targeting.

The runtime is deliberately tiny and dependency-free: a normalizer, an index, and per-library style rules. The work is in the data.

## Phase 1 — Foundation (this pass)

- [x] Data model: concepts with aliases, per-library mappings with match quality, notes, fill overrides and bridge opt-outs.
- [x] Library definitions with naming conventions, fill semantics and usage snippets.
- [x] Vendor fetchers: Lucide and Heroicons from npm, Material Symbols from Google's icon metadata (filtered to the Symbols families, legacy-only names recorded), SF Symbols from the macOS `CoreGlyphs.bundle` catalogue (names, legacy aliases, Apple's semantic aliases, outline→fill pairs, use restrictions, search terms, introduction year).
- [x] Validator: names exist upstream, renames reported with replacement, alias and bridge collisions, restricted symbols acknowledged.
- [x] Resolver: normalization across separators, casing and style suffixes; canonical → alias → library-name → legacy-name → reordered-token lookup; fill translated per library.
- [x] Compiled outputs: `dist/rosetta.json`, `dist/llm.md`, `dist/names.txt`, generated `IconName` union.
- [x] CLI, tests, CI.
- [x] ~400 concepts across navigation, arrows, actions, status, communication, media, people, files, layout, devices, commerce, world, text, dev and objects.

## Phase 2 — Coverage and quality

- **Top-N coverage by usage.** Material metadata carries popularity; use it (and Lucide's categories) to drive the queue. Target: every Material Symbol in the top 500 and every Heroicon resolves. `npm run coverage` is the scoreboard.
- **Review every `close` and `approximate` mapping visually.** A render sheet (SVG from `lucide-static`, `@material-symbols/svg-400`, `heroicons`; SF via `scripts/render-sf.swift`) per concept, so a reviewer sees all four glyphs side by side. Promote or demote match quality from what's seen, not remembered. Renders go to the gitignored `renders/`.
- **Alias discipline.** Aliases should be words a model would reach for, not an exhaustive thesaurus. Add them from observed misses: log the inputs that fail to resolve in real use and curate from that list.
- **Ambiguity list.** Keep a short documented list of bare words that intentionally don't resolve (`forward`, `backward`, …) with the explicit names to use instead, and surface it in `dist/llm.md`.
- **Directional and RTL variants.** `chevron.backward` vs `chevron.left`, `arrow_back` vs `arrow_back_ios`, mirrored symbols. Model as a `direction: logical | physical` style rather than more concepts.

## Phase 3 — Platform availability

- **SF Symbols introduction dates.** `vendor/sf.meta.json` already holds the year each symbol appeared and the year→OS table. Expose a `minimum` field per SF mapping (`iOS 16.0`) and, where a newer name has an older alias that still works, prefer the older spelling for compatibility or emit both.
- **Material legacy bridge.** The 327 Material Icons names absent from Material Symbols should each resolve to a concept where one exists, so a model that learned `expand_more` lands on `keyboard_arrow_down`.
- **Heroicons sizes.** Resolve `mini`/`micro` requests to the `20/solid` and `16/solid` sets and report when a name is missing from one.
- **Material style families.** `outlined | rounded | sharp` as a style axis alongside fill, weight and grade.

## Phase 4 — More libraries

Order by how often models emit them: Phosphor, Tabler, Font Awesome (free), Bootstrap Icons, Fluent UI System Icons, Radix, Iconoir, Feather (as a Lucide ancestor; mostly aliases). Each is a fetcher plus a column; `propose` bootstraps the verbatim matches.

## Phase 5 — Consumers

- **Per-platform packages or snippets.** A SwiftUI `Image(rosetta: .search)` enum generated from `dist/rosetta.json`; a Compose `RosettaIcons.Search`; a Tailwind/React component that picks the installed library.
- **Model-facing surface.** Keep `dist/llm.md` under a few KB and publish it at a stable URL. Consider an MCP server exposing `resolve` and `translate` so agents can check a name instead of guessing.
- **Web lookup.** A static page over `dist/rosetta.json` with search and side-by-side glyphs. Material, Lucide and Heroicons glyphs load from their packages; SF shows by name, with glyphs where a Mac renders them locally.

## Keeping up with the libraries

Each library changes on its own schedule: Lucide ships weekly and renames freely (with aliases), Material Symbols adds hundreds of icons a year and dropped a swath of legacy names in the Icons→Symbols move, Heroicons changes rarely, SF Symbols changes once a year at WWDC and only through a macOS update. The pipeline treats all of them the same way.

**Sources of truth.** `scripts/fetch/<id>.ts` reads an authoritative artifact — the npm package, Google's metadata endpoint, Apple's on-disk catalogue — never a scraped docs page. The output is deterministic (sorted keys, stable formatting) so `git diff vendor/` is readable.

**Vendor snapshots are committed.** `vendor/<id>.json` records the version, fetch date and source alongside the names, aliases, fill pairs and restrictions. The compiled dataset carries each library's version, so a consumer can tell which release a translation was verified against.

**Refresh is a PR, not a push.** `.github/workflows/refresh-vendors.yml` runs `npm run fetch` weekly (and on demand) on a macOS runner so SF Symbols is covered too. If `vendor/` changed it runs the validator and opens a pull request whose body holds the diff summary and the validator output. A human merges it. Nothing lands on `main` without that review.

**Validation is the gate.** CI runs `npm run validate` on every PR. A name the vendor no longer ships is an error; when the vendor publishes a forwarding alias the error names the replacement, so fixing a rename is a one-line edit. Restricted symbols, alias collisions and ambiguous bridges are caught the same way.

**Names never die.**
- Rosetta names are permanent; renaming one keeps the old name as an alias.
- Library legacy names are folded into the index automatically from the vendor's own alias tables.
- Names a vendor drops with no forwarding alias (Material `auto_awesome`) get a curated alias on the right concept, and `vendor/material.json` records them as `legacy` so the validator can explain what happened.

**Versioning.** The package follows semver on the vocabulary: new concepts and aliases are minor, a changed translation for an existing concept is a patch with the reason in the changelog, and a canonical rename or removed concept is major (and should never be needed, given aliases). Vendor refreshes that change no translation are patches.

**When a vendor refresh changes a translation.** The PR should say which concepts changed output and why (vendor rename, vendor removal, better glyph newly available). A reviewer checks the new glyph, not just the new name.

## Non-goals

- Shipping glyphs. Rosetta maps names; each library remains the source of its icons. Review tooling renders glyphs locally and keeps the output out of the repo.
- Fuzzy search in the runtime. Resolution is deterministic so that a model can predict it; discovery tools (`propose`, a future web lookup) can be fuzzy.
- Pixel-identical cross-library rendering. `close` and `approximate` are honest labels, not bugs to hide.
