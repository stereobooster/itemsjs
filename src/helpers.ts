import {
  mapValues,
  clone as _clone,
  map,
  chain,
  sortBy,
  isArray,
  orderBy,
  minBy,
  maxBy,
  sumBy,
  meanBy,
} from 'lodash-es';
import FastBitSet from 'fastbitset';
// @ts-ignore
import booleanParser from 'boolean-parser';
import {
  AggregationConfig,
  AggregationOptionsInternal,
  FacetData,
  Filter,
  Filters,
  FiltersArray,
  Item,
  Order,
  PRecord,
  SearchAggregation,
  SearchOptions,
  SearchOptionsInternal,
  Sort,
} from './types';

export function clone<T>(val: T) {
  return structuredClone(val);
}

export function humanize(str: string) {
  return str
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .replace(/[_\s]+/g, ' ')
    .replace(/^[a-z]/, function (m) {
      return m.toUpperCase();
    });
}

export function combination_indexes<I extends Item>(
  facets: FacetData<I>,
  filters: FiltersArray<I>
) {
  const indexes: { [K in keyof I]: FastBitSet } = {} as any;

  mapValues(filters, (filter: Filters<I>) => {
    // filter is still array so disjunctive
    if (Array.isArray(filter[0])) {
      let facet_union = new FastBitSet([]);
      const filter_keys = [];

      mapValues(filter, (disjunctive_filter: Filter<I>) => {
        const filter_key = disjunctive_filter[0];
        const filter_val = disjunctive_filter[1] as I[keyof I];

        filter_keys.push(filter_key);
        facet_union = facet_union.new_union(
          facets['bits_data'][filter_key][filter_val] || new FastBitSet([])
        );
        indexes[filter_key] = facet_union;
      });
    }
  });

  return indexes;
}

export function filters_matrix<I extends Item>(
  facets: FacetData<I>,
  query_filters?: FiltersArray<I>
) {
  const temp_facet = _clone(facets);

  if (!temp_facet['is_temp_copied']) {
    mapValues(temp_facet['bits_data'], (values, key: keyof I) => {
      mapValues(
        temp_facet['bits_data'][key],
        (facet_indexes, key2: I[keyof I]) => {
          temp_facet['bits_data_temp'][key][key2] =
            temp_facet['bits_data'][key][key2];
        }
      );
    });
  }

  let union: FastBitSet | null = null;

  /**
   * process only conjunctive filters
   */
  mapValues(query_filters, (conjunction: Filters<I>) => {
    let conjunctive_index: FastBitSet | null = null;

    mapValues(conjunction, (filter: Filter<I>) => {
      const filter_key = filter[0];
      const filter_val = filter[1] as I[keyof I];

      if (!temp_facet['bits_data_temp'][filter_key]) {
        throw new Error('Panic. The key does not exist in facets lists.');
      }

      if (
        conjunctive_index &&
        temp_facet['bits_data_temp'][filter_key][filter_val]
      ) {
        conjunctive_index =
          temp_facet['bits_data_temp'][filter_key][filter_val].new_intersection(
            conjunctive_index
          );
      } else if (
        conjunctive_index &&
        !temp_facet['bits_data_temp'][filter_key][filter_val]
      ) {
        conjunctive_index = new FastBitSet([]);
      } else {
        conjunctive_index =
          temp_facet['bits_data_temp'][filter_key][filter_val];
      }
    });

    union = (union || new FastBitSet([])).new_union(
      conjunctive_index || new FastBitSet([])
    );
  });

  if (union !== null) {
    mapValues(temp_facet['bits_data_temp'], (values, key: keyof I) => {
      mapValues(
        temp_facet['bits_data_temp'][key],
        (facet_indexes, key2: I[keyof I]) => {
          temp_facet['bits_data_temp'][key][key2] = temp_facet[
            'bits_data_temp'
          ][key][key2].new_intersection(union!);
        }
      );
    });
  }

  return temp_facet;
}

/*
 * returns facets and ids
 */
