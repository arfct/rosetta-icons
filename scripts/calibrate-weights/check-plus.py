"""Cross-check the 2A/P thickness estimate against direct pixel-run measurement on simple glyphs.

plus:  thickness read as the ink run across one arm (column through the left arm, row through the top arm).
minus: thickness read as the ink run through the bar's middle.
"""
import os
import numpy as np
from PIL import Image

PNG = 'png'
order = [f'sf@{w}' for w in ('ultralight', 'thin', 'light', 'regular', 'medium', 'semibold', 'bold', 'heavy', 'black')] + [f'material@{w}' for w in (100, 200, 300, 400, 500, 600, 700)] + ['lucide@2', 'heroicons@outline']


def load(path):
    g = np.asarray(Image.open(path).convert('L'), dtype=np.float32)
    return g < 128


def bbox(ink):
    ys, xs = np.where(ink)
    return ys.min(), ys.max(), xs.min(), xs.max()


def run_length(line):
    """Longest run of ink along a 1-D slice (antialias-safe because we binarized at 50%)."""
    best = cur = 0
    for v in line:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def area_perimeter(ink):
    pad = np.pad(ink, 1)
    boundary = ink & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    return ink.sum(), boundary.sum()


def direct_plus(ink):
    y0, y1, x0, x1 = bbox(ink)
    h, w = y1 - y0 + 1, x1 - x0 + 1
    # Sample several positions inside each arm, away from the centre and the caps, take the median.
    cols = [int(x0 + w * f) for f in (0.12, 0.18, 0.24)]
    rows = [int(y0 + h * f) for f in (0.12, 0.18, 0.24)]
    t_h = np.median([run_length(ink[:, c]) for c in cols])   # horizontal arm's thickness
    t_v = np.median([run_length(ink[r, :]) for r in rows])   # vertical arm's thickness
    return (t_h + t_v) / 2, max(h, w)


def direct_minus(ink):
    y0, y1, x0, x1 = bbox(ink)
    w = x1 - x0 + 1
    cols = [int(x0 + w * f) for f in (0.3, 0.5, 0.7)]
    return np.median([run_length(ink[:, c]) for c in cols]), w


print(f"{'variant':18} {'plus direct':>11} {'plus 2A/P':>10} {'err':>6} | {'minus direct':>12} {'minus 2A/P':>10} {'err':>6} | {'plus t/size':>11} {'minus t/size':>12}")
rows = []
for key in order:
    out = [key]
    line = f"{key:18}"
    for name, direct in (('plus', direct_plus), ('minus', direct_minus)):
        path = f'{PNG}/{key}/{name}.png'
        if not os.path.exists(path):
            line += f" {'—':>11} {'—':>10} {'—':>6} |"
            out += [None, None, None]
            continue
        ink = load(path)
        t_direct, size = direct(ink)
        a, p = area_perimeter(ink)
        t_ap = 2 * a / p
        line += f" {t_direct:11.1f} {t_ap:10.1f} {100*(t_ap/t_direct-1):+5.0f}% |"
        out += [t_direct, t_ap, t_direct / size]
    line += f" {100*out[3]:10.1f}% {100*out[6]:11.1f}%" if out[3] and out[6] else ''
    print(line)
    rows.append(out)

print("\nKnown values: Lucide plus is stroke 2 rendered at 10x → 20 px; Heroicons plus is 1.5 → 15 px.")
