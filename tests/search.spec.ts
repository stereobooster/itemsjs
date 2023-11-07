import { describe, it } from 'vitest';
import assert from 'node:assert';
import itemsJS from '../src/index';
import { clone } from 'lodash-es';
import { readFileSync } from 'node:fs';
import { Item, Movie, Movie_id, MovieId, MovieUuid } from './fixtures/types';
import { AggregationConfig, Configuration } from '../src/types.js';
const items = JSON.parse(
  readFileSync('./tests/fixtures/items.json').toString()
) as Item[];
const movies = JSON.parse(
  readFileSync('./tests/fixtures/movies.json').toString()
) as Movie[];

describe('search', () => {
  const configuration = {
    searchableFields: ['name', 'category', 'actors', 'name'],
    aggregations: {
      tags: {
        title: 'Tags',
        conjunction: true as boolean,
      },
      actors: {
        title: 'Actors',
        conjunction: true as boolean,
      },
      year: {
        title: 'Year',
        conjunction: true as boolean,
      },
      in_cinema: {
        title: 'Is played in Cinema',
        conjunction: true as boolean,
      },
      category: {
        title: 'Category',
        conjunction: true as boolean,
      },
    },
  } as Configuration<
    Item,
    string,
    { tags: {}; actors: {}; year: {}; in_cinema: {}; category: AggregationConfig }
  >;

  it('index is empty so cannot search', () => {
    try {
      // @ts-expect-error ok
      const itemsjs = itemsJS();
      itemsjs.search();
    } catch (err) {
      assert.equal((err as Error).message, 'index first then search');
    }
  });

  it('searches no params', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({});

    assert.equal(result.data.items.length, 4);
    assert.deepEqual(result.data.items[0].category, 'drama');
    assert.deepEqual(result.data.items[0].year, 1995);
    assert.deepEqual(result.data.items[0].in_cinema, false);

    assert.deepEqual(result.data.items[0].in_cinema, false);
    assert.equal(result.data.aggregations.in_cinema.buckets[0].doc_count, 3);
    assert.equal(result.data.aggregations.in_cinema.buckets[1].doc_count, 1);
    assert.equal(result.data.aggregations.in_cinema.buckets.length, 2);

    //console.log(result.data.aggregations.category);
    //console.log(result.data.aggregations.in_cinema);
    //console.log(result.data.aggregations.year);
  });

  it('searches with two filters', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      filters: {
        tags: ['a'],
        category: ['drama'],
      },
    });

    assert.equal(result.data.items.length, 2);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 2);
  });

  it('searches with filters query', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      filters_query: 'tags:c',
    });

    assert.equal(result.data.items.length, 3);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 3);
  });

  it('searches with filters query and filters', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      filters_query: 'tags:c',
      filters: {
        tags: ['z'],
      },
    });

    assert.equal(result.data.items.length, 1);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 1);
  });

  it('searches with filters query not existing value', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      filters_query: 'tags:not_existing',
    });

    assert.equal(result.data.items.length, 0);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 0);
  });

  it('searches with filter and query', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      filters: {
        tags: ['a'],
      },
      query: 'comedy',
    });

    assert.equal(result.data.items.length, 2);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 2);
    assert.equal(result.data.aggregations.category.buckets[0].key, 'comedy');
    assert.equal(result.data.aggregations.category.buckets[0].doc_count, 2);
  });

  it('makes search with empty filters', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      filters: {},
    });

    assert.equal(result.data.items.length, 4);
  });

  it('makes search with not filters', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      not_filters: {
        tags: ['c'],
      },
    });

    assert.equal(result.data.items.length, 1);
  });

  it('makes search with many not filters', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      not_filters: {
        tags: ['c', 'e'],
      },
    });

    assert.equal(result.data.items.length, 0);
  });

  it('makes search with non existing filter value with conjunction true should return no results', () => {
    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      filters: {
        category: ['drama', 'thriller'],
      },
    });

    assert.equal(result.data.items.length, 0);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 0);
  });

  it('makes search with non existing filter value with conjunction false should return results', () => {
    const localConfiguration = clone(configuration);
    localConfiguration.aggregations!.category!.conjunction = false;

    const itemsjs = itemsJS(items, localConfiguration);

    const result = itemsjs.search({
      filters: {
        category: ['drama', 'thriller'],
      },
    });

    assert.equal(result.data.items.length, 2);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 2);
  });

  it('makes search with non existing single filter value with conjunction false should return no results', () => {
    const localConfiguration = clone(configuration);
    localConfiguration.aggregations!.category!.conjunction = false;

    const itemsjs = itemsJS(items, configuration);

    const result = itemsjs.search({
      filters: {
        category: ['thriller'],
      },
    });

    assert.equal(result.data.items.length, 0);
    assert.equal(result.data.aggregations.tags.buckets[0].doc_count, 0);
  });

  it('throws an error if name does not exist', () => {
    const itemsjs = itemsJS(items, {
      native_search_enabled: false,
    });

    try {
      itemsjs.search({
        query: 'xxx',
      });
    } catch (err) {
      assert.equal(
        (err as Error).message,
        '"query" and "filter" options are not working once native search is disabled'
      );
    }
  });
});

