"""Stroke-weight calibration across icon libraries.

Thickness is read along the medial axis: skeletonize the ink, take 2 x distance-to-background at each
skeleton pixel, median. End caps and junctions are a small minority of skeleton pixels, so this is far
less biased than area/perimeter. Validation: Lucide (nominal stroke 2) measures 2.00; Material's weights
measure exactly 0.6/0.8/1.2/1.6/1.8/2.0/2.4 with no spread; Heroicons (1.5) measures 1.56.
check-plus.py cross-checks against direct pixel runs on the plus and minus glyphs.

Two normalizations are reported, because they answer different questions:
  same-glyph  thickness / glyph bbox size. What you see when icons are sized to look the same size.
              The only normalization that makes sense for SF Symbols, which have no icon box.
  same-box    stroke in 24-box units for the SVG libraries (rendered at 10x, so px/10). What you get
              when every icon sits in the same 24 px box. SF is scaled to Lucide's glyph size per concept.
"""
import json, os
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt
from skimage.morphology import skeletonize

PNG = 'png'
SF = ['ultralight', 'thin', 'light', 'regular', 'medium', 'semibold', 'bold', 'heavy', 'black']
MATERIAL = [100, 200, 300, 400, 500, 600, 700]
order = [f'sf@{w}' for w in SF] + [f'material@{w}' for w in MATERIAL] + ['lucide@2', 'heroicons@outline']


def load(path):
    return np.asarray(Image.open(path).convert('L'), dtype=np.float32) < 128


def medial_thickness(ink):
    vals = 2 * distance_transform_edt(ink)[skeletonize(ink)]
    return float(np.median(vals))


def glyph_size(ink):
    ys, xs = np.where(ink)
    return int(max(ys.max() - ys.min() + 1, xs.max() - xs.min() + 1))


concepts = sorted(f[:-4] for f in os.listdir(f'{PNG}/lucide@2'))
data = {}
for key in order:
    for c in concepts:
        path = f'{PNG}/{key}/{c}.png'
        if os.path.exists(path):
            ink = load(path)
            data[(key, c)] = (medial_thickness(ink), glyph_size(ink))
lucide_size = {c: data[('lucide@2', c)][1] for c in concepts}


def same_box(key, c):
    t, size = data[(key, c)]
    return t * (lucide_size[c] / size) / 10 if key.startswith('sf@') else t / 10


summary = {}
print(f"{'variant':18} {'n':>3} | {'same-glyph':>10} {'IQR':>12} | {'same-box':>8} {'IQR':>10}")
for key in order:
    ratios = np.array([data[(key, c)][0] / data[(key, c)][1] for c in concepts if (key, c) in data])
    boxes = np.array([same_box(key, c) for c in concepts if (key, c) in data])
    r = np.percentile(ratios, [25, 50, 75]); b = np.percentile(boxes, [25, 50, 75])
    summary[key] = dict(n=int(len(ratios)), ratio=float(r[1]), ratio_iqr=[float(r[0]), float(r[2])], box=float(b[1]), box_iqr=[float(b[0]), float(b[2])])
    print(f"{key:18} {len(ratios):3} | {100*r[1]:9.1f}% {100*r[0]:5.1f}–{100*r[2]:4.1f} | {b[1]:8.2f} {b[0]:4.2f}–{b[2]:4.2f}")


def nearest(target, keys, field='ratio'):
    return min(keys, key=lambda k: abs(np.log(summary[k][field] / target)))


mat = [k for k in summary if k.startswith('material@')]
sf = [k for k in summary if k.startswith('sf@')]
lucide_ratio = summary['lucide@2']['ratio']

print("\nEquivalences by same-glyph thickness (SF's only meaningful normalization):")
print(f"{'target':18} {'Material':>12} {'SF':>14} {'Lucide stroke (glyph parity)':>28} {'Lucide stroke (same box)':>25}")
for key in sf + mat + ['lucide@2', 'heroicons@outline']:
    s = summary[key]
    print(f"{key:18} {nearest(s['ratio'], mat):>12} {nearest(s['ratio'], sf):>14} {2 * s['ratio'] / lucide_ratio:28.2f} {s['box']:25.2f}")

json.dump(
    {'method': 'medial-axis distance transform, median over skeleton; see docs/weights.md', 'summary': summary,
     'rows': {f'{k}/{c}': dict(t=v[0], size=v[1], ratio=v[0] / v[1], box=same_box(k, c)) for (k, c), v in data.items()}},
    open('measurements.json', 'w'), indent=1)
