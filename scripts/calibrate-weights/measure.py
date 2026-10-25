"""Stroke-weight calibration across icon libraries.

For each rendered glyph: thickness t = 2 * area / perimeter (a stroke of length L and
thickness t has area L*t and perimeter ~2L), then ratio = t / glyph bbox size so libraries
rendered at different scales compare. Lucide (stroke-width 2 of 24, rendered 10x) and
Heroicons (1.5 of 24) have known thicknesses, which validates the method.
"""
import json, os, sys
from collections import defaultdict
import numpy as np
from PIL import Image

PNG = 'png'
keys = sorted(os.listdir(PNG))
rows = defaultdict(dict)  # key -> concept -> metrics


def measure(path):
    g = np.asarray(Image.open(path).convert('L'), dtype=np.float32)
    ink = g < 128
    if not ink.any():
        return None
    ys, xs = np.where(ink)
    size = max(ys.max() - ys.min() + 1, xs.max() - xs.min() + 1)
    area = ink.sum()
    pad = np.pad(ink, 1)
    boundary = ink & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    perimeter = boundary.sum()
    t = 2 * area / perimeter
    return dict(t=float(t), size=int(size), ratio=float(t / size), coverage=float(area / size**2))


for key in keys:
    for f in sorted(os.listdir(f'{PNG}/{key}')):
        m = measure(f'{PNG}/{key}/{f}')
        if m:
            rows[key][f[:-4]] = m

order = ['lucide@2', 'heroicons@outline', 'heroicons@solid', 'heroicons@mini'] + [f'material@{w}' for w in (100, 200, 300, 400, 500, 600, 700)] + [f'sf@{w}' for w in ('ultralight', 'thin', 'light', 'regular', 'medium', 'semibold', 'bold', 'heavy', 'black')]
summary = {}
print(f"{'variant':18} {'n':>3} {'t/size %':>9} {'IQR':>12}  {'t in 24-unit box':>16}")
for key in order:
    if key not in rows:
        continue
    r = np.array([m['ratio'] for m in rows[key].values()])
    q1, med, q3 = np.percentile(r, [25, 50, 75])
    # Express as stroke-width in a 24-unit icon box whose glyph spans ~20 units (Lucide/Material convention).
    t24 = med * 20
    summary[key] = dict(n=len(r), ratio=float(med), q1=float(q1), q3=float(q3), t24=float(t24))
    print(f"{key:18} {len(r):3} {med*100:8.2f}% {q1*100:5.2f}–{q3*100:5.2f}%  {t24:10.2f}")

# Sanity: measured thickness in SVG units for the known-stroke libraries (10x render).
for key, expect in (('lucide@2', 2.0), ('heroicons@outline', 1.5)):
    t = np.median([m['t'] for m in rows[key].values()]) / 10
    print(f"\ncheck {key}: measured stroke {t:.2f} units (nominal {expect})")

def nearest(target, candidates):
    return min(candidates, key=lambda k: abs(np.log(summary[k]['ratio'] / target)))

mat = [k for k in summary if k.startswith('material@')]
sf = [k for k in summary if k.startswith('sf@')]
lucide = summary['lucide@2']['ratio']
hero = summary['heroicons@outline']['ratio']

print('\nMatches (by median t/size):')
print(f"{'target':18} {'Material':>12} {'SF':>14} {'Lucide stroke-width':>20} {'vs Heroicons 1.5':>17}")
for key in sf + mat:
    tr = summary[key]['ratio']
    print(f"{key:18} {nearest(tr, mat):>12} {nearest(tr, sf):>14} {2 * tr / lucide:20.2f} {1.5 * tr / hero:17.2f}")
for key, tr in (('lucide@2', lucide), ('heroicons@outline', hero)):
    print(f"{key:18} {nearest(tr, mat):>12} {nearest(tr, sf):>14} {2 * tr / lucide:20.2f} {1.5 * tr / hero:17.2f}")

json.dump(dict(summary=summary, rows=rows), open('measurements.json', 'w'), indent=1)
