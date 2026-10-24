import { today, writeVendor } from './common.ts';

const METADATA_URL = 'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=1';
const SYMBOLS_FAMILY = 'Material Symbols Outlined';

interface MaterialIcon {
  name: string;
  version: number;
  popularity: number;
  unsupported_families: string[];
  categories: string[];
  tags: string[];
}

export async function fetchMaterial() {
  const response = await fetch(METADATA_URL);
  const text = await response.text();
  // Google prefixes the JSON with an anti-XSSI guard: )]}'
  const { icons }: { icons: MaterialIcon[] } = JSON.parse(text.slice(text.indexOf('{')));
  const symbols = icons.filter((icon) => !icon.unsupported_families.includes(SYMBOLS_FAMILY));
  const symbolNames = new Set(symbols.map((icon) => icon.name));
  const legacy = icons.filter((icon) => !symbolNames.has(icon.name)).map((icon) => icon.name);
  const maxVersion = Math.max(...symbols.map((icon) => icon.version));

  writeVendor(
    {
      library: 'material',
      version: `metadata-v${maxVersion}`,
      fetched: today(),
      source: METADATA_URL,
      names: symbols.map((icon) => icon.name),
      aliases: {},
      legacy,
    },
    {
      library: 'material',
      tags: Object.fromEntries(symbols.map((icon) => [icon.name, icon.tags])),
      categories: Object.fromEntries(symbols.map((icon) => [icon.name, icon.categories])),
      popularity: Object.fromEntries(symbols.map((icon) => [icon.name, icon.popularity])),
    },
  );
}

if (import.meta.main) await fetchMaterial();