describe('no configuration', () => {
  const configuration = {
    aggregations: {},
  };

  it('searches with two filters', () => {
    const itemsjs = itemsJS(items, configuration);
    const result = itemsjs.search({});

    assert.equal(result.data.items.length, 4);
  });

  it('searches with filter', () => {
    const itemsjs = itemsJS(items, configuration);

    let result = itemsjs.search({
      filter: () => {
        return false;
      },
    });

    assert.equal(result.data.items.length, 0);

    result = itemsjs.search({});

    assert.equal(result.data.items.length, 4);
  });
});

describe('custom fulltext integration', () => {
  const configuration = {
    aggregations: {
      tags: {},
      year: {},
    },
  } as Configuration<Movie, string, { tags: {}; year: {} }>;

  it('makes faceted search after separated quasi fulltext with _ids', () => {
    const itemsjs = itemsJS(movies, configuration);
    let i = 1;
    const temp_movies = movies.map((v: any) => {
      v._id = i++;
      return v as Movie_id;
    });

    const result = itemsjs.search({
      _ids: temp_movies.map((v) => v._id).slice(0, 1),
    });

    assert.equal(result.data.items.length, 1);
  });

  it('makes faceted search after separated quasi fulltext with ids', () => {
    let i = 10;
    const temp_movies = movies.map((v: any) => {
      v.id = i;
      i += 10;
      return v as MovieId;
    });

    const itemsjs = itemsJS(
      temp_movies,
      configuration as Configuration<
        MovieId,
        string,
        { tags: {}; categories: {} }
      >
    );

    let result = itemsjs.search({
      ids: temp_movies.map((v) => v.id).slice(0, 1),
    });

    assert.equal(result.data.items[0].id, 10);
    assert.equal(result.data.items[0]._id, 1);
    assert.equal(result.data.items.length, 1);

    result = itemsjs.search({
      ids: [50, 20],
    });

    assert.equal(result.data.items[0].id, 50);
    assert.equal(result.data.items[0]._id, 5);
    assert.equal(result.data.items.length, 2);
  });

  it('makes faceted search after separated quasi fulltext with custom id field', () => {
    let i = 10;
    const temp_movies = movies.map((v: any) => {
      v.uuid = i;
      i += 10;
      delete v.id;
      return v as MovieUuid;
    });

    configuration.custom_id_field = 'uuid';

    const itemsjs = itemsJS(
      temp_movies,
      configuration as Configuration<
        MovieUuid,
        string,
        { tags: {}; categories: {} }
      >
    );

    let result = itemsjs.search({
      ids: temp_movies.map((v) => v.uuid).slice(0, 1),
    });

    assert.equal(result.data.items[0].uuid, 10);
    assert.equal(result.data.items[0]._id, 1);
    assert.equal(result.data.items.length, 1);

    result = itemsjs.search({
      ids: [50, 20],
    });

    assert.equal(result.data.items[0].uuid, 50);
    assert.equal(result.data.items[0]._id, 5);
    assert.equal(result.data.items.length, 2);
  });
});
