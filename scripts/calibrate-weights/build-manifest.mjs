// Builds the calibration set: for each concept, the four library names, and downloads
// Material SVGs at every weight. Writes manifest.json for render.swift and measure.py.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CONCEPTS = [
  'circle',
  'square',
  'plus',
  'minus',
  'check',
  'close',
  'arrow-right',
  'chevron-right',
  'heart',
  'star',
  'bell',
  'search',
  'settings',
  'trash',
  'home',
  'mail',
  'user',
  'folder',
  'calendar',
  'clock',
  'lock',
  'eye',
  'camera',
  'bookmark',
  'flag',
  'link',
  'pencil',
  'copy',
  'download',
  'globe',
];
const MATERIAL_WEIGHTS = [100, 200, 300, 400, 500, 600, 700];
const data = JSON.parse(readFileSync('../../dist/rosetta.json', 'utf8'));
const LUCIDE_DIR = process.env.LUCIDE_ICONS ?? 'node_modules/lucide-static/icons';
const HERO_DIR = process.env.HEROICONS ?? 'node_modules/heroicons';

mkdirSync('svg/material', { recursive: true });
const manifest = [];
for (const concept of CONCEPTS) {
  const libs = data.icons[concept].libraries;
  const entry = {
    concept,
    sf: libs.sf?.name,
    material: libs.material?.name,
    lucide: libs.lucide?.name,
    heroicons: libs.heroicons?.name,
    files: {},
  };
  if (entry.lucide) entry.files[`lucide@2`] = `${LUCIDE_DIR}/${entry.lucide}.svg`;
  if (entry.heroicons) {
    entry.files[`heroicons@outline`] = `${HERO_DIR}/24/outline/${entry.heroicons}.svg`;
    entry.files[`heroicons@solid`] = `${HERO_DIR}/24/solid/${entry.heroicons}.svg`;
    if (existsSync(`${HERO_DIR}/20/solid/${entry.heroicons}.svg`))
      entry.files[`heroicons@mini`] = `${HERO_DIR}/20/solid/${entry.heroicons}.svg`;
  }
  if (entry.material) {
    for (const w of MATERIAL_WEIGHTS) {
      const file = `svg/material/${entry.material}-${w}.svg`;
      if (!existsSync(file)) {
        try {
          execFileSync('curl', [
            '-sfL',
            '-o',
            file,
            `https://unpkg.com/@material-symbols/svg-${w}/outlined/${entry.material}.svg`,
          ]);
        } catch {
          console.log(`material ${entry.material} @${w}: download failed`);
          continue;
        }
      }
      entry.files[`material@${w}`] = `${process.cwd()}/${file}`;
    }
  }
  manifest.push(entry);
}
writeFileSync('manifest.json', JSON.stringify(manifest, null, 1));
console.log(`${manifest.length} concepts, ${manifest.reduce((n, e) => n + Object.keys(e.files).length, 0)} svg files`);
