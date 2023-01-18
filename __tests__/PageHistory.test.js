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
        [...states].reverse().map((state, i) => {
            const prevState = hist.back();
            expect(prevState).toStrictEqual(states[states.length-i-1]);
        })
    });
});
