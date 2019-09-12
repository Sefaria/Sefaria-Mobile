import React from 'react';
import renderer from 'react-test-renderer';
import SwipeableCategoryList from '../SwipeableCategoryList';
import { GlobalStateContext } from '../StateManager';
import { AnimatedRow } from '../Misc';

describe('SwipeableCategoryList', () => {
  test('basic render', async () => {
    const inst = renderer.create(
      <GlobalStateContext.Provider value={{
          themeStr: 'white',
          theme: {},
        }}
      >
        <SwipeableCategoryList
          close={() => {}}
          theme={{}}
          themeStr={'white'}
          toggleLanguage={() => {}}
          openRef={() => {}}
          defaultTextLanguage={'english'}
          interfaceLang={'english'}
          onRemove={() => {}}
          title={'History'}
          loadData={() => Promise.resolve([])}
          menuOpen={'history'}
          openLogin={() => {}}
          isLoggedIn={false}
          hasDismissedSyncModal={false}
          dispatch={() => {}}
          icon={require('./img/clock.png')}
        />
      </GlobalStateContext.Provider>

    );
    expect(inst.toJSON()).toMatchSnapshot();
  });
  test('render with data', async () => {
    Sefaria.categoryForTitle = jest.fn(() => "Tanakh");
    const inst = renderer.create(
      <GlobalStateContext.Provider value={{
          themeStr: 'white',
          theme: {},
        }}
      >
        <SwipeableCategoryList
          close={() => {}}
          theme={{}}
          themeStr={'white'}
          toggleLanguage={() => {}}
          openRef={() => {}}
          defaultTextLanguage={'english'}
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
          openLogin={() => {}}
          isLoggedIn={false}
          hasDismissedSyncModal={false}
          dispatch={()=>{}}
          icon={require('./img/clock.png')}
        />
      </GlobalStateContext.Provider>
    );
    await setTimeout(()=>{}, 100);  // wait for SwipeableFlatList to fully render
    const yo = inst.root.findAllByType(AnimatedRow);
    expect(yo.length).toBe(3);
    expect(inst.toJSON()).toMatchSnapshot();
  });
});
