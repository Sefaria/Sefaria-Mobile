import {MenuItemsMeta} from "../GeneralNavigationMenu";

describe('MenuItemsMeta', () => {
   test('logged in menu items', () => {
       expect(MenuItemsMeta.getMenuItems(true)).map(x => x['title']).toStrictEqual(['profile', 'updates', 'settings', 'language', 'help', 'aboutSefaria', 'logout', 'donate']);
   });

   test('logged out menu items', () => {
       expect(MenuItemsMeta.getMenuItems(false)).map(x => x['title']).toStrictEqual(['signup', 'login', 'updates', 'settings', 'language', 'help', 'aboutSefaria', 'donate'])
   });
   
   test('logged in menu icons', () => {
       expect(MenuItemsMeta.getMenuItems(true)).map(x => x['icon']).toStrictEqual(['Texts']);
   });

   test('logged out menu icons', () => {
       expect(MenuItemsMeta.getMenuItems(false)).map(x => x['icon']).toStrictEqual([])
   });

   /*test('namesWithIcons works', () => {
       const namesWithIcons = TabMetadata.namesWithIcons();
       namesWithIcons.map(({name, icon}, i) => {
           expect(name).toBe(TabMetadata._tabData[i].name);
           expect(icon).toBe(TabMetadata._tabData[i].icon);
       })
   })*/
});

