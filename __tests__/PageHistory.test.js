import { TabMetadata } from "../PageHistory";

describe('TabMetadata', () => {
   test('initial tab correct', () => {
     expect(TabMetadata.initialTabName()).toBe('Texts');
   });
});
