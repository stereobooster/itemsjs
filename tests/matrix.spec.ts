import { describe, it } from 'vitest';
import assert from 'node:assert';
import { index, matrix, combination_indexes } from '../src/helpers';

describe('filtering and generating facets with matrix (9 rows in dataset)', () => {
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

    const result = matrix(data);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), [1, 2, 4, 6, 7]);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), [3, 5, 8, 9]);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), [1, 4, 6, 9]);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), [2, 3, 5, 7, 8]);
    assert.deepEqual(
      result.bits_data_temp.c['3'].array(),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
  });

  it('checks matrix with some values', () => {
    const data = index(items, fields);

    const result = combination_indexes<'a' | 'b'>(data, [[['a', 2]]]);
    assert.deepEqual([3, 5, 8, 9], result.a.array());
    assert.deepEqual(undefined, result.b);

    const result1 = matrix<'a' | 'b' | 'c'>(data, [['a', 2]]);
    assert.deepEqual(result1.bits_data_temp.a['1'].array(), []);
    assert.deepEqual(result1.bits_data_temp.a['2'].array(), [3, 5, 8, 9]);
    assert.deepEqual(result1.bits_data_temp.b['2'].array(), [9]);
    assert.deepEqual(result1.bits_data_temp.b['3'].array(), [3, 5, 8]);
    assert.deepEqual(result1.bits_data_temp.c['3'].array(), [3, 5, 8, 9]);
  });

  it('checks matrix with one not existing value', () => {
    const data = index(items, fields);

    const result = matrix<'a' | 'b' | 'c'>(data, [
      ['a', 2],
      ['c', 2],
    ]);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), []);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), []);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), []);
  });

  it('checks matrix with one not existing value and check again with another values', () => {
    const data = index(items, fields);

    // const result = matrix(data, [['a', 2], ['c', 2]]);

    const result2 = matrix(data);
    assert.deepEqual(result2.bits_data_temp.a['1'].array(), [1, 2, 4, 6, 7]);
    assert.deepEqual(result2.bits_data_temp.a['2'].array(), [3, 5, 8, 9]);
    assert.deepEqual(result2.bits_data_temp.b['2'].array(), [1, 4, 6, 9]);
    assert.deepEqual(result2.bits_data_temp.b['3'].array(), [2, 3, 5, 7, 8]);
    assert.deepEqual(
      result2.bits_data_temp.c['3'].array(),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
  });

  it('checks matrix with disjunctive values', () => {
    const data = index(items, fields);

    const result = combination_indexes(data, [
      [
        ['a', 1],
        ['a', 2],
      ],
    ]);
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9], result.a.array());
    assert.deepEqual(undefined, result.b);

    const result1 = matrix(data, [
      [
        ['a', 1],
        ['a', 2],
      ],
    ]);
    assert.deepEqual(result1.bits_data_temp.a['1'].array(), [1, 2, 4, 6, 7]);
    assert.deepEqual(result1.bits_data_temp.a['2'].array(), [3, 5, 8, 9]);
    assert.deepEqual(result1.bits_data_temp.b['2'].array(), [1, 4, 6, 9]);
    assert.deepEqual(result1.bits_data_temp.b['3'].array(), [2, 3, 5, 7, 8]);
    assert.deepEqual(
      result1.bits_data_temp.c['3'].array(),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
  });

  it('checks matrix with disjunctive values (ittocean case)', () => {
    const data = index(items, fields);

    const result = combination_indexes(data, [
      [['a', 1]],
      [['b', 2]],
      [['c', 3]],
    ]);
    assert.deepEqual([1, 2, 4, 6, 7], result.a.array());
    assert.deepEqual([1, 4, 6, 9], result.b.array());
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9], result.c.array());

    const result1 = matrix(data, [[['a', 1]], [['b', 2]], [['c', 3]]]);
    assert.deepEqual(result1.bits_data_temp.a['1'].array(), [1, 4, 6]);
    assert.deepEqual(result1.bits_data_temp.a['2'].array(), [9]);
    assert.deepEqual(result1.bits_data_temp.b['2'].array(), [1, 4, 6]);
    assert.deepEqual(result1.bits_data_temp.b['3'].array(), [2, 7]);
    assert.deepEqual(result1.bits_data_temp.c['3'].array(), [1, 4, 6]);
  });
});

