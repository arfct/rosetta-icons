# CLAUDE.md

This repo follows the Artifact Primer: https://github.com/arfct/ops/tree/main/primer

- Standards (style, commits, branches): https://github.com/arfct/ops/blob/main/primer/standards.md
- Work tracking: GitHub Issues in this repo — https://github.com/arfct/ops/blob/main/primer/issues.md
- Bugs: https://github.com/arfct/ops/blob/main/primer/bugs.md · Deployment: https://github.com/arfct/ops/blob/main/primer/deployment.md
- Agent conventions and boundaries: https://github.com/arfct/ops/blob/main/primer/agents.md

## This repo

Rosetta Icons is a curated translation table between icon libraries (SF Symbols, Material Symbols, Lucide, Heroicons): `data/icons/*.yaml` is the source, `vendor/*.json` holds each library's current name list, `npm run build` compiles `dist/rosetta.json` and the TypeScript runtime in `src/`. Run `npm run validate` after any data change — every mapped name is checked against the vendor list, and CI fails on errors. Read README.md for the contract and data format, ROADMAP.md for the design and the vendor-update process.

Rules of thumb when editing data:
- Never rename a canonical name; add an alias instead.
- Only `match: exact` mappings teach the resolver what a library name means. Use `close`/`approximate` honestly, with a note.
- Where a library reserves a symbol for its own product or app, say so in the mapping note and prefer a general-purpose glyph when one exists.
- Refresh `vendor/` with `npm run fetch` (SF Symbols needs macOS); commit the result in its own PR.
