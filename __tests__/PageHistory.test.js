import { TabMetadata, TabHistory } from "../PageHistory";

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
