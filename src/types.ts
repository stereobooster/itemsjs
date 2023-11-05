import FastBitSet from 'fastbitset';

/* ----------------------- External types ----------------------- */

export interface SearchOptions<
  I extends Item,
  S extends string,
  A extends keyof I & string
> {
  /**
   * used for full text search.
   */
  query?: string;
  /**
   * page number - used for pagination.
   * @default 1
   */
  page?: number;
  /**
   * amount of items per page.
   * @default 12
   */
  per_page?: number;
  /**
   * The name of a sort defined in the configuration's sortings, or a new custom one
   */
  sort?: S | Sorting<I>;
  /**
   * filtering items based on specific aggregations i.e. `{tags: ['drama' , 'historical']}`
   */
  filters?: PRecord<A, Array<string | number>>;
  /**
   * function responsible for items filtering. The way of working is similar to js [native filter function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter). [See example](https://github.com/itemsapi/itemsjs/blob/master/docs/configuration.md)
   */
  filter?: (item: ItemWithId<I>) => boolean; // eslint-disable-line no-unused-vars
  /**
   * boolean filtering i.e. `(tags:novel OR tags:80s) AND category:Western`
   */
  filters_query?: string;
  /**
   * set to `true` if you want to return the whole filtered dataset.
   * @default false
   */
  is_all_filtered_items?: boolean;
  // TODO: add documentation
  // used in tests see `makes search with not filters`
  not_filters?: PRecord<A, Array<string | number>>;
  // used in tests see `makes faceted search after separated quasi fulltext with _ids`
  _ids?: number[];
  // used in tests see `makes faceted search after separated quasi fulltext with ids`
  ids?: number[];
}

export interface AggregationConfig {
  /**
   * Human readable filter name
   */
  title?: string;
  /**
   * `true` (Default) stands for an **AND** query (results have to fit all selected facet-values),
   * `false` for an **OR** query (results have to fit one of the selected facet-values)
   * @default true
   */
  conjunction?: boolean;
  /**
   * Number of values provided for this filter
   * @default 10
   */
  size?: number;
  /**
   * Values sorted by `count` (Default) or `key` for the value name. This can be also an array of keys which define the sorting priority
   * @default 'count'
   */
  sort?: Sort | Array<Sort>;
  /**
   * `asc` | `desc`. This can be also an array of orders (if `sort` is also array)
   * @default 'asc'
   */
  order?: Order | Array<Order>;
  /**
   * `true` | `false` (Default) to retrieve the `min`, `max`, `avg`, `sum` rating values from the whole filtered dataset
   * @default false
   */
  show_facet_stats?: boolean;
  /**
   * `true` | `false` (Default) Hide filters that have 0 results returned
   * @default false
   */
  hide_zero_doc_count?: boolean;
  /**
   * `true` (Default) Filters that have been selected will appear above those not selected,
   * `false` for filters displaying in the order set out by sort and order regardless of selected status or not
   * @default true
   */
  chosen_filters_on_top?: boolean;
}

export interface AggregationOptions<
  I extends Item,
  S extends string,
  A extends keyof I & string
> extends SearchOptions<I, S, A> {
  /**
   * aggregation name
   */
  name?: A;
}

export interface SimilarOptions<I extends Item> {
  /**
   * field name for computing similarity (i.e. `tags`, `actors`, `colors`)
   */
  field: keyof I & string;
  /**
   * what is the minimum intersection between field of based item and similar item to show them in the result
   * @default 0
   */
  minimum?: number;
  /**
   * page number
   * @default 1
   */
  page?: number;
  /**
   * filters per page
   * @default 10
   */
  per_page?: number;
}

export type Order = 'asc' | 'desc';
export type Sort = 'doc_count' | 'selected' | 'key' | 'term' | 'count';

export interface Sorting<I extends Record<string, any>> {
  field: keyof I | Array<keyof I>;
  order?: Order | Order[];
}

/** Configuration for itemsjs */
export interface Configuration<
  I extends Item,
  S extends string,
  A extends keyof I & string
> {
  /**
   * filters configuration i.e. for `tags`, `actors`, `colors`, etc. Responsible for generating facets.
   * Each filter can have it's own configuration. You can access those as `buckets` on the `search()` response.
   */
  aggregations?: PRecord<A, AggregationConfig>;
  /**
   * you can configure different sortings like `tags_asc`, `tags_desc` with options and later use it with one key.
   */
  sortings?: Record<S, Sorting<I>>;
  /**
   * an array of searchable fields
   */
  searchableFields?: Array<keyof I>;
  /**
   * if native full text search is enabled (`true` | `false`. It's enabled by default)
   * @default true
   */
  native_search_enabled?: boolean;
  /**
   * set to true if you want to always show exact search matches. See [lunr stemmer](https://github.com/olivernn/lunr.js/issues/328) and [lunr stopWordFilter](https://github.com/olivernn/lunr.js/issues/233).
   * @default false
   */
  isExactSearch?: boolean;
  /**
   * set to true if you want to remove the stopWordFilter. See [#46](https://github.com/itemsapi/itemsjs/issues/46).
   * @default false
   */
  removeStopWordFilter?: boolean;
  /**
   * 'id' is a default one but we can also use 'uuid' and other if necessary
   */
  custom_id_field?: string;
}

/* ----------------------- Internal types ----------------------- */

export type PRecord<K extends string | number | symbol, V> = Partial<
  Record<K, V>
>;

// https://stackoverflow.com/a/63549561/1190041
export type Item = Record<string, any> & { _id?: never };

export type ItemWithId<
  T extends Item = Item,
  K extends keyof T = Exclude<keyof T, '_id'>
> = { _id: number } & {
  [KK in K]: T[K]; // eslint-disable-line no-unused-vars
};

export type FacetData<A extends string> = {
  data: Record<A, Record<string | number, Array<any>>>;
  bits_data: Record<A, Record<string | number, FastBitSet>>;
  bits_data_temp: Record<A, Record<string | number, FastBitSet>>;
  not_ids?: FastBitSet | null;
  ids?: FastBitSet | null;
  is_temp_copied?: boolean;
};

export type Filter<A extends string> =
  | [A, string | number]
  | [A, '-', string | number];
export type Filters<A extends string> = Filter<A> | Filter<A>[];
export type FiltersArray<A extends string> = Array<Filters<A>>;

export interface Bucket<K> {
  key: K;
  doc_count: number;
  selected: boolean;
}

export type Buckets<K> = Array<Bucket<K>>;

export interface SearchAggregation<I extends Item, A extends keyof I & string> {
  name: A;
  title: string;
  position: number;
  buckets: Buckets<A>;
  facet_stats?: {
    min: number;
    max: number;
    sum: number;
    avg: number;
  };
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
}

export interface AggregationOptionsInternal<A extends string>
  extends AggregationConfig {
  field?: A;
  filters: Array<string | number>;
  not_filters: Array<string | number>;
}

export interface SearchOptionsInternal<
  I extends Item,
  S extends string,
  A extends keyof I & string
> extends SearchOptions<I, S, A> {
  aggregations?: PRecord<A, AggregationOptionsInternal<A>>;
  // alias for `not_filters`
  exclude_filters?: PRecord<A, Array<string | number>>;
}
