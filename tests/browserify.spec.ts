import { describe, it } from 'vitest';
import assert from 'node:assert';
import itemsJS from '../src/index';

describe('itemjs general tests', () => {
  const items = [
    {
      name: 'movie1',
      tags: ['a', 'b', 'c', 'd'],
      actors: ['a', 'b'],
    },
    {
      name: 'movie2',
      tags: ['a', 'e', 'f'],
      actors: ['a', 'b'],
    },
    {
      name: 'movie3',
      tags: ['a', 'c'],
      actors: ['e'],
    },
  ];

  const similarItems = [
    {
      name: 'movie1',
      tags: 'Another tag',
    },
    {
      name: 'movie2',
      tags: 'Another',
    },
    {
      name: 'movie3',
      tags: 'Another tag',
    },
  ];

  const itemsjs = itemsJS(items);

  it('makes search', () => {
    const result = itemsjs.search();
    assert.equal(result.data.items.length, 3);
  });

  it('makes search with pagination', () => {
    let result = itemsjs.search({
      per_page: 1,
    });
    assert.equal(result.data.items.length, 1);

    result = itemsjs.search({
      per_page: 1,
      page: 4,
    });
    assert.equal(result.data.items.length, 0);

    result = itemsjs.search({
      per_page: 1,
      page: 3,
    });
    assert.equal(result.data.items.length, 1);
  });

  it('makes search with pagination, and is_all_filtered_items', () => {
    let result = itemsjs.search({
      per_page: 1,
      is_all_filtered_items: true,
    });
    assert.equal(result.data.items.length, 1);
    assert.equal(result.data.allFilteredItems?.length, 3);

    result = itemsjs.search({
      per_page: 1,
      is_all_filtered_items: false,
    });
    assert.equal(result.data.items.length, 1);
    assert.equal(result.data.allFilteredItems, null);

    result = itemsjs.search({
      per_page: 1,
    });
    assert.equal(result.data.items.length, 1);
    assert.equal(result.data.allFilteredItems, null);
  });

  it('makes search with pagination and filter', () => {
    const result = itemsjs.search({
      per_page: 1,
      page: 3,
      filter: (item) => item.tags.includes('a'),
    });

    assert.equal(result.data.items.length, 1);
  });

  it('makes search with aggregation filters', () => {
    const itemsjs = itemsJS(items, {
      aggregations: {
        tags: {},
        actors: {},
      },
    });

    let result = itemsjs.search({
      filters: {
        tags: ['e', 'f'],
      },
    });
    assert.equal(result.data.items.length, 1);

    result = itemsjs.search({
      filters: {
        tags: ['e', 'f'],
        actors: ['a', 'b'],
      },
    });
    assert.equal(result.data.items.length, 1);

    /*var result = itemsjs.search({
      filters: {
        tags: ['e', 'f'],
        actors: ['a', 'd']
      }
    });
    assert.equal(result.data.items.length, 0);

    var result = itemsjs.search();
    assert.equal(result.data.items.length, 3);*/
  });

  it('makes search with aggregation filters with single value object', () => {
    const itemsjs = itemsJS(similarItems, {
      aggregations: {
        tags: {},
      },
    });

    const result = itemsjs.search();
    assert.equal(result.data.items.length, 3);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 2); // Another tag
    assert.equal(result.data.aggregations.tags.buckets[1].doc_count, 1); // Another

    /*var result = itemsjs.search({
      query: '',
      filters: {
        name: [],
        tags: ['Another tag']
      },
      per_page: Infinity
    });
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, result.data.items.length);
    assert.equal(result.data.items.length, 2);

    var result = itemsjs.search({
      filters: {
        tags: ['Another']
      }
    });
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, result.data.items.length);
    assert.equal(result.data.items.length, 1);*/
  });

  it('makes aggregations when configuration supplied', () => {
    const itemsjs = itemsJS(items, {
      aggregations: {
        tags: {
          // type: 'terms',
          size: 10,
          title: 'Tags',
        },
      },
    });
    const result = itemsjs.search({});

    assert.equal(result.data.items.length, 3);
    //assert.equal(result.data.aggregations.tags.name, 'tags');
    assert.equal(result.data.aggregations.tags.buckets.length, 6);
  });

  it('makes aggregations for non array (string) fields', () => {
    const items = [
      {
        name: 'movie1',
        tags: 'a',
      },
      {
        name: 'movie2',
        tags: 'a',
      },
      {
        name: 'movie3',
        tags: 'a',
      },
    ];

    const itemsjs = itemsJS(items, {
      aggregations: {
        tags: {
          // type: 'terms',
          size: 10,
          title: 'Tags',
        },
      },
    });
    const result = itemsjs.search({});
    assert.equal(result.data.items.length, 3);
    //assert.equal(result.data.aggregations.tags.name, 'tags');
    assert.equal(result.data.aggregations.tags.buckets.length, 1);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 3);
  });

  it('makes aggregations with facet_stats', () => {
    const items = [
      {
        name: 'Apple 7',
        price: 1,
      },
      {
        name: 'Apple 8',
        price: 1,
      },
      {
        name: 'Apple 9',
        price: '7',
      },
      {
        name: 'Samsung',
        price: 7,
      },
      {
        name: 'Apple 10',
      },
    ];

    const itemsjs = itemsJS(items, {
      aggregations: {
        price: {
          title: 'Price',
          size: 3,
          show_facet_stats: true,
        },
      },
    });

    const result = itemsjs.search({
      query: 'Apple',
    });

    assert.equal(result.data.aggregations.price.facet_stats?.min, 1);
    assert.equal(result.data.aggregations.price.facet_stats?.max, 7);
    assert.equal(result.data.aggregations.price.facet_stats?.avg, 3);
    assert.equal(result.data.aggregations.price.facet_stats?.sum, 9);
  });

  it('makes aggregations with facet_stats and string values', () => {
    const items = [
      {
        name: 'movie1',
        tags: '€ 1 euro',
      },
      {
        name: 'movie2',
        tags: '€ 1 euro',
      },
      {
        name: 'movie3',
        tags: '€ 1 euro',
      },
    ];

    const itemsjs = itemsJS(items, {
      aggregations: {
        tags: {
          title: 'Tags',
          size: 1,
          show_facet_stats: true,
        },
      },
    });

    try {
      itemsjs.search({
        query: '',
      });
    } catch (err) {
      assert.equal(
        (err as Error).message,
        'You cant use chars to calculate the facet_stats.',
      );
    }
  });

  it.skip('makes aggregations for undefined field', () => {
    const items = [
      {
        name: 'movie1',
      },
      {
        name: 'movie2',
      },
      {
        name: 'movie3',
      },
    ];

    const itemsjs = itemsJS(items, {
      aggregations: {
        // @ts-expect-error ok
        tags: {
          // type: 'terms',
          size: 10,
          title: 'Tags',
        },
      },
    });
    const result = itemsjs.search({});
    assert.equal(result.data.items.length, 3);
    //assert.equal(result.data.aggregations.tags.buckets.length, {});
  });

  it('search by tags', () => {
    const items = [
      {
        name: 'movie1',
        tags: ['drama'],
      },
      {
        name: 'movie2',
        tags: ['drama', 'crime'],
      },
      {
        name: 'movie3',
      },
    ];

    const itemsjs = itemsJS(items, {
      searchableFields: ['name', 'tags'],
    });
    let result = itemsjs.search({
      query: 'drama',
    });
    assert.equal(result.data.items.length, 2);

    result = itemsjs.search({
      query: 'crime',
    });
    assert.equal(result.data.items.length, 1);
  });
});
