import { search, similar, aggregation } from './lib.js';
import { mergeAggregations } from './helpers.js';
import { Fulltext } from './fulltext.js';
import { Facets } from './facets.js';
import {
  AggregationOptions,
  Buckets,
  Configuration,
  Item,
  ItemWithId,
  Pagination,
  SearchAggregation,
  SearchOptions,
  SimilarOptions,
} from './types.js';

function itemsjs<I extends Item, S extends string, A extends keyof I & string>(
  items: I[],
  configuration?: Configuration<I, S, A>
) {
  configuration = configuration || Object.create(null);

  // upsert id to items
  // throw error in tests if id does not exists

  let fulltext: Fulltext<I, S, A>;
  if (configuration!.native_search_enabled !== false) {
    fulltext = new Fulltext(items, configuration);
  }

  // index facets
  let facets = new Facets(items, configuration);

  return {
    /**
     * per_page
     * page
     * query
     * sort
     * filters
     */
    search: function (input?: SearchOptions<I, S, A>): {
      data: {
        items: ItemWithId<Item>[];
        allFilteredItems: ItemWithId<Item>[] | null;
        aggregations: Record<A, SearchAggregation<I, A>>;
      };
      pagination: Pagination;
      timings: {
        facets: number;
        search: number;
        sorting: number;
        total: number;
      };
    } {
      input = input || Object.create(null);

      /**
       * merge configuration aggregation with user input
       */
      input!.aggregations = mergeAggregations(
        configuration!.aggregations!,
        input!
      );

      // @ts-expect-error
      return search(items, input, configuration!, fulltext, facets);
    },

    /**
     * returns list of similar elements to specified item id
     * id
     */
    similar: function (
      id: I extends { id: infer ID } ? ID : unknown,
      options: SimilarOptions<I>
    ): {
      data: {
        items: Array<I & { intersection_length: number }>;
      };
      pagination: Pagination;
    } {
      return similar(items, id, options);
    },

    /**
     * returns list of elements for specific aggregation i.e. list of tags
     * name (aggregation name)
     * query
     * per_page
     * page
     */
    aggregation: function (input: AggregationOptions<A>): {
      data: { buckets: Buckets<A> };
      pagination: Pagination;
    } {
      return aggregation(items, input, configuration!, fulltext, facets);
    },

    /**
     * reindex items
     * reinitialize fulltext search
     */
    reindex: function (newItems: I[]) {
      items = newItems;
      fulltext = new Fulltext(items, configuration);
      facets = new Facets(items, configuration);
    },
  };
}

export default itemsjs;
