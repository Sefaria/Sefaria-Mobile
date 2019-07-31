import React from 'react';
import renderer from 'react-test-renderer';
import SwipeableCategoryList from '../SwipeableCategoryList';
import { AnimatedRow } from '../Misc';

describe('SwipeableCategoryList', () => {
  test('basic render', async () => {
    const tree = renderer.create(
      <SwipeableCategoryList
        close={() => {}}
        theme={{}}
        themeStr={'white'}
        toggleLanguage={() => {}}
        openRef={() => {}}
        language={'english'}
        interfaceLang={'english'}
        onRemove={() => {}}
        title={'History'}
        loadData={() => Promise.resolve([])}
        menuOpen={'history'}
        icon={require('./img/clock.png')}
      />
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
  test('render with data', async () => {
    Sefaria.categoryForTitle = jest.fn(() => "Tanakh");
    const inst = renderer.create(
      <SwipeableCategoryList
        close={() => {}}
        theme={{}}
        themeStr={'white'}
        toggleLanguage={() => {}}
        openRef={() => {}}
        language={'english'}
        interfaceLang={'english'}
        onRemove={() => {}}
        title={'History'}
        loadData={() => Promise.resolve([
          {  // normal case with versions
            ref: "Genesis 1:1",
            he_ref: "בראשית א:א",
            versions: { en: "enVersion", he: "heVersion" },
            book: "Genesis"
          },
          {  // no versions
            ref: "Genesis 1:2",
            he_ref: "בראשית א:ב",
            versions: {},
            book: "Genesis"
          },
          {  // section ref
            ref: "Genesis 1",
            he_ref: "בראשית א",
            versions: {},
            book: "Tanakh"
          },
          {  // duplicate
            ref: "Genesis 1",
            he_ref: "בראשית א",
            versions: {},
            book: "Tanakh"
          },
          {  // secondary
            ref: "Genesis 1",
            he_ref: "בראשית א",
            versions: {},
            book: "Tanakh",
            secondary: true,
          }
        ])}
        menuOpen={'history'}
        icon={require('./img/clock.png')}
      />
    );
    await setTimeout(()=>{}, 10);  // wait for SwipeableFlatList to fully render
    const yo = inst.root.findAllByType(AnimatedRow);
    expect(yo.length).toBe(3);
    expect(inst.toJSON()).toMatchSnapshot();
  });
});
