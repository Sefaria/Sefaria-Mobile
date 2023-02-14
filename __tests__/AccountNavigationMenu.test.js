import {MenuItemsMeta} from "../AccountNavigationMenu";

describe('MenuItemsMeta', () => {
   test('logged in menu items', () => {
       expect(MenuItemsMeta.getMenuItems(true)).map(x => x['title']).toStrictEqual(['profile', 'updates', 'settings', 'interfaceLanguage', 'help', 'aboutSefaria', 'logout', 'donate']);
   });

   test('logged out menu items', () => {
       expect(MenuItemsMeta.getMenuItems(false)).map(x => x['title']).toStrictEqual(['signup', 'login', 'updates', 'settings', 'interfaceLanguage', 'help', 'aboutSefaria', 'donate'])
   });
   
   test('logged in menu icons', () => {
       expect(MenuItemsMeta.getMenuItems(true)).map(x => x['icon']).toStrictEqual(['profile-nav', 'bell', 'settings', 'globe', 'help', 'about', 'logout', 'heart-white']);
   });

   test('logged out menu icons', () => {
       expect(MenuItemsMeta.getMenuItems(false)).map(x => x['icon']).toStrictEqual(['profile-nav', 'login', 'bell', 'settings', 'globe', 'help', 'about','heart-white'])
   });
   
   
   test('Check that actions are correct - pofile', () => {
       expect(MenuItemsMeta.getMenuItems(false)).find(x => x['title'] == "menu")["actionProps"].toStrictEqual({action: "menu", destination:"profile"})
   });
   
   test('Check that actions are correct - about', () => {
       expect(MenuItemsMeta.getMenuItems(false)).find(x => x['title'] == "aboutSefaria")["actionProps"].toStrictEqual({action: "uri", destination:"https://www.sefaria.org/about"})
   });

   /*test('namesWithIcons works', () => {
       const namesWithIcons = TabMetadata.namesWithIcons();
       namesWithIcons.map(({name, icon}, i) => {
           expect(name).toBe(TabMetadata._tabData[i].name);
           expect(icon).toBe(TabMetadata._tabData[i].icon);
       })
   })*/
});

