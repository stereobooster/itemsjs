export interface Bucket<K> {
  key: K;
  doc_count: number;
  selected: boolean;
}

export type Buckets<K> = Array<Bucket<K>>;

export interface SearchAggregation<
  I extends Record<string, any>,
  A extends keyof I & string
> {
  name: A;
  title: string;
  position: number;
  buckets: Buckets<I[A]>;
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

export interface SearchOptions<
  I extends Record<string, any>,
  S extends string,
  A extends keyof I & string
> {
  query?: string;
  /** @default 1 */
  page?: number;
  /** @default 12 */
  per_page?: number;
  /** The name of a sort defined in the configuration's sortings, or a new custom one */
  sort?: S | Sorting<I>;
  filters?: Partial<Record<A, string[]>>;
  /** A custom function to filter values */
  filter?: (item: I) => boolean; // eslint-disable-line no-unused-vars
  /** @default false */
  isExactSearch?: boolean;
  /** @default false */
  removeStopWordFilter?: boolean;
  /** @default false */
  is_all_filtered_items?: boolean;
  // TODO: documentation
  aggregations?: Partial<Record<A, AggregationOptions<A>>>;
  filters_query?: string;
  not_filters?: Partial<Record<A, string[]>>;
  _ids?: number[];
  ids?: number[];
  custom_id_field?: string;
}

export interface AggregationOptions<A extends string> {
  name?: A;
  title?: string;
  /** @default 1 */
  page?: number;
  /** @default 10 */
  per_page?: number;
  query?: string;
  conjunction?: boolean;
  filters?: Partial<Record<A, string[]>>;
}

export interface SimilarOptions<I extends Record<string, any>> {
  field: keyof I & string;
  /** @default 0 */
  minimum?: number;
  /** @default 1 */
  page?: number;
  /** @default 10 */
  per_page?: number;
}

export type Order = 'asc' | 'desc';
export type Sort = 'doc_count' | 'selected' | 'key' | 'term' | 'count';

export interface Sorting<I extends Record<string, any>> {
  field: keyof I | Array<keyof I>;
  order?: Order | Order[];
}

export interface Aggregation {
  title?: string;
  conjunction?: boolean;
  /** @default 10 */
  size?: number;
  /** @default 'count' */
  sort?: Sort | Array<Sort>;
  /** @default 'asc' */
  order?: Order | Array<Order>;
  /** @default false */
  show_facet_stats?: boolean;
  /** @default false */
  hide_zero_doc_count?: boolean;
  /** @default true */
  chosen_filters_on_top?: boolean;
}

/** Configuration for itemsjs */
export interface Configuration<
  I extends Record<string, any>,
  S extends string,
  A extends keyof I & string
> {
  sortings?: Partial<Record<S, Sorting<I>>>;
  aggregations?: Partial<Record<A, Aggregation>>;
  /** @default [] */
  searchableFields?: Array<keyof I>;
  /** @default true */
  native_search_enabled?: boolean;
  // TODO: documentation
  custom_id_field?: string;
}
