import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalize } from '../src/normalize.ts';

describe('normalize', () => {
  it('collapses every library spelling to one key', () => {
    for (const input of [
      'arrow-up-right',
      'arrow_up_right',
      'arrow.up.right',
      'ArrowUpRight',
      'arrowUpRight',
      ' Arrow Up Right ',
    ]) {
      assert.equal(normalize(input).key, 'arrow-up-right', input);
    }
  });

  it('strips library prefixes', () => {
    assert.equal(normalize('sf:square.and.arrow.up').key, 'square-and-arrow-up');
    assert.equal(normalize('lucide:house').key, 'house');
  });

  it('detects fill styles from suffixes and paths', () => {
    assert.deepEqual(normalize('heart.fill'), { key: 'heart', fill: true });
    assert.deepEqual(normalize('heart-solid'), { key: 'heart', fill: true });
    assert.deepEqual(normalize('favorite-fill'), { key: 'favorite', fill: true });
    assert.deepEqual(normalize('24/solid/heart'), { key: 'heart', fill: true });
    assert.deepEqual(normalize('outline/heart.svg'), { key: 'heart', fill: false });
    assert.deepEqual(normalize('HeartIcon'), { key: 'heart-icon', fill: false });
  });

  it('leaves names that merely end in a style word alone', () => {
    assert.equal(normalize('fill').key, 'fill');
    assert.equal(normalize('solid').key, 'solid');
  });
});
