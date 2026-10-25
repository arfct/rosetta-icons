import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { icon, icons, libraries, names, resolve, translate, translateAll } from '../src/index.ts';

describe('resolve', () => {
  it('accepts canonical names', () => {
    assert.equal(resolve('search')?.via, 'canonical');
  });

  it('accepts curated aliases', () => {
    assert.equal(resolve('magnifier')?.name, 'search');
    assert.equal(resolve('delete')?.name, 'trash');
    assert.equal(resolve('settings')?.name, 'settings');
    assert.equal(resolve('gear')?.name, 'settings');
  });

  it("accepts every library's own name in its own spelling", () => {
    assert.equal(resolve('magnifyingglass')?.name, 'search');
    assert.equal(resolve('square.and.arrow.up')?.name, 'share');
    assert.equal(resolve('arrow_forward')?.name, 'arrow-right');
    assert.equal(resolve('cog-6-tooth')?.name, 'settings');
    assert.equal(resolve('house')?.name, 'home');
  });

  it('accepts names a library has since renamed', () => {
    assert.equal(resolve('home')?.name, 'home', 'lucide renamed home → house');
    assert.equal(resolve('alert-triangle')?.name, 'warning', 'lucide renamed alert-triangle → triangle-alert');
    assert.equal(resolve('expand_more')?.name, 'chevron-down', 'material symbols dropped expand_more');
    assert.equal(resolve('auto_awesome')?.name, 'sparkles', 'material symbols dropped auto_awesome');
  });

  it('accepts reordered qualifiers', () => {
    assert.equal(resolve('circle-check')?.name, 'check-circle');
    assert.equal(resolve('circle-user')?.name, 'user-circle');
  });

  it('reports a fill request from the input', () => {
    assert.equal(resolve('heart.fill')?.fill, true);
    assert.equal(resolve('heart')?.fill, false);
  });

  it('refuses ambiguous bare names rather than guessing', () => {
    assert.equal(resolve('forward'), undefined);
    assert.equal(resolve('definitely-not-an-icon'), undefined);
  });
});

describe('translate', () => {
  it('maps a canonical name into each library', () => {
    assert.equal(icon('search', 'sf'), 'magnifyingglass');
    assert.equal(icon('search', 'material'), 'search');
    assert.equal(icon('search', 'lucide'), 'search');
    assert.equal(icon('search', 'heroicons'), 'magnifying-glass');
  });

  it('bridges from one library to another', () => {
    assert.equal(icon('magnifyingglass', 'lucide'), 'search');
    assert.equal(icon('open_in_new', 'heroicons'), 'arrow-top-right-on-square');
  });

  it('handles fill per library', () => {
    assert.deepEqual(pick(translate('heart', 'sf', { fill: true })), {
      name: 'heart.fill',
      fill: true,
      exact: true,
    });
    assert.deepEqual(pick(translate('heart.fill', 'material')), {
      name: 'favorite',
      fill: true,
      exact: true,
      variant: 'FILL 1',
    });
    assert.deepEqual(pick(translate('heart-solid', 'heroicons')), {
      name: 'heart',
      fill: true,
      exact: true,
      variant: '24/solid',
    });
    const lucide = translate('heart', 'lucide', { fill: true });
    assert.deepEqual(pick(lucide), { name: 'heart', fill: false, exact: false });
    assert.match(lucide?.note ?? '', /stroke-only/);
  });

  it('flags approximate mappings', () => {
    const t = translate('rocket', 'sf');
    assert.equal(t?.exact, false);
    assert.equal(t?.match, 'approximate');
  });

  it('returns undefined for unknown libraries or names', () => {
    assert.equal(translate('search', 'nope'), undefined);
    assert.equal(translate('nope', 'sf'), undefined);
  });

  it('translates into every library at once', () => {
    const all = translateAll('trash');
    assert.deepEqual(Object.keys(all ?? {}).sort(), ['heroicons', 'lucide', 'material', 'sf']);
  });
});

describe('dataset', () => {
  it('has libraries with versions', () => {
    for (const id of ['sf', 'material', 'lucide', 'heroicons']) assert.ok(libraries[id]?.version, id);
  });

  it('lists every icon by name', () => {
    assert.equal(names.length, Object.keys(icons).length);
    assert.ok(names.length > 300);
  });
});

const pick = (t?: { name: string; fill: boolean; exact: boolean; variant?: string }) =>
  t && { name: t.name, fill: t.fill, exact: t.exact, ...(t.variant ? { variant: t.variant } : {}) };

describe('weights', () => {
  it('maps the canonical scale into every library with a weight axis', async () => {
    const { weights } = await import('../src/index.ts');
    assert.deepEqual(Object.keys(weights), [
      'thin',
      'light',
      'regular',
      'medium',
      'semibold',
      'bold',
      'heavy',
      'black',
    ]);
    assert.equal(weights.regular.libraries.sf?.value, 'regular');
    assert.equal(weights.regular.libraries.material?.value, 400);
    assert.equal(weights.regular.libraries.lucide?.value, 1.7);
    assert.equal(weights.regular.libraries.heroicons?.value, 'outline');
    assert.equal(weights.heavy.libraries.material?.match, 'approximate');
    assert.ok(weights.bold.ratio > weights.regular.ratio);
  });
});
