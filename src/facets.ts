import { map, mapValues, clone, keys } from 'lodash-es';
import FastBitSet from 'fastbitset';
import {
  facets_ids,
  filters_ids,
  filters_matrix,
  index,
  input_to_facet_filters,
  matrix,
  parse_boolean_query,
} from './helpers';
import {
  AggregationConfig,
  Item,
  ItemWithId,
  SearchOptions,
  FacetData,
  EA,
} from './types';

export interface FacetsConfig<I extends Item, C extends { [K in keyof I]?: AggregationConfig }> {
  custom_id_field?: keyof I;
  aggregations?: C;
}

/**
 * responsible for making faceted search
 */
export class Facets<
  I extends Item,
  S extends string,
  C extends { [K in keyof I]?: AggregationConfig }
> {
  _items: ItemWithId<I>[];
  config: C;
  _ids: number[];
  _items_map: Record<number, ItemWithId<I>>;
  ids_map: Record<any, number>;
  _bits_ids: FastBitSet;
  facets: FacetData<I>;

  constructor(items: I[], configuration?: FacetsConfig<I, C>) {
    configuration = configuration || Object.create(null);
    configuration!.aggregations =
      configuration!.aggregations || Object.create(null);
    this._items = items as unknown as ItemWithId<I>[];
    this.config = configuration!.aggregations!;
    this.facets = index(items, keys(configuration!.aggregations));

    this._items_map = Object.create(null);
    this._ids = [];

    let i = 1;
    map(this._items, (item) => {
      this._ids.push(i);
      this._items_map[i] = item;
      item._id = i;
      ++i;
    });

    this.ids_map = Object.create(null);

    if (items) {
      items.forEach((v) => {
        const custom_id_field = configuration!.custom_id_field || 'id';
        if (v[custom_id_field] && v._id) {
          this.ids_map[v[custom_id_field]] = v._id;
        }
      });
    }

    this._bits_ids = new FastBitSet(this._ids);
  }

  items() {
    return this._items;
  }

  bits_ids(ids?: number[]) {
    if (ids) {
      return new FastBitSet(ids);
    }
    return this._bits_ids;
  }

  internal_ids_from_ids_map(ids: Array<any>) {
    return ids.map((v) => {
      return this.ids_map[v];
    });
  }

  index() {
    return this.facets;
  }

  get_item(_id: number) {
    return this._items_map[_id];
  }

  /**
   * ids is optional only when there is query
   */
  search(
    input: SearchOptions<I, S, C>,
    data?: { query_ids?: FastBitSet; test?: boolean }
  ) {
    const config = this.config;
    data = data || Object.create(null);

    // consider removing clone
    const temp_facet = clone(this.facets);

    temp_facet.not_ids = facets_ids(temp_facet['bits_data'], input.not_filters);

    let temp_data;

    const filters = input_to_facet_filters(input, config);
    temp_data = matrix(this.facets, filters);

    if (input.filters_query) {
      const filters = parse_boolean_query<I>(input.filters_query);
      temp_data = filters_matrix(temp_data, filters);
    }

    temp_facet['bits_data_temp'] = temp_data['bits_data_temp'];

    mapValues(temp_facet['bits_data_temp'], (values, key: keyof I) => {
      mapValues(
        temp_facet['bits_data_temp'][key],
        (facet_indexes, key2: EA<I[keyof I]>) => {
          if (data!.query_ids) {
            temp_facet['bits_data_temp'][key][key2] =
              data!.query_ids.new_intersection(
                temp_facet['bits_data_temp'][key][key2]
              );
          }

          if (data!.test) {
            temp_facet['data'][key][key2] =
              temp_facet['bits_data_temp'][key][key2].array();
          }
        }
      );
    });

    /**
     * calculating ids (for a list of items)
     * facets ids is faster and filter ids because filter ids makes union each to each filters
     * filter ids needs to be used if there is filters query
     */
    if (input.filters_query) {
      temp_facet.ids = filters_ids(temp_facet['bits_data_temp']);
    } else {
      temp_facet.ids = facets_ids(temp_facet['bits_data_temp'], input.filters);
    }

    return temp_facet;
  }
}
