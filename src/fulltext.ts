import lunr from 'lunr';
import { Configuration, Item, ItemWithId } from './types';

/**
 * responsible for making full text searching on items
 * config provide only searchableFields
 */
export class Fulltext<
  I extends Item,
  S extends string,
  A extends keyof I & string
> {
  items: ItemWithId<I>[];
  idx: lunr.Index;
  store: Record<number, ItemWithId<I>>;

  constructor(items: I[], config?: Configuration<I, S, A>) {
    config = config || Object.create(null);
    config!.searchableFields = config!.searchableFields || [];
    this.items = items as unknown as ItemWithId<I>[];
    // creating index
    this.idx = lunr(function () {
      // currently schema hardcoded
      this.field('name', { boost: 10 });
      if (config!.searchableFields) {
        config!.searchableFields?.forEach((field) => {
          this.field(field as string);
        });
      }

      this.ref('_id');

      /**
       * Remove the stemmer and stopWordFilter from the pipeline
       * stemmer: https://github.com/olivernn/lunr.js/issues/328
       * stopWordFilter: https://github.com/olivernn/lunr.js/issues/233
       */
      if (config!.isExactSearch) {
        this.pipeline.remove(lunr.stemmer);
        this.pipeline.remove(lunr.stopWordFilter);
      }

      /**
       * Remove the stopWordFilter from the pipeline
       * stopWordFilter: https://github.com/itemsapi/itemsjs/issues/46
       */
      if (config!.removeStopWordFilter) {
        this.pipeline.remove(lunr.stopWordFilter);
      }
    });

    let i = 1;

    this.store = Object.create(null);

    this.items.map((item) => {
      item._id = i;
      ++i;

      // @ts-expect-error ok - Lunr TS signatures from wrong version
      this.idx.add(item);

      this.store[item._id] = item;
    });
  }

  // eslint-disable-next-line no-unused-vars
  search_full(query?: string, filter?: (item: ItemWithId<I>) => boolean) {
    return this.search(query, filter).map((v) => this.store[v]);
  }

  // eslint-disable-next-line no-unused-vars
  search(query?: string, filter?: (item: ItemWithId<I>) => boolean) {
    if (!query && !filter) {
      return this.items ? this.items.map((v) => v._id) : [];
    }

    let items;

    if (query) {
      items = this.idx
        .search(query)
        .map((val) => this.store[val.ref as unknown as number]);
    }

    if (filter instanceof Function) {
      items = (items || this.items).filter(filter);
    }

    return items!.map((v) => v._id);
  }
}
