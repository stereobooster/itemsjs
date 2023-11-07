import { describe, it } from 'vitest';
import assert from 'node:assert';
import {
  index,
  filters_matrix,
  filters_ids,
  parse_boolean_query,
} from '../src/helpers';

describe('filtering matrix (9 rows in dataset)', () => {
  const items = [
    { a: 1, b: 2, c: 3, d: 3 },
    { a: 1, b: 3, c: 3, d: 3 },
    { a: 2, b: 3, c: 3, d: 3 },
    { a: 1, b: 2, c: 3, d: 3 },
    { a: 2, b: 3, c: 3, d: 3 },
    { a: 1, b: 2, c: 3, d: 3 },
    { a: 1, b: 3, c: 3, d: 3 },
    { a: 2, b: 3, c: 3, d: 3 },
    { a: 2, b: 2, c: 3, d: 3 },
  ];

  const fields = ['a', 'b', 'c'] as ['a', 'b', 'c'];

  it('checks matrix with no argument provided', () => {
    const data = index(items, fields);

    const result = filters_matrix(data);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), [1, 2, 4, 6, 7]);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), [3, 5, 8, 9]);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), [1, 4, 6, 9]);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), [2, 3, 5, 7, 8]);
    assert.deepEqual(
      result.bits_data_temp.c['3'].array(),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
    );

    const ids = filters_ids(result.bits_data_temp);
    assert.deepEqual(ids.array(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('filters matrix with one value', () => {
    const data = index(items, fields);
    const filters = parse_boolean_query<any>('(a:2)');

    const result = filters_matrix(data, filters);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), []);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), [3, 5, 8, 9]);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), [9]);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), [3, 5, 8]);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), [3, 5, 8, 9]);

    const ids = filters_ids(result.bits_data_temp);
    assert.deepEqual(ids.array(), [3, 5, 8, 9]);
  });

  it('makes OR which returns all rows', () => {
    const data = index(items, fields);
    const filters = parse_boolean_query<any>('(a:2) OR c:3');

    const result = filters_matrix(data, filters);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), [1, 2, 4, 6, 7]);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), [3, 5, 8, 9]);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), [1, 4, 6, 9]);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), [2, 3, 5, 7, 8]);
    assert.deepEqual(
      result.bits_data_temp.c['3'].array(),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
    );

    const ids = filters_ids(result.bits_data_temp);
    assert.deepEqual(ids.array(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('makes AND which returns no result', () => {
    const data = index(items, fields);
    const filters = parse_boolean_query<any>('a:2 AND a:1');

    const result = filters_matrix(data, filters);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), []);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), []);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), []);

    const ids = filters_ids(result.bits_data_temp);
    assert.deepEqual(ids.array(), []);
  });

  it('makes AND with not existing value', () => {
    const data = index(items, fields);
    const filters = parse_boolean_query<any>('a:2 AND a:10');

    const result = filters_matrix(data, filters);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), []);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), []);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), []);
  });

  it('filters not existing value', () => {
    const data = index(items, fields);
    const filters = parse_boolean_query<any>('a:10');

    const result = filters_matrix(data, filters);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), []);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), []);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), []);
  });

  it('filters not existing key', () => {
    const data = index(items, fields);
    const filters = parse_boolean_query<any>('e:10');

    try {
      filters_matrix(data, filters);
    } catch (err) {
      assert.equal(
        (err as Error).message,
        'Panic. The key does not exist in facets lists.',
      );
    }
  });
});
