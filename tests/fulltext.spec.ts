import { describe, it } from 'vitest';
import assert from 'node:assert';
import { Fulltext } from '../src/fulltext';

describe('fulltext', () => {
  const items = [
    {
      name: 'Godfather',
      tags: ['mafia', 'crime'],
    },
    {
      name: 'Fight club',
      tags: ['dark humor', 'anti establishment'],
    },
    {
      name: 'Forrest Gump',
      tags: ['running', 'vietnam'],
    },
  ];

  const specialItems = [
    { name: 'elation' },
    { name: 'source' },
    { name: 'headless' },
  ];

  it('checks search on another fields', () => {
    const fulltext = new Fulltext(items, {
      searchableFields: ['name', 'tags'],
    });
    assert.equal(fulltext.search('vietnam').length, 1);
    assert.equal(fulltext.search('dark').length, 1);
    assert.equal(fulltext.search('anti').length, 1);
  });

  it('makes search stepping through characters', () => {
    const fulltext = new Fulltext(specialItems, {
      searchableFields: ['name'],
      isExactSearch: true,
    });
    assert.equal(fulltext.search('e').length, 1);
    assert.equal(fulltext.search('el').length, 1);
    assert.equal(fulltext.search('ela').length, 1);
    assert.equal(fulltext.search('elat').length, 1);
    assert.equal(fulltext.search('elati').length, 1); // Does not appear when stemmer is present
    assert.equal(fulltext.search('elatio').length, 1);
    assert.equal(fulltext.search('elation').length, 1);
    assert.equal(fulltext.search('s').length, 1);
    assert.equal(fulltext.search('so').length, 1); // Filtered by stopWordFilter
    assert.equal(fulltext.search('sou').length, 1);
    assert.equal(fulltext.search('sour').length, 1);
    assert.equal(fulltext.search('sourc').length, 1);
    assert.equal(fulltext.search('source').length, 1);
  });

  it('makes search stepping through characters', () => {
    const stopwordfilter = new Fulltext(specialItems, {
      searchableFields: ['name'],
    });

    const withoutstopwordfilter = new Fulltext(specialItems, {
      searchableFields: ['name'],
      removeStopWordFilter: true,
    });

    assert.equal(stopwordfilter.search('h').length, 1);
    assert.equal(stopwordfilter.search('he').length, 0); // The stopwordfilter filters out "he"
    assert.equal(stopwordfilter.search('hea').length, 1);
    assert.equal(stopwordfilter.search('head').length, 1);

    assert.equal(withoutstopwordfilter.search('h').length, 1);
    assert.equal(withoutstopwordfilter.search('he').length, 1);
    assert.equal(withoutstopwordfilter.search('hea').length, 1);
    assert.equal(withoutstopwordfilter.search('head').length, 1);
  });

  it.skip('returns internal ids', () => {
    const fulltext = new Fulltext(items);
    // @ts-expect-error ok
    assert.deepEqual(fulltext.internal_ids(), [1, 2, 3]);
    // @ts-expect-error ok
    assert.deepEqual(fulltext.bits_ids().array(), [1, 2, 3]);
    // @ts-expect-error ok
    assert.deepEqual(fulltext.get_item(1).name, 'Godfather');
  });
});