export function matrix<I extends Item>(
  facets: FacetData<I>,
  filters?: FiltersArray<I>
) {
  const temp_facet = _clone(facets);

  filters = filters || [];

  mapValues(temp_facet['bits_data'], (values, key: keyof I) => {
    mapValues(
      temp_facet['bits_data'][key],
      (facet_indexes, key2: I[keyof I]) => {
        temp_facet['bits_data_temp'][key][key2] =
          temp_facet['bits_data'][key][key2];
      }
    );
  });

  temp_facet['is_temp_copied'] = true;

  let conjunctive_index: FastBitSet;
  const disjunctive_indexes = combination_indexes(facets, filters);

  /**
   * process only conjunctive filters
   */
  mapValues(filters, (filter: Filters<I>) => {
    if (!Array.isArray(filter[0])) {
      const filter_key = filter[0];
      const filter_val = filter[1] as I[keyof I];

      if (
        conjunctive_index &&
        temp_facet['bits_data_temp'][filter_key][filter_val]
      ) {
        conjunctive_index =
          temp_facet['bits_data_temp'][filter_key][filter_val].new_intersection(
            conjunctive_index
          );
      } else if (
        conjunctive_index &&
        !temp_facet['bits_data_temp'][filter_key][filter_val]
      ) {
        conjunctive_index = new FastBitSet([]);
      } else {
        conjunctive_index =
          temp_facet['bits_data_temp'][filter_key][filter_val];
      }
    }
  });

  // cross all facets with conjunctive index
  if (conjunctive_index!) {
    mapValues(temp_facet['bits_data_temp'], (values, key: keyof I) => {
      mapValues(
        temp_facet['bits_data_temp'][key],
        (facet_indexes, key2: I[keyof I]) => {
          temp_facet['bits_data_temp'][key][key2] =
            temp_facet['bits_data_temp'][key][key2].new_intersection(
              conjunctive_index
            );
        }
      );
    });
  }

  /**
   * process only negative filters
   */
  mapValues(filters, (filter: Filter<I>) => {
    if (filter.length === 3 && filter[1] === '-') {
      const filter_key = filter[0];
      const filter_val = filter[2] as I[keyof I];

      const negative_bits =
        temp_facet['bits_data_temp'][filter_key][filter_val].clone();

      mapValues(temp_facet['bits_data_temp'], (values, key: keyof I) => {
        mapValues(
          temp_facet['bits_data_temp'][key],
          (facet_indexes, key2: I[keyof I]) => {
            temp_facet['bits_data_temp'][key][key2] =
              temp_facet['bits_data_temp'][key][key2].new_difference(
                negative_bits
              );
          }
        );
      });
    }
  });

  // cross all facets with disjunctive index
  mapValues(temp_facet['bits_data_temp'], (values, key: keyof I) => {
    mapValues(
      temp_facet['bits_data_temp'][key],
      (facet_indexes, key2: string) => {
        mapValues(disjunctive_indexes, (disjunctive_index, disjunctive_key) => {
          if (disjunctive_key !== key) {
            // @ts-expect-error sometimes TS doesn't make any sense
            temp_facet['bits_data_temp'][key][key2] = temp_facet[
              'bits_data_temp'
            ][key][key2].new_intersection(disjunctive_index!);
          }
        });
      }
    );
  });

  return temp_facet;
}

