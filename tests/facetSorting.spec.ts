import { describe, it } from 'vitest';
import assert from 'node:assert';
import itemsJS from '../src/index';

const items = [
  {
    genres: 'Western',
  },
  {
    genres: 'Western',
  },
  {
    genres: 'Comedy',
  },
  {
    genres: 'Drama',
  },
  {
    genres: 'Horror',
  },
  {
    genres: 'Romance',
  },
  {
    genres: 'Western',
  },
];

describe('facet sorting', () => {
  it('sort by key', () => {
    const result = itemsJS(items, {
      aggregations: {
        genres: {
          sort: ['key'],
        },
      },
    }).aggregation({
      name: 'genres',
    });

    assert.deepEqual(
      result.data.buckets.map((v) => v.key),
      ['Comedy', 'Drama', 'Horror', 'Romance', 'Western'],
    );
  });

  it('sort by key (field, not array)', () => {
    const result = itemsJS(items, {
      aggregations: {
        genres: {
          sort: 'key',
          order: 'desc',
        },
      },
    }).aggregation({
      name: 'genres',
    });

    assert.deepEqual(
      result.data.buckets.map((v) => v.key),
      ['Western', 'Romance', 'Horror', 'Drama', 'Comedy'],
    );
  });

  it('sort by key descending', () => {
    const result = itemsJS(items, {
      aggregations: {
        genres: {
          sort: ['key'],
          order: ['desc'],
        },
      },
    }).aggregation({
      name: 'genres',
    });

    assert.deepEqual(
      result.data.buckets.map((v) => v.key),
      ['Western', 'Romance', 'Horror', 'Drama', 'Comedy'],
    );
  });

  it('sort by doc_count', () => {
    const result = itemsJS(items, {
      aggregations: {
        genres: {
          sort: ['doc_count'],
          order: ['desc'],
        },
      },
    }).aggregation({
      name: 'genres',
    });

    assert.deepEqual(
      result.data.buckets.map((v) => v.key),
      ['Western', 'Comedy', 'Drama', 'Horror', 'Romance'],
    );
  });

  it('sort by count', () => {
    const result = itemsJS(items, {
      aggregations: {
        genres: {
          sort: 'count',
          order: 'desc',
        },
      },
    }).aggregation({
      name: 'genres',
    });

    assert.deepEqual(
      result.data.buckets.map((v) => v.key),
      ['Western', 'Comedy', 'Drama', 'Horror', 'Romance'],
    );
  });

  it('sort by doc_count and key and order key desc', () => {
    const result = itemsJS(items, {
      aggregations: {
        genres: {
          sort: ['doc_count', 'key'],
          order: ['desc', 'desc'],
        },
      },
    }).aggregation({
      name: 'genres',
    });

    assert.deepEqual(
      result.data.buckets.map((v) => v.key),
      ['Western', 'Romance', 'Horror', 'Drama', 'Comedy'],
    );
  });

  it('sort by selected, key and order by desc, asc if sort is term', () => {
    const result_array = itemsJS(items, {
      aggregations: {
        genres: {
          sort: ['selected', 'key'],
          order: ['desc', 'asc'],
        },
      },
    }).aggregation({
      name: 'genres',
    });

    const result_term = itemsJS(items, {
      aggregations: {
        genres: {
          sort: 'term',
        },
      },
    }).aggregation({
      name: 'genres',
    });

    assert.deepEqual(result_array.data.buckets, result_term.data.buckets);
  });

  it('sort by selected if chosen_filters_on_top is not set', () => {
    const result = itemsJS(items, {
      aggregations: {
        genres: {
          sort: 'term',
        },
      },
    }).aggregation({
      name: 'genres',
      filters: {
        genres: ['Drama', 'Romance'],
      },
    });

    assert.deepEqual(
      result.data.buckets.map((v) => v.key),
      ['Drama', 'Romance', 'Comedy', 'Horror', 'Western'],
    );
  });

  it('does not sort by selected if chosen_filters_on_top is false', () => {
    const result = itemsJS(items, {
      aggregations: {
        genres: {
          sort: 'key',
          chosen_filters_on_top: false,
        },
      },
    }).aggregation({
      name: 'genres',
      filters: {
        genres: ['Drama', 'Romance'],
      },
    });

    assert.deepEqual(
      result.data.buckets.map((v) => v.key),
      ['Comedy', 'Drama', 'Horror', 'Romance', 'Western'],
    );
  });

  it('excludes filters with zero doc_count if hide_zero_doc_count is true', () => {
    const result = itemsJS(items, {
      aggregations: {
        genres: {
          hide_zero_doc_count: true,
        },
      },
    }).aggregation({
      name: 'genres',
      filters: {
        genres: ['Western'],
      },
    });

    assert.deepEqual(
      result.data.buckets.map((v) => v.key),
      ['Western'],
    );
  });
});
