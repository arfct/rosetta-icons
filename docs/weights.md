# Stroke weights across libraries

Which weight of one library looks like which weight of another, measured rather than eyeballed, so a UI that mixes libraries (or backfills a missing icon from another set) can pick a matching weight.

## Method

`scripts/calibrate-weights/` renders 30 common concepts (`circle`, `plus`, `bell`, `search`, `trash`, …) from every library and weight to black-on-white PNGs, then measures stroke thickness as **t = 2·area / perimeter** of the ink (a stroke of length L and thickness t has area L·t and perimeter ≈ 2L). Thickness is divided by the glyph's bounding-box size so libraries rendered at different scales compare. The column value is the median over the 30 concepts.

Validation: Lucide's nominal stroke is 2 of 24 units and measures 2.16; Heroicons outline is 1.5 and measures 1.66. The ~8–10% overshoot is antialiasing at the boundary and is the same for every column, so the relative comparisons hold.

Run it on a Mac (SF Symbols render through AppKit; glyph output stays local, see the license note in README):

```sh
cd scripts/calibrate-weights
npm i --no-save lucide-static heroicons        # or point LUCIDE_ICONS / HEROICONS at extracted packages
node build-manifest.mjs                        # picks names from dist/rosetta.json, downloads Material SVGs per weight
swift render.swift                             # png/<variant>/<concept>.png
uv run --with numpy,pillow python measure.py   # prints the tables below, writes measurements.json
uv run python sheet.py                         # index.html contact sheet for eyeballing
```

## Measurements

Thickness as % of glyph size (median, with interquartile range), and the equivalent stroke-width in a 24-unit icon box whose glyph spans 20 units (the Lucide/Material convention):

| Variant | t / size | IQR | ≈ stroke in 24-box |
| --- | ---: | ---: | ---: |
| SF ultralight | 2.84% | 2.5–3.8 | 0.57 |
| SF thin | 4.32% | 4.0–5.1 | 0.86 |
| SF light | 7.13% | 6.3–8.2 | 1.43 |
| **SF regular** | **8.86%** | 8.0–10.2 | **1.77** |
| SF medium | 10.27% | 9.4–11.5 | 2.05 |
| SF semibold | 11.33% | 10.2–13.4 | 2.27 |
| SF bold | 12.90% | 11.5–15.2 | 2.58 |
| SF heavy | 14.92% | 13.2–18.3 | 2.98 |
| SF black | 16.75% | 14.7–20.0 | 3.35 |
| Material 100 | 3.99% | 3.6–5.0 | 0.80 |
| Material 200 | 5.28% | 4.7–6.3 | 1.06 |
| Material 300 | 7.14% | 6.3–8.5 | 1.43 |
| **Material 400** | **8.73%** | 7.9–10.0 | **1.75** |
| Material 500 | 9.79% | 8.8–11.4 | 1.96 |
| Material 600 | 10.91% | 9.9–12.4 | 2.18 |
| Material 700 | 12.42% | 11.3–14.3 | 2.48 |
| **Lucide (stroke 2)** | **10.33%** | 9.8–11.3 | **2.07** |
| **Heroicons outline (1.5)** | **8.52%** | 7.9–9.7 | **1.70** |
| Heroicons solid | 20.70% | 11.9–28.9 | fill |

## Equivalences

| Target | Material | SF | Lucide `strokeWidth` | Heroicons |
| --- | --- | --- | ---: | --- |
| SF ultralight | 100 (lighter) | — | 0.55 | — |
| SF thin | 100 | — | 0.85 | — |
| SF light | 300 | — | 1.4 | — |
| **SF regular** | **400** | — | **1.7** | **outline (1.5)** |
| SF medium | 500 | — | 2.0 | — |
| SF semibold | 600 | — | 2.2 | — |
| SF bold | 700 | — | 2.5 | — |
| SF heavy | 700 (heavier) | — | 2.9 | — |
| SF black | 700 (heavier) | — | 3.25 | — |
| Material 100 | — | thin | 0.75 | — |
| Material 200 | — | thin–light | 1.0 | — |
| Material 300 | — | light | 1.4 | — |
| **Material 400** | — | **regular** | **1.7** | **outline (1.5)** |
| Material 500 | — | medium | 1.9 | — |
| Material 600 | — | semibold | 2.1 | — |
| Material 700 | — | bold | 2.4 | — |
| Lucide stroke 2 | 600 | medium | 2 | — |
| Heroicons outline | 400 | regular | 1.65 | 1.5 |

## What to do with it

- **SF regular, Material 400 and Heroicons outline are the same weight** (within 4%). Mixing them needs no adjustment.
- **Lucide's default (stroke 2) is one step heavier**: it matches SF medium / Material 500–600. To sit alongside SF regular or Material 400, render Lucide at `strokeWidth={1.75}` (1.7 measured; 1.75 is the nearest common value). Lucide also ships `absoluteStrokeWidth` so the weight doesn't scale with icon size.
- **Backfilling an SF or Material icon with Lucide**: pick the Lucide stroke from the table for the weight in use. Backfilling with Heroicons works only at regular weight; Heroicons has no weight axis.
- **Material has no equivalent of SF heavy/black**; 700 tops out near SF bold. SF ultralight is lighter than Material 100.
- Heroicons solid/mini/micro are fills, not strokes; compare them with SF `.fill` variants and Material `FILL 1`, not with weights.

The raw numbers, per concept and variant, are in `docs/stroke-weights.json`. The equivalence table is data in `data/weights.yaml`, compiled into `dist/rosetta.json` as `weights` and exported from the package as `weights`; the library definitions in `data/libraries/` carry each variant's measured ratio. A `weight` option on `translate()` is the natural next step.
