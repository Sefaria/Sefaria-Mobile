import {TabMetadata, TabHistory, PageHistory} from "../PageHistory";

describe('TabMetadata', () => {
   test('initial tab correct', () => {
       expect(TabMetadata.initialTabName()).toBe('Texts');
   });

   test('names function works', () => {
       expect(TabMetadata.names()).toBe(TabMetadata._names);
   });
});

describe('TabHistory', () => {
    test('historyByTab has right keys', () => {
        const hist = new TabHistory();
        expect(Object.keys(hist._historyByTab)).toStrictEqual(TabMetadata._names);
    });
});

describe('PageHistory', () => {
    const statesToPushTable = [
        [{'sup': 1}],
        [{'hello': 1}, {'hello': 2}, {'sup': 3}]
    ]
    test.each(statesToPushTable)('push state', (...states) => {
        const hist = new PageHistory();
        states.map(state => hist.forward({ state }));
        [...states].reverse().map(state => {
            const prevState = hist.back();
            expect(prevState).toStrictEqual(state);
        })
    });
});

describe('TabHistory push state', () => {
  const statesToPushWithTabs = [
      [{tab: "Texts", state: {sup: 1}}, {tab: "Topics", state: {sup: 3}}, {tab: "Texts", state: {sup: 5}}],
  ];
  test.each(statesToPushWithTabs)('push state', (...tabStates) => {
      const hist = new TabHistory();
      tabStates.map(({tab, state}) => hist.forward({tab, state}));
      [...tabStates].reverse().map(({tab, state}) => {
          const prevState = hist.back({tab});
          expect(prevState).toStrictEqual(state);
      });
  });
});
