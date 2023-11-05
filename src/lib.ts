import { orderBy, intersection as _intersection } from 'lodash-es';
import FastBitSet from 'fastbitset';
import { getBuckets, clone } from './helpers.js';
import {
  AggregationOptions,
  Configuration,
  Item,
  PRecord,
  SearchOptions,
  SimilarOptions,
  Sorting,
} from './types.js';
import { Fulltext } from './fulltext.js';
import { Facets } from './facets.js';

/**
 * search by filters
 */
export function search<
  I extends Item,
  S extends string,
  A extends keyof I & string
>(
  items: I[],
  input: SearchOptions<I, S, A>,
  configuration: Configuration<I, S, A>,
  fulltext: Fulltext<I, S, A>,
  facets: Facets<I, S, A>
) {
  input = input || Object.create(null);

  // @ts-expect-error TS knows this is a number, but JS implementation doing it to be on safe side
  const per_page = parseInt(input.per_page || 12);
  // @ts-expect-error TS knows this is a number, but JS implementation doing it to be on safe side
  const page = parseInt(input.page || 1);
  const is_all_filtered_items = input.is_all_filtered_items || false;

  if (
    configuration.native_search_enabled === false &&
    (input.query || input.filter)
  ) {
    throw new Error(
      '"query" and "filter" options are not working once native search is disabled'
    );
  }

  let search_time = 0;
  const total_time_start = new Date().getTime();
  let query_ids;
  // all ids bitmap
  let filtered_indexes_bitmap = facets.bits_ids();
  let _ids;
  let all_filtered_items;

  if (input._ids) {
    query_ids = new FastBitSet(input._ids);
    _ids = input._ids;
  } else if (input.ids) {
    _ids = facets.internal_ids_from_ids_map(input.ids);
    //console.log(_ids);
    query_ids = new FastBitSet(_ids);
  } else if (fulltext && (input.query || input.filter)) {
    const search_start_time = new Date().getTime();
    _ids = fulltext.search(input.query, input.filter);
    search_time = new Date().getTime() - search_start_time;
    query_ids = new FastBitSet(_ids);
  }

  let facets_time = new Date().getTime();
  const facet_result = facets.search(input, {
    query_ids: query_ids,
  });
  facets_time = new Date().getTime() - facets_time;

  if (query_ids) {
    filtered_indexes_bitmap = query_ids;
  }

  if (facet_result.ids) {
    filtered_indexes_bitmap = filtered_indexes_bitmap.new_intersection(
      facet_result.ids
    );
  }

  if (facet_result.not_ids) {
    filtered_indexes_bitmap = filtered_indexes_bitmap.new_difference(
      facet_result.not_ids
    );
  }

  // new filters to items
  // -------------------------------------
  let filtered_indexes = filtered_indexes_bitmap.array();

  let filtered_items = filtered_indexes.map((_id) => {
    return facets.get_item(_id);
  });

  /**
   * sorting items
   */
  let paginationApplied = false;
  const sorting_start_time = new Date().getTime();
  let sorting_time = 0;
  if (input.sort) {
    // @ts-expect-error fix me
    filtered_items = sorted_items(
      // @ts-expect-error fix me
      filtered_items,
      input.sort,
      configuration.sortings
    );
  } else {
    if (_ids) {
      filtered_indexes = _ids.filter((v) => {
        return filtered_indexes_bitmap.has(v);
      });

      const filtered_items_indexes = filtered_indexes.slice(
        (page - 1) * per_page,
        page * per_page
      );
      filtered_items = filtered_items_indexes.map((_id) => {
        return facets.get_item(_id);
      });

      paginationApplied = true;
    }
  }
  // pagination
  if (!paginationApplied) {
    all_filtered_items = is_all_filtered_items ? filtered_items : null;
    filtered_items = filtered_items.slice(
      (page - 1) * per_page,
      page * per_page
    );
  }

  sorting_time = new Date().getTime() - sorting_start_time;

  const total_time = new Date().getTime() - total_time_start;

  //console.log(facet_result);

  return {
    pagination: {
      per_page: per_page,
      page: page,
      total: filtered_indexes.length,
    },
    timings: {
      total: total_time,
      facets: facets_time,
      //filter: filter_time,
      search: search_time,
      sorting: sorting_time,
    },
    data: {
      items: filtered_items,
      allFilteredItems: all_filtered_items,
      //aggregations: aggregations,
      aggregations: getBuckets(facet_result, input, configuration.aggregations!),
    },
  };
}

/**
 * return items by sort
 */
export function sorted_items<I extends Record<string, any>, S extends string>(
  items: I[],
  sort: S | Sorting<I>,
  sortings?: PRecord<S, Sorting<I>>
): I[] {
  if (sortings && sortings[sort as S]) {
    sort = sortings[sort as S]!;
  }

  if ((sort as Sorting<I>).field) {
    return orderBy(
      items,
      (sort as Sorting<I>).field,
      (sort as Sorting<I>).order || 'asc'
    );
  }

  return items;
}

/**
 * returns list of elements in aggregation
 * useful for autocomplete or list all aggregation options
 */
export function similar<I extends Item>(
  items: I[],
  id: I extends { id: infer ID } ? ID : unknown,
  options: SimilarOptions<I>
) {
  const per_page = options.per_page || 10;
  const minimum = options.minimum || 0;
  const page = options.page || 1;

  let item: I;

  for (let i = 0; i < items.length; ++i) {
    if (items[i].id == id) {
      item = items[i];
      break;
    }
  }

  if (!options.field) {
    throw new Error('Please define field in options');
  }

  const field = options.field;
  let sorted_items: Array<I & { intersection_length: number }> = [];

  for (let i = 0; i < items.length; ++i) {
    if (items[i].id !== id) {
      const intersection = _intersection(item![field], items[i][field]);

      if (intersection.length >= minimum) {
        sorted_items.push(items[i] as any);
        sorted_items[sorted_items.length - 1].intersection_length =
          intersection.length;
      }
    }
  }

  sorted_items = orderBy(sorted_items, ['intersection_length'], ['desc']);

  return {
    pagination: {
      per_page: per_page,
      page: page,
      total: sorted_items.length,
    },
    data: {
      items: sorted_items.slice((page - 1) * per_page, page * per_page),
    },
  };
}

/**
 * returns list of elements in specific facet
 * useful for autocomplete or list all aggregation options
 */
export function aggregation<
  I extends Item,
  S extends string,
  A extends keyof I & string
>(
  items: I[],
  input: AggregationOptions<A>,
  configuration: Configuration<I, S, A>,
  fulltext: Fulltext<I, S, A>,
  facets: Facets<I, S, A>
) {
  const per_page = input.per_page || 10;
  const page = input.page || 1;

  if (
    input.name &&
    (!configuration.aggregations || !configuration.aggregations[input.name])
  ) {
    throw new Error(
      'Please define aggregation "'.concat(input.name, '" in config')
    );
  }

  const search_input = clone(input);

  search_input.page = 1;
  search_input.per_page = 0;

  if (!input.name) {
    throw new Error('field name is required');
  }

  configuration!.aggregations![input.name]!.size = 10000;

  // @ts-expect-error fix me
  const result = search(items, search_input, configuration, fulltext, facets);
  const buckets = result.data.aggregations[input.name].buckets;

  return {
    pagination: {
      per_page: per_page,
      page: page,
      total: buckets.length,
    },
    data: {
      buckets: buckets.slice((page - 1) * per_page, page * per_page),
    },
  };
}
