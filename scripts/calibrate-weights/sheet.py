import json, os
m = json.load(open('measurements.json'))
order = ['sf@ultralight','sf@thin','sf@light','sf@regular','sf@medium','sf@semibold','sf@bold','sf@heavy','sf@black','material@100','material@200','material@300','material@400','material@500','material@600','material@700','lucide@2','heroicons@outline','heroicons@solid']
concepts = sorted(next(iter(m['rows'].values())).keys())
head = ''.join(f'<th><div>{k.replace("@","<br>")}</div><small>{m["summary"][k]["ratio"]*100:.1f}%</small></th>' for k in order)
body = ''
for c in concepts:
    cells = ''.join(f'<td><img src="png/{k}/{c}.png" loading="lazy"><small>{m["rows"][k][c]["ratio"]*100:.1f}</small></td>' if c in m['rows'].get(k, {}) else '<td>—</td>' for k in order)
    body += f'<tr><th>{c}</th>{cells}</tr>'
html = f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stroke weight calibration</title>
<style>body{{font:14px -apple-system,system-ui;margin:1rem;color:#111;background:#fff}}table{{border-collapse:collapse}}th,td{{padding:4px;text-align:center;border:1px solid #eee;vertical-align:bottom}}
thead th{{position:sticky;top:0;background:#fff;font-size:11px}}tbody th{{position:sticky;left:0;background:#fff;text-align:right;font-weight:600}}
img{{width:56px;height:56px;display:block;margin:auto;border:1px solid #f0f0f0}}small{{color:#888;font-size:10px}}
p{{max-width:70ch;color:#444}}</style>
<h1>Stroke weight calibration</h1>
<p>Each cell shows the glyph and its measured stroke thickness as a percentage of the glyph's bounding box (median per column in the header). Thickness is 2·area/perimeter of the ink. SF Symbols rendered on this Mac at point size 100; Material from the per-weight SVG packages; Lucide at its default stroke 2; Heroicons 24/outline (1.5) and 24/solid. Columns are the variants; rows are the 30 calibration concepts.</p>
<table><thead><tr><th></th>{head}</tr></thead><tbody>{body}</tbody></table>'''
open('index.html','w').write(html)
print('ok', len(concepts))
