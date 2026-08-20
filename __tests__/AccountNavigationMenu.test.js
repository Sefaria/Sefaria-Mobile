import {MenuItemsMeta} from "../AccountNavigationMenu";

// Menu items are filtered by `typeof loggedIn == 'undefined' || loggedIn === isLoggedIn`,
// so entries without a `loggedIn` flag show in both states. `profile` and `updates` are
// commented out in MenuItemsMeta._items and therefore appear in neither list.
describe('MenuItemsMeta', () => {
   test('logged in menu items', () => {
       expect(MenuItemsMeta.getMenuItems(true).map(x => x['titleKey'])).toStrictEqual(
           ['common.settings', 'settings.interface_language', 'account.help', 'about.about_sefaria', 'account.logout', 'about.donate']);
   });

   test('logged out menu items', () => {
       expect(MenuItemsMeta.getMenuItems(false).map(x => x['titleKey'])).toStrictEqual(
           ['account.signup', 'account.login', 'common.settings', 'settings.interface_language', 'account.help', 'about.about_sefaria', 'about.donate']);
   });

   test('logged in menu icons', () => {
       expect(MenuItemsMeta.getMenuItems(true).map(x => x['icon'])).toStrictEqual(
           ['settings', 'globe', 'help', 'about', 'logout', 'heart-white']);
   });

   test('logged out menu icons', () => {
       expect(MenuItemsMeta.getMenuItems(false).map(x => x['icon'])).toStrictEqual(
           ['profile-nav', 'login', 'settings', 'globe', 'help', 'about', 'heart-white']);
   });

   test('Check that actions are correct - settings', () => {
       expect(MenuItemsMeta.getMenuItems(false).find(x => x['titleKey'] === 'common.settings')['actionProps'])
           .toStrictEqual({action: "menu", destination: "settings"});
   });

   test('Check that actions are correct - about', () => {
       expect(MenuItemsMeta.getMenuItems(false).find(x => x['titleKey'] === 'about.about_sefaria')['actionProps'])
           .toStrictEqual({action: "uri", destination: "https://www.sefaria.org/about"});
   });
});