export function index<I extends Item>(items: I[], fields: (keyof I)[]) {
  fields = fields || [];

  const facets: FacetData<I> = {
    data: {} as any,
    bits_data: {} as any,
    bits_data_temp: {} as any,
  };

  let i = 1;

  items = map(items, (item) => {
    if (!item['_id']) {
      // @ts-expect-error fix me
      item['_id'] = i;
      ++i;
    }

    return item;
  });

  // replace chain with forEach

  chain(items)
    .map((item) => {
      fields.forEach((field) => {
        //if (!item || !item[field]) {
        if (!item) {
          return;
        }

        if (!facets['data'][field]) {
          facets['data'][field] = {} as Record<I[keyof I], any[]>;
        }

        if (Array.isArray(item[field])) {
          item[field].forEach((v: I[keyof I]) => {
            if (!item[field]) {
              return;
            }

            if (!facets['data'][field][v]) {
              facets['data'][field][v] = [];
            }

            // @ts-expect-error TS knows this is a number, but JS implementation doing it to be on safe side
            facets['data'][field][v].push(parseInt(item._id));
          });
        } else if (typeof item[field] !== 'undefined') {
          const v = item[field];

          if (!facets['data'][field][v]) {
            facets['data'][field][v] = [];
          }

          // @ts-expect-error TS knows this is a number, but JS implementation doing it to be on safe side
          facets['data'][field][v].push(parseInt(item._id));
        }
      });

      return item;
    })
    .value();

  facets['data'] = mapValues(
    facets['data'],
    (values: Record<string | number, any[]>, field: keyof I) => {
      if (!facets['bits_data'][field]) {
        facets['bits_data'][field] = {} as Record<I[keyof I], FastBitSet>;
        facets['bits_data_temp'][field] = {} as Record<I[keyof I], FastBitSet>;
      }

      //console.log(values);
      return mapValues(values, (indexes, filter) => {
        const sorted_indexes = sortBy(indexes);
        // @ts-expect-error sometimes TS doesn't make any sense
        facets['bits_data'][field][filter] = new FastBitSet(sorted_indexes);
        return sorted_indexes;
      });
    }
  ) as any;

  return facets;
}

/**
 * calculates ids for filters
 */
export function filters_ids<A extends string>(
  facets_data: Record<A, Record<string | number, FastBitSet>>
) {
  let output = new FastBitSet([]);

  mapValues(facets_data, (values, key: A) => {
    mapValues(facets_data[key], (facet_indexes, key2) => {
      output = output.new_union(facets_data[key][key2]);
    });
  });

  return output;
}

/**
 * calculates ids for facets
 * if there is no facet input then return null to not save resources for OR calculation
 * null means facets haven't matched searched items
 */
export function facets_ids<A extends string>(
  facets_data: Record<A, Record<string | number, FastBitSet>>,
  filters?: PRecord<A, Array<string | number>>
) {
  let output = new FastBitSet([]);
  let i = 0;

  mapValues(filters, (filters: Array<string | number>, field: A) => {
    filters.forEach((filter) => {
      ++i;
      output = output.new_union(
        facets_data[field][filter] || new FastBitSet([])
      );
    });
  });

  if (i === 0) {
    return null;
  }

  return output;
}

export function getBuckets<
  I extends Item,
  S extends string,
  C extends { [K in keyof I]?: AggregationConfig }
>(
  data: FacetData<I>,
  input: SearchOptions<I, S, C>,
  aggregations: C
): { [K in keyof C]: SearchAggregation<K> } {
  let position = 1;

  return mapValues(
    data['bits_data_temp'],
    (v: Record<string | number, FastBitSet>, k: keyof I) => {
      let order;
      let sort;
      let size;
      let title;
      let show_facet_stats;
      let chosen_filters_on_top;
      let hide_zero_doc_count: undefined | boolean;

      if (aggregations[k]) {
        order = aggregations[k]!.order;
        sort = aggregations[k]!.sort;
        size = aggregations[k]!.size;
        title = aggregations[k]!.title;
        show_facet_stats = aggregations[k]!.show_facet_stats || false;
        chosen_filters_on_top =
          aggregations[k]!.chosen_filters_on_top !== false;
        hide_zero_doc_count = aggregations[k]!.hide_zero_doc_count || false;
      }

      let buckets = chain(v)
        .toPairs()
        .map((v2) => {
          let filters: Array<string | number> = [];

          if (input && input.filters && input.filters[k]) {
            filters = input.filters[k]!;
          }

          const doc_count = v2[1].array().length;

          //hide zero_doc_count facet only if it is not selected
          if (
            hide_zero_doc_count &&
            doc_count === 0 &&
            filters.indexOf(v2[0]) === -1
          ) {
            return;
          }

          return {
            key: v2[0],
            doc_count: doc_count,
            selected: filters.indexOf(v2[0]) !== -1,
          };
        })
        .compact()
        .value();

      let iteratees: Sort | Sort[];
      let sort_order: Order | Order[];

      if (isArray(sort)) {
        iteratees = sort || ['key'];
        sort_order = order || (['asc'] as 'asc'[]);
      } else {
        if (sort === 'term' || sort === 'key') {
          iteratees = ['key'];
          // @ts-expect-error is it a bug?
          sort_order = [order || 'asc'];
        } else {
          iteratees = ['doc_count', 'key'];
          // @ts-expect-error is it a bug?
          sort_order = [order || 'desc', 'asc'];
        }

        if (chosen_filters_on_top) {
          iteratees.unshift('selected');
          // @ts-expect-error is it a bug?
          sort_order.unshift('desc');
        }
      }

      buckets = orderBy(buckets, iteratees, sort_order);

      buckets = buckets.slice(0, size || 10);

      // Calculate the facet_stats
      let facet_stats: number[];
      let calculated_facet_stats;

      if (show_facet_stats) {
        facet_stats = [];
        chain(v)
          .toPairs()
          .forEach((v2) => {
            // @ts-expect-error ok - hacky way to detect strings
            if (isNaN(v2[0])) {
              throw new Error(
                'You cant use chars to calculate the facet_stats.'
              );
            }

            // Doc_count
            if (v2[1].array().length > 0) {
              v2[1].forEach((/*doc_count*/) => {
                facet_stats.push(parseInt(v2[0]));
              });
            }
          })
          .value();

        calculated_facet_stats = {
          min: minBy(facet_stats),
          max: maxBy(facet_stats),
          avg: meanBy(facet_stats),
          sum: sumBy(facet_stats),
        };
      }

      return {
        name: k,
        title: title || humanize(k as string),
        position: position++,
        buckets: buckets,
        ...(show_facet_stats && { facet_stats: calculated_facet_stats }),
      };
    }
  ) as any;
}

