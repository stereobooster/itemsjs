import FastBitSet from 'fastbitset';

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

export interface SearchOptions<
  I extends Item,
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
  filters?: PRecord<A, Array<string | number>>;
  /** A custom function to filter values */
  filter?: (item: ItemWithId<I>) => boolean; // eslint-disable-line no-unused-vars
  /** @default false */
  isExactSearch?: boolean;
  /** @default false */
  removeStopWordFilter?: boolean;
  /** @default false */
  is_all_filtered_items?: boolean;
  // TODO: documentation
  aggregations?: PRecord<A, AggregationOptions<A>>;
  filters_query?: string;
  not_filters?: PRecord<A, Array<string | number>>;
  _ids?: number[];
  ids?: number[];
  custom_id_field?: string;
  exclude_filters?: PRecord<A, Array<string | number>>;
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

export interface AggregationOptions<A extends string> extends Aggregation {
  name?: A;
  /** @default 1 */
  page?: number;
  /** @default 10 */
  per_page?: number;
  query?: string;
  filters?: Array<string | number>;
  not_filters?: Array<string | number>;
  field?: A;
}

export interface SimilarOptions<I extends Item> {
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

/** Configuration for itemsjs */
export interface Configuration<
  I extends Item,
  S extends string,
  A extends keyof I & string
> {
  sortings?: PRecord<S, Sorting<I>>;
  aggregations?: PRecord<A, Aggregation>;
  /** @default [] */
  searchableFields?: Array<keyof I>;
  /** @default true */
  native_search_enabled?: boolean;
  // TODO: documentation
  custom_id_field?: string;
  /** @default false */
  isExactSearch?: boolean;
  /** @default false */
  removeStopWordFilter?: boolean;
}

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
export type Filters<A extends string> = Array<Filter<A> | Filter<A>[]>;
