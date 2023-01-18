import { TabMetadata } from "../PageHistory";

describe('TabMetadata', () => {
   test('initial tab correct', () => {
     expect(TabMetadata.initialTabName()).toBe('Texts');
   });

   test('names function works', () => {
     expect(TabMetadata.names()).toBe(TabMetadata._names);
   })
});
