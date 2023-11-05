import { describe, it } from 'vitest';
import assert from 'node:assert';
import itemsJS from '../src/index.js';

import { readFileSync } from 'node:fs';
import { Movie } from './fixtures/types';
const items = JSON.parse(
  readFileSync('./tests/fixtures/movies.json').toString(),
) as Movie[];

const configuration = {
  aggregations: {
    actors: {
      conjunction: true,
    },
    genres: {
      conjunction: true,
    },
    year: {
      conjunction: true,
    },
    director: {
      conjunction: true,
    },
  },
};

describe('aggregation / facet', () => {
  const itemsjs = itemsJS(items, configuration);

  it('makes error if name does not exist', () => {
    try {
      itemsjs.aggregation({
        // @ts-expect-error ok
        name: 'category2',
      });
    } catch (err) {
      assert.equal(
        (err as Error).message,
        'Please define aggregation "category2" in config',
      );
    }
  });

  it('makes single facet', () => {
    const result = itemsjs.aggregation({
      name: 'genres',
    });

    assert.equal(result.data.buckets.length, 10);
  });

  it('makes single facet with pagination', () => {
    const result = itemsjs.aggregation({
      name: 'genres',
      page: 1,
      per_page: 1,
    });

    assert.equal(result.data.buckets.length, 1);
  });

  it('makes single facet pagination', () => {
    const result = itemsjs.aggregation({
      name: 'genres',
      page: 1,
      per_page: 12,
    });

    assert.equal(result.data.buckets.length, 12);
  });
});