describe('filtering and generating facets for another dataset (3 rows in dataset)', () => {
  const items = [
    { a: 1, b: 1, c: 3 },
    { a: 2, b: 2, c: 3 },
    { a: 3, b: 3, c: 3 },
  ];

  const fields = ['a', 'b', 'c'] as ['a', 'b', 'c'];

  it('checks matrix with disjunctive values', () => {
    const data = index(items, fields);

    const result = matrix(data, [
      [
        ['a', 1],
        ['a', 2],
      ],
    ]);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), [1]);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), [2]);
    assert.deepEqual(result.bits_data_temp.a['3'].array(), [3]);
    assert.deepEqual(result.bits_data_temp.b['1'].array(), [1]);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), [2]);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), []);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), [1, 2]);
  });

  it('checks matrix with one disjunctive value', () => {
    const data = index(items, fields);

    const result = matrix<'a' | 'b' | 'c'>(data, [[['a', 1]]]);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), [1]);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), [2]);
    assert.deepEqual(result.bits_data_temp.a['3'].array(), [3]);
    assert.deepEqual(result.bits_data_temp.b['1'].array(), [1]);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), []);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), [1]);
  });

  it('checks matrix with many disjunctive values', () => {
    const data = index(items, fields);
    const result = matrix(data, [[['a', 1]], [['b', 1]], [['c', 3]]]);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), [1]);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.a['3'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['1'].array(), [1]);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), []);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), [1]);
  });

  it('checks matrix with negative filter values', () => {
    const data = index(items, fields);
    const result = matrix<'a' | 'b' | 'c'>(data, [['a', '-', 1]]);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), []);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), [2]);
    assert.deepEqual(result.bits_data_temp.a['3'].array(), [3]);
    assert.deepEqual(result.bits_data_temp.b['1'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), [2]);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), [3]);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), [2, 3]);
  });

  it('checks matrix with negative filter values (2)', () => {
    const data = index(items, fields);
    const result = matrix<'a' | 'b' | 'c'>(data, [
      ['a', '-', 1],
      ['b', '-', 2],
    ]);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), []);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.a['3'].array(), [3]);
    assert.deepEqual(result.bits_data_temp.b['1'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['2'].array(), []);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), [3]);
    assert.deepEqual(result.bits_data_temp.c['3'].array(), [3]);
  });
});

describe('filtering and generating facets (4 rows in dataset)', () => {
  const items = [
    { a: 1, b: 3 },
    { a: 1, b: 4 },
    { a: 2, b: 3 },
    { a: 2, b: 4 },
  ];

  const fields = ['a', 'b'] as ['a', 'b'];

  it('checks matrix with disjunctive values', () => {
    const data = index(items, fields);

    const result = matrix(data);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), [1, 2]);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), [3, 4]);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), [1, 3]);
    assert.deepEqual(result.bits_data_temp.b['4'].array(), [2, 4]);
  });

  it.skip('checks matrix with disjunctive values', () => {
    const data = index(items, fields);

    const result = matrix<'a' | 'b'>(data, [[['a', 1]]]);
    assert.deepEqual(result.bits_data_temp.a['1'].array(), [1, 2]);
    assert.deepEqual(result.bits_data_temp.a['2'].array(), [3, 4]);
    assert.deepEqual(result.bits_data_temp.b['3'].array(), [1]);
    assert.deepEqual(result.bits_data_temp.b['4'].array(), [2]);
  });

  it('checks matrix with disjunctive values', () => {
    const data = index(items, fields);

    const result = combination_indexes(data, [[['b', 3]], [['a', 1]]]);
    assert.deepEqual([1, 2], result.a.array());
    assert.deepEqual([1, 3], result.b.array());

    const result1 = matrix(data, [[['b', 3]], [['a', 1]]]);
    assert.deepEqual([1], result1.bits_data_temp.a['1'].array());
    assert.deepEqual([3], result1.bits_data_temp.a['2'].array());
    assert.deepEqual([1], result1.bits_data_temp.b['3'].array());
    assert.deepEqual([2], result1.bits_data_temp.b['4'].array());
  });
});
