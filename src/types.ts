export type LibraryId = 'sf' | 'material' | 'lucide' | 'heroicons' | (string & {});

export type MatchQuality = 'exact' | 'close' | 'approximate';

export interface Mapping {
  name: string;
  /** Filled variant name when the library uses a distinct name for it. */
  fill?: string;
  match: MatchQuality;
  note?: string;
  /** False when the library name is ambiguous across libraries and must not resolve on its own. */
  bridge?: false;
}

export interface Icon {
  name: string;
  category: string;
  aliases: string[];
  description?: string;
  libraries: Partial<Record<LibraryId, Mapping>>;
}

export interface FillStyle {
  kind: 'vendor-map' | 'axis' | 'set' | 'none';
  set?: string;
  note?: string;
}

export interface Library {
  id: LibraryId;
  name: string;
  vendor: string;
  homepage: string;
  naming: string;
  example: string;
  version: string;
  fetched: string;
  usage: Record<string, string>;
  styles: { fill: FillStyle; [style: string]: FillStyle | { kind: string; family?: string; note?: string } };
  /** Weight variant → measured stroke thickness as a fraction of glyph size (docs/weights.md). */
  weights?: Record<string, number>;
  notes?: string[];
}

export interface WeightValue {
  value: string | number;
  match: MatchQuality;
  note?: string;
}

export interface Weight {
  /** Measured stroke thickness as a fraction of glyph size. */
  ratio: number;
  /** Library → the weight name, `wght` value or Lucide strokeWidth that renders at this thickness. */
  libraries: Partial<Record<LibraryId, WeightValue>>;
}

export interface Dataset {
  version: string;
  generated: string;
  libraries: Record<string, Library>;
  icons: Record<string, Icon>;
  /** Canonical weight scale (thin … black) with each library's equivalent; `regular` is every library's default. */
  weights: Record<string, Weight>;
  /** Normalized key → canonical name, covering canonical names, curated aliases and every mapped library name. */
  index: Record<string, string>;
}

export type ResolvedVia = 'canonical' | 'alias' | 'tokens';

export interface Resolution {
  /** Canonical Rosetta name. */
  name: string;
  icon: Icon;
  via: ResolvedVia;
  /** True when the input asked for a filled style (`heart.fill`, `heart-solid`, `{ fill: true }`). */
  fill: boolean;
}

export interface Translation {
  library: LibraryId;
  /** The name to use in the target library. */
  name: string;
  /** Canonical Rosetta name the input resolved to. */
  concept: string;
  /** False when the mapping is approximate or a requested style was unavailable. */
  exact: boolean;
  match: MatchQuality;
  /** Whether `name` renders filled. */
  fill: boolean;
  /** Library-specific hint for rendering the style, e.g. `FILL 1` or `24/solid`. */
  variant?: string;
  note?: string;
}

export interface TranslateOptions {
  fill?: boolean;
}
