const LIBRARY_PREFIX = /^(sf|sfsymbols?|material|materialsymbols?|lucide|heroicons?|hero|tailwind):/;
const PATH_PREFIX = /^(?:\d+\/)?(outline|solid|filled?|rounded|sharp|mini|micro)\//;
const STYLE_SUFFIX = /-(fill|filled|solid|outline|outlined|rounded|sharp|mini|micro)$/;
const FILLED = new Set(['fill', 'filled', 'solid']);

export interface NormalizedInput {
  key: string;
  fill: boolean;
}

/**
 * Collapses every library's spelling to one lookup key:
 * `square.and.arrow.up`, `arrow_forward`, `ArrowForward`, `arrowForward` → `square-and-arrow-up`, `arrow-forward`.
 * Style markers (`heart.fill`, `heart-solid`, `24/solid/heart`) are stripped and reported.
 */
export function normalize(input: string): NormalizedInput {
  let text = input.trim().replace(LIBRARY_PREFIX, '');
  let fill = false;

  const pathStyle = text.match(PATH_PREFIX);
  if (pathStyle) {
    fill ||= FILLED.has(pathStyle[1]);
    text = text.slice(pathStyle[0].length);
  }
  text = text.replace(/\.svg$/, '');

  let key = text
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const suffix = key.match(STYLE_SUFFIX);
  if (suffix) {
    fill ||= FILLED.has(suffix[1]);
    key = key.slice(0, key.length - suffix[0].length);
  }

  return { key, fill };
}

export const tokens = (key: string) => key.split('-').filter(Boolean);

export const tokenKey = (key: string) => tokens(key).sort().join('-');
