---
title: Rosetta Icons
date: 2026-10
status: beta
category: tool
tags: [design]
url: https://github.com/arfct/rosetta-icons
links:
  source: https://github.com/arfct/rosetta-icons
media:
  - src: four-libraries.png
    caption: Six of the concepts as each library draws them, with the name each library gives its glyph
    alt: A table of black line icons with a row each for SF Symbols, Material Symbols, Lucide and Heroicons and columns for search, settings, home, mail, close and globe, each icon captioned with a name such as magnifyingglass, cog-6-tooth or x-mark
unconfirmed: [date, status]
---

Lucide renamed its `home` icon to `house`, and Material Symbols no longer has an `auto_awesome`, but both old names still resolve in Rosetta Icons. It is a translation table between SF Symbols, Material Symbols, Lucide and Heroicons, built so that a person or a language model can name an icon once and receive the identifier that the library in use ships. The magnifying glass is `magnifyingglass` in the first, `search` in the next two and `magnifying-glass` in the last.

The table holds 403 concepts in 15 categories. Any of the libraries' names is accepted as input, in any case and with any separator, and a name that a library has renamed or dropped resolves to its replacement, which for `auto_awesome` is `wand_stars`. Every mapping is checked against the vendor's current list of names, so a name that resolves exists. Where a library has no equivalent the nearest glyph is given and marked approximate, as with the rocket, for which SF Symbols supplies a paper plane. A name that means different things in different libraries does not resolve at all; `forward` is fast-forward in SF Symbols and Heroicons and forward-a-message in Material Symbols and Lucide.

Fill is requested as a style, and each library returns it in its own form. A second table records which stroke weight in one library matches which in another, measured from renders of 30 concepts, and by it Lucide at a stroke width of 1.8 matches SF Symbols regular at the same glyph size. Rosetta Icons comes as a TypeScript module, a command-line tool and a JSON file for other languages, all kept in the repository; the package is not on npm.

TypeScript. 2026.
