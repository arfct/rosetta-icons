# Stroke weights across libraries

Which weight of one library looks like which weight of another, measured rather than eyeballed, so a UI that mixes libraries (or backfills a missing icon from another set) can pick a matching weight.

## Method

`scripts/calibrate-weights/` renders 30 common concepts (`circle`, `plus`, `bell`, `search`, `trash`, …) from every library and weight to black-on-white PNGs (SVG libraries at 10×, SF Symbols at point size 100), then reads stroke thickness along the **medial axis**: skeletonize the ink, take 2 × distance-to-background at each skeleton pixel, median. End caps and junctions are a small minority of skeleton pixels, so the estimate isn't biased by them.

Validation against known values:

| | nominal | measured |
| --- | ---: | ---: |
| Lucide stroke | 2 | 2.00 |
| Heroicons outline stroke | 1.5 | 1.56 (half-pixel antialiasing) |
| Material 100 … 700 | — | exactly 0.6 / 0.8 / 1.2 / 1.6 / 1.8 / 2.0 / 2.4, no spread across 30 concepts |

`check-plus.py` cross-checks the same renders by reading pixel runs straight across the arms of the plus and the bar of the minus; it agrees within a pixel. The first version of this analysis used 2·area/perimeter, which the plus showed to be ~8% noisy and up to 13% low on short thick bars; the equivalences below supersede it.

Two normalizations, because they answer different questions:

- **same-glyph** — thickness ÷ glyph bounding-box size. What you see when icons are sized to look the same size. The only normalization that works for SF Symbols, which have no icon box.
- **same-box** — stroke in 24-unit icon-box units. What you get when every icon sits in the same 24 px box. Exact for the SVG libraries; for SF, the glyph is scaled to Lucide's glyph size for the same concept. Libraries draw their glyphs different sizes inside the box (Lucide's plus spans 16 units, Heroicons' 16.5, Material's 14), which is why the two normalizations disagree by 5–10%.

Run it on a Mac (SF Symbols render through AppKit; glyph output stays local, see the license note in README):

```sh
cd scripts/calibrate-weights
npm i --no-save lucide-static heroicons                       # or point LUCIDE_ICONS / HEROICONS at extracted packages
node build-manifest.mjs                                       # names from dist/rosetta.json; downloads Material SVGs per weight
swift render.swift                                            # png/<variant>/<concept>.png
uv run --with numpy,pillow,scipy,scikit-image python measure.py   # tables below; writes measurements.json
uv run --with numpy,pillow python check-plus.py              # direct pixel-run cross-check
uv run python sheet.py                                        # index.html contact sheet for eyeballing
```

## Measurements

Median over 30 concepts (interquartile range in brackets).

| Variant | same-glyph | same-box (24 u) |
| --- | ---: | ---: |
| SF ultralight | 2.7% [2.1–3.1] | 0.52 |
| SF thin | 4.2% [3.9–4.6] | 0.86 |
| SF light | 6.3% [5.7–6.7] | 1.33 |
| **SF regular** | **8.2%** [7.3–8.9] | **1.70** |
| SF medium | 9.9% [8.4–10.8] | 1.97 |
| SF semibold | 10.8% [9.5–12.7] | 2.20 |
| SF bold | 12.3% [10.3–14.2] | 2.54 |
| SF heavy | 14.3% [12.6–16.6] | 2.97 |
| SF black | 15.8% [13.8–18.4] | 3.32 |
| Material 100 | 3.9% | 0.60 |
| Material 200 | 5.0% | 0.80 |
| Material 300 | 6.7% | 1.20 |
| **Material 400** | **8.2%** [8.0–9.6] | **1.60** |
| Material 500 | 9.1% | 1.80 |
| Material 600 | 10.1% | 2.00 |
| Material 700 | 11.8% | 2.40 |
| **Lucide (stroke 2)** | **9.1%** [9.1–10.0] | **2.00** |
| **Heroicons outline (1.5)** | **7.9%** [7.6–8.2] | **1.56** |

## Equivalences

By same-glyph thickness (nearest variant; ratios in parentheses).

| SF | Material | Lucide `strokeWidth`, equal glyph size | Lucide `strokeWidth`, same 24 px box |
| --- | --- | ---: | ---: |
| thin (4.2) | 100 (3.9) | 0.9 | 0.85 |
| light (6.3) | 300 (6.7) | 1.4 | 1.35 |
| **regular (8.2)** | **400 (8.2)** | **1.8** | **1.7** |
| medium (9.9) | 600 (10.1) | 2.2 | 2.0 |
| semibold (10.8) | 600–700 (10.1 / 11.8) | 2.4 | 2.2 |
| bold (12.3) | 700 (11.8), a little lighter | 2.7 | 2.55 |
| heavy (14.3) | — | 3.1 | 3.0 |
| black (15.8) | — | 3.5 | 3.3 |

| Material | SF | Lucide, equal glyph size | Lucide, same box |
| --- | --- | ---: | ---: |
| 100 (3.9) | thin (4.2) | 0.85 | 0.6 |
| 200 (5.0) | thin–light | 1.1 | 0.8 |
| 300 (6.7) | light (6.3) | 1.5 | 1.2 |
| **400 (8.2)** | **regular (8.2)** | **1.8** | **1.6** |
| 500 (9.1) | regular–medium | 2.0 | 1.8 |
| 600 (10.1) | medium (9.9) | 2.2 | 2.0 |
| 700 (11.8) | semibold–bold | 2.6 | 2.4 |

Lucide's default (stroke 2, 9.1%) sits at Material 500 / between SF regular and medium. Heroicons outline (7.9%) sits just under SF regular / Material 400.

## What to do with it

- **SF regular and Material 400 are the same weight** (8.2% each). Mixing them at equal glyph size needs no adjustment. Heroicons outline is 4% lighter — close enough.
- **Lucide's default is heavier than all three.** In a shared 24 px box, Material 400 and Heroicons are 1.6 units and Lucide is 2.0: render Lucide at `strokeWidth={1.5}` (or 1.6) to match. If instead you size icons to equal glyph size — the natural thing next to SF Symbols — use `strokeWidth={1.75}`. Lucide's `absoluteStrokeWidth` keeps the weight from scaling with icon size.
- **SF's heavier weights step faster than Material's.** Medium ≈ Material 600, semibold falls between 600 and 700, bold is slightly heavier than 700, and heavy/black have no Material counterpart.
- **Backfilling an SF or Material icon with Lucide**: take the Lucide stroke from the table for the weight in use. Backfilling with Heroicons works only at regular weight; it has no weight axis.
- Heroicons solid/mini/micro are fills, not strokes; compare them with SF `.fill` variants and Material `FILL 1`, not with weights.

The raw numbers, per concept and variant, are in `docs/stroke-weights.json`. The equivalence table is data in `data/weights.yaml` (both normalizations), compiled into `dist/rosetta.json` as `weights` and exported from the package as `weights`; the library definitions in `data/libraries/` carry each variant's measured ratio. A `weight` option on `translate()` is the natural next step.
