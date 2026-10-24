import { normalize, tokenKey } from './normalize.ts';
import type { Dataset, Icon, LibraryId, Mapping, Resolution, TranslateOptions, Translation } from './types.ts';

export function createRosetta(dataset: Dataset) {
  const { icons, libraries, index } = dataset;

  const tokenIndex = new Map<string, string | null>();
  for (const [key, canonical] of Object.entries(index)) {
    const tk = tokenKey(key);
    const existing = tokenIndex.get(tk);
    // Two concepts sharing a token set makes the reordering ambiguous; drop it rather than guess.
    tokenIndex.set(tk, existing === undefined || existing === canonical ? canonical : null);
  }

  function resolve(input: string): Resolution | undefined {
    const { key, fill } = normalize(input);
    if (!key) return undefined;

    const direct = index[key];
    if (direct)
      return {
        name: direct,
        icon: icons[direct],
        via: direct === key ? 'canonical' : 'alias',
        fill,
      };

    const reordered = tokenIndex.get(tokenKey(key));
    if (reordered) return { name: reordered, icon: icons[reordered], via: 'tokens', fill };

    return undefined;
  }

  function translateMapping(icon: Icon, library: LibraryId, mapping: Mapping, wantFill: boolean): Translation {
    const style = libraries[library]?.styles.fill;
    const base: Translation = {
      library,
      name: mapping.name,
      concept: icon.name,
      exact: mapping.match === 'exact',
      match: mapping.match,
      fill: false,
      note: mapping.note,
    };
    if (!wantFill) return base;

    switch (style?.kind) {
      case 'vendor-map':
        return mapping.fill
          ? { ...base, name: mapping.fill, fill: true }
          : {
              ...base,
              exact: false,
              note: joinNotes(base.note, `${library} has no filled variant of ${mapping.name}`),
            };
      case 'axis':
        return { ...base, fill: true, variant: 'FILL 1' };
      case 'set':
        return { ...base, fill: true, variant: style.set };
      default:
        return {
          ...base,
          exact: false,
          note: joinNotes(base.note, style?.note ?? `${library} has no filled variants`),
        };
    }
  }

  function translate(input: string, library: LibraryId, options: TranslateOptions = {}): Translation | undefined {
    const resolved = resolve(input);
    if (!resolved) return undefined;
    const mapping = resolved.icon.libraries[library];
    if (!mapping) return undefined;
    return translateMapping(resolved.icon, library, mapping, options.fill ?? resolved.fill);
  }

  function translateAll(
    input: string,
    options: TranslateOptions = {},
  ): Partial<Record<LibraryId, Translation>> | undefined {
    const resolved = resolve(input);
    if (!resolved) return undefined;
    const wantFill = options.fill ?? resolved.fill;
    return Object.fromEntries(
      Object.entries(resolved.icon.libraries)
        .filter((entry): entry is [string, Mapping] => entry[1] !== undefined)
        .map(([library, mapping]) => [library, translateMapping(resolved.icon, library, mapping, wantFill)]),
    );
  }

  const icon = (input: string, library: LibraryId, options?: TranslateOptions) =>
    translate(input, library, options)?.name;

  return {
    dataset,
    icons,
    libraries,
    names: Object.keys(icons),
    resolve,
    translate,
    translateAll,
    icon,
  };
}

const joinNotes = (...notes: (string | undefined)[]) => notes.filter(Boolean).join('; ') || undefined;
