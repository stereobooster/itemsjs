import { describe, it } from 'vitest';
import assert from 'node:assert';
import { input_to_facet_filters, parse_boolean_query } from '../src/helpers';

describe('parsing filters to matrix', () => {
  it('makes conjunction', () => {
    const result = input_to_facet_filters(
      {
        filters: {
          tags: ['novel', '90s'],
        },
      },
      {
        tags: {
          conjunction: true,
        },
      },
    );

    assert.deepEqual(
      [
        ['tags', 'novel'],
        ['tags', '90s'],
      ],
      result,
    );
  });

  it('makes disjunction', () => {
    const result = input_to_facet_filters(
      {
        filters: {
          tags: ['novel', '90s'],
        },
      },
      {
        tags: {
          conjunction: false,
        },
      },
    );

    //assert.deepEqual([ [ [ 'tags', 'novel' ] ], [ [ 'tags', '90s' ] ] ], result);
    assert.deepEqual(
      [
        [
          ['tags', 'novel'],
          ['tags', '90s'],
        ],
      ],
      result,
    );
  });

  it('makes conjuction and disjunction', () => {
    const result = input_to_facet_filters(
      {
        filters: {
          tags: ['novel'],
          category: ['Western'],
        },
      },
      {
        tags: {
          conjunction: false,
        },
        category: {
          conjunction: true,
        },
      },
    );

    assert.deepEqual([[['tags', 'novel']], ['category', 'Western']], result);
  });

  it('makes disjunction for two different groups', () => {
    const result = input_to_facet_filters(
      {
        filters: {
          tags: ['novel'],
          category: ['Western'],
        },
      },
      {
        tags: {
          conjunction: false,
        },
        category: {
          conjunction: false,
        },
      },
    );

    assert.deepEqual([[['tags', 'novel']], [['category', 'Western']]], result);
  });

  it('makes negative filter', () => {
    const result = input_to_facet_filters(
      {
        not_filters: {
          tags: ['novel', '90s'],
        },
      },
      {
        tags: {
          conjunction: true,
        },
      },
    );

    assert.deepEqual(
      [
        ['tags', '-', 'novel'],
        ['tags', '-', '90s'],
      ],
      result,
    );
  });

  it('makes conjuction and disjunction and negative filter', () => {
    const result = input_to_facet_filters(
      {
        filters: {
          tags: ['novel'],
          category: ['Western'],
        },
        not_filters: {
          tags: ['80s'],
        },
      },
      {
        tags: {
          conjunction: false,
        },
        category: {
          conjunction: true,
        },
      },
    );

    assert.deepEqual(
      [[['tags', 'novel']], ['category', 'Western'], ['tags', '-', '80s']],
      result,
    );
  });
});

describe('parsing boolean queries', () => {
  it('normalize query - accepts small letters operator etc remove white spaces', () => {});

  it('makes conjunction', () => {
    const result = parse_boolean_query('(tags:novel AND tags:90s)');
    assert.deepEqual(
      [
        [
          ['tags', 'novel'],
          ['tags', '90s'],
        ],
      ],
      result,
    );
  });

  it('makes disjunction', () => {
    const result = parse_boolean_query('(tags:novel OR tags:90s)');
    assert.deepEqual([[['tags', 'novel']], [['tags', '90s']]], result);
  });

  it('makes conjunction and disjunction', () => {
    const result = parse_boolean_query('tags:novel OR category:Western');
    assert.deepEqual([[['tags', 'novel']], [['category', 'Western']]], result);
  });
});
