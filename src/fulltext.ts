import lunr from 'lunr';
import { Item, ItemWithId } from './types';

type FulltextConfiguration<A extends string> = {
  searchableFields?: Array<A>;
  isExactSearch?: boolean;
  removeStopWordFilter?: boolean;
};

/**
 * responsible for making full text searching on items
 * config provide only searchableFields
 */
export class Fulltext<I extends Item, A extends keyof I & string> {
  items: ItemWithId<I>[];
  idx: lunr.Index;
  store: Map<number, ItemWithId<I>>;

  constructor(items: I[], config?: FulltextConfiguration<A>) {
    this.items = items as unknown as ItemWithId<I>[];

    // creating index
    this.idx = lunr(function () {
      // currently schema hardcoded
      this.field('name', { boost: 10 });
      (config?.searchableFields || []).forEach((field) => this.field(field));
      this.ref('_id');

      /**
       * Remove the stemmer and stopWordFilter from the pipeline
       * stemmer: https://github.com/olivernn/lunr.js/issues/328
       * stopWordFilter: https://github.com/olivernn/lunr.js/issues/233
       */
      if (config?.isExactSearch) {
        this.pipeline.remove(lunr.stemmer);
        this.pipeline.remove(lunr.stopWordFilter);
      }

      /**
       * Remove the stopWordFilter from the pipeline
       * stopWordFilter: https://github.com/itemsapi/itemsjs/issues/46
       */
      if (config?.removeStopWordFilter) {
        this.pipeline.remove(lunr.stopWordFilter);
      }
    });

    this.store = new Map();

    let i = 1;
    this.items.map((item) => {
      item._id = i;
      ++i;

      // @ts-expect-error ok - Lunr TS signatures from wrong version
      this.idx.add(item);

      this.store.set(item._id, item);
    });
  }

  // eslint-disable-next-line no-unused-vars
  search(query?: string, filter?: (item: ItemWithId<I>) => boolean) {
    // 1. why do we need filter inside search class?
    // if we would remove it we can as well remove `this.store` and `this.items`
    // 2. we can assume that this class would get data with predefined id
    // and we need to pass name of this id instead
    // 3. It can return fastbitset instead of array, which would allow to cache result
    if (!(filter instanceof Function)) {
      if (!query) {
        return Array.from(this.store.keys());
      } else {
        return this.idx
          .search(query)
          .map((val) => val.ref as unknown as number);
      }
    }

    const items = !query
      ? this.items
      : this.idx
          .search(query)
          .map((val) => this.store.get(val.ref as unknown as number)!);

    return items.filter(filter).map((v) => v._id);
  }
}