export function mergeAggregations<
  I extends Item,
  S extends string,
  C extends { [K in keyof I]?: AggregationConfig }
>(
  aggregations: C,
  input: SearchOptionsInternal<I, S, C>
): { [K in keyof I]?: AggregationOptionsInternal<K> } {
  return mapValues(
    clone(aggregations),
    (val: AggregationOptionsInternal<keyof I>, key: keyof I) => {
      if (!val.field) {
        val.field = key;
      }

      let filters: Array<string | number> = [];
      if (input.filters && input.filters[key]) {
        filters = input.filters[key]!;
      }

      val.filters = filters;

      let not_filters: Array<string | number> = [];
      if (input.not_filters && input.not_filters[key]) {
        not_filters = input.not_filters[key]!;
      }

      if (input.exclude_filters && input.exclude_filters[key]) {
        not_filters = input.exclude_filters[key]!;
      }

      val.not_filters = not_filters;

      return val;
    }
  ) as any;
}

export function input_to_facet_filters<
  I extends Item,
  S extends string,
  C extends { [K in keyof I]?: AggregationConfig }
>(input: SearchOptions<I, S, C>, config: C) {
  const filters: FiltersArray<I> = [];

  mapValues(input.filters, (values: Array<string | number>, key: keyof I) => {
    if (values && values.length) {
      if (config[key]!.conjunction !== false) {
        mapValues(values, (values2: I[keyof I]) => {
          filters.push([key, values2]);
        });
      } else {
        const temp: Array<Filter<I>> = [];
        mapValues(values, (values2: I[keyof I]) => {
          temp.push([key, values2]);
        });

        filters.push(temp);
      }
    }
  });

  mapValues(
    input.not_filters,
    (values: Array<string | number>, key: keyof I) => {
      if (values && values.length) {
        mapValues(values, (values2: I[keyof I]) => {
          filters.push([key, '-', values2]);
        });
      }
    }
  );

  return filters;
}

export function parse_boolean_query<I extends Item>(
  query: string
): FiltersArray<I> {
  const result = booleanParser.parseBooleanQuery(query);

  return map(result, (v1) => {
    if (Array.isArray(v1)) {
      return map(v1, (v2) => {
        if (Array.isArray(v2)) {
          return map(v2, (v3) => {
            return v3;
          });
        } else {
          return v2.split(':');
        }
      });
    } else {
      return v1.split(':');
    }
  });
}

export const getFacets = getBuckets;
