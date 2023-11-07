import { search, similar, aggregation } from './lib';
import { mergeAggregations } from './helpers';
import { Fulltext } from './fulltext';
import { Facets } from './facets';
import {
  AggregationConfig,
  AggregationOptions,
  Configuration,
  Item,
  SearchOptions,
  SearchOptionsInternal,
  SimilarOptions,
} from './types';

export {
  Configuration,
  SearchOptions,
  AggregationOptions,
  SimilarOptions,
  Item,
};

export default function itemsjs<I extends Item, S extends string, C extends { [K in keyof I]?: AggregationConfig }>(
  items: I[],
  configuration?: Configuration<I, S, C>
) {
  items = items || []
  configuration = configuration || Object.create(null);

  // upsert id to items
  // throw error in tests if id does not exists

  let fulltext: Fulltext<I>;
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
    search: (input?: SearchOptions<I, S, C>) => {
      const inputInternal: SearchOptionsInternal<I, S, C> =
        input || Object.create(null);

      /**
       * merge configuration aggregation with user input
       */
      inputInternal.aggregations = mergeAggregations(
        configuration!.aggregations!,
        inputInternal
      );

      return search(items, inputInternal, configuration!, fulltext, facets);
    },

    /**
     * It returns similar items to item for given id
     */
    similar: (
      id: I extends { id: infer ID } ? ID : unknown,
      options: SimilarOptions<I>
    ) => {
      return similar(items, id, options);
    },

    /**
     * It returns full list of filters for specific aggregation
     */
    aggregation: (input: AggregationOptions<I, S, C>) =>
      aggregation(items, input, configuration!, fulltext, facets),

    /**
     * It's used in case you need to reindex the whole data
     */
    reindex: (newItems: I[]) => {
      items = newItems;
      fulltext = new Fulltext(items, configuration);
      facets = new Facets(items, configuration);
    },
  };
}
