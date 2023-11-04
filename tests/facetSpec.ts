import assert from 'node:assert';
import itemsJS from '../src/index.ts';

import { readFileSync } from 'node:fs';
import { Movie } from './fixtures/types.ts';
const items = JSON.parse(readFileSync('./tests/fixtures/movies.json').toString()) as Movie[];

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

describe('aggregation / facet', function () {
  const itemsjs = itemsJS(items, configuration);

  it('makes error if name does not exist', function test(done) {
    try {
      itemsjs.aggregation({
        // @ts-expect-error
        name: 'category2',
      });
    } catch (err) {
      assert.equal(
        (err as Error).message,
        'Please define aggregation "category2" in config',
      );
    }

    done();
  });

  it('makes single facet', function test(done) {
    const result = itemsjs.aggregation({
      name: 'genres',
    });

    assert.equal(result.data.buckets.length, 10);

    done();
  });

  it('makes single facet with pagination', function test(done) {
    const result = itemsjs.aggregation({
      name: 'genres',
      page: 1,
      per_page: 1,
    });

    assert.equal(result.data.buckets.length, 1);
    done();
  });

  it('makes single facet pagination', function test(done) {
    const result = itemsjs.aggregation({
      name: 'genres',
      page: 1,
      per_page: 12,
    });

    assert.equal(result.data.buckets.length, 12);

    done();
  });
});
