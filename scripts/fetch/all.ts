import { fetchHeroicons } from './heroicons.ts';
import { fetchLucide } from './lucide.ts';
import { fetchMaterial } from './material.ts';
import { fetchSF } from './sf.ts';

const only = process.argv.slice(2);
const fetchers: Record<string, () => void | Promise<void>> = {
  lucide: fetchLucide,
  material: fetchMaterial,
  heroicons: fetchHeroicons,
  sf: fetchSF,
};

for (const [id, run] of Object.entries(fetchers)) {
  if (only.length && !only.includes(id)) continue;
  try {
    await run();
  } catch (error) {
    console.error(`${id}: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
