import RNFB from 'rn-fetch-blob';
import AsyncStorage from '@react-native-community/async-storage';
import Sefaria from '../sefaria';

test('migrateFromOldRecents', async () => {
  const recentItems = JSON.stringify([
    {  // normal case with versions
      ref: "Genesis 1:1",
      heRef: "בראשית א",
      versions: { en: "enVersion", he: "heVersion" },
      category: "Tanakh"
    },
    {  // corrupted versions
      ref: "Genesis 1:2",
      heRef: "בראשית א",
      versions: false,
      category: "Tanakh"
    },
    {  // section ref
      ref: "Genesis 1",
      heRef: "בראשית א",
      versions: {},
      category: "Tanakh"
    }
  ]);
  const historyItems = JSON.stringify([
    {
      ref: "Genesis 1:1",
      he_ref: "בראשית א:א׳",
      versions: { en: "enVersion", he: "heVersion" },
      book: "Genesis"
    },
    {
      ref: "Genesis 1:2",
      he_ref: "בראשית א:ב׳",
      versions: {},
      book: "Genesis"
    },
    {
      ref: "Genesis 1",
      he_ref: "בראשית א",
      versions: {},
      book: "Genesis"
    }
  ]);
  const lastSyncTime = '' + Math.floor((new Date(2017, 11, 1)).getTime()/1000);
  const lastPlace = JSON.stringify(Sefaria.history.historyToLastPlace(JSON.parse(historyItems)));
  Sefaria.textTitleForRef = jest.fn(() => "Genesis");
  AsyncStorage.setItem('recent', recentItems);
  await Sefaria.history.migrateFromOldRecents();

  // matchers
  expect((await AsyncStorage.getItem('recent'))).toBeNull();
  expect((await AsyncStorage.getItem('history'))).toBeNull();
  expect((await AsyncStorage.getItem('lastSyncItems'))).toBe(historyItems);
  expect((await AsyncStorage.getItem('lastSyncTime'))).toBe(lastSyncTime);
  expect((await AsyncStorage.getItem('lastPlace'))).toBe(lastPlace);

});

test('historyToLastPlace', () => {
  const history = [
    {
      book: "Genesis",
      ref: "Genesis 1:1"
    },
    {
      book: "Exodus",
      ref: "Exodus 1:1"
    },
    {
      book: "Genesis",
      ref: "Genesis 1:2"
    },
    {
      book: "Leviticus",
      ref: "Leviticus 1:1"
    },
    {
      book: "Leviticus",
      ref: "Leviticus 1:2"
    },
  ];
  const lastPlace = [
    {
      book: "Genesis",
      ref: "Genesis 1:1"
    },
    {
      book: "Exodus",
      ref: "Exodus 1:1"
    },
    {
      book: "Leviticus",
      ref: "Leviticus 1:1"
    },
  ];
  expect(Sefaria.history.historyToLastPlace(history)).toEqual(lastPlace);
});

test('getHistoryObject', () => {
  const state = {
    
  };
});

test('saveHistoryItemUnchanged', async () => {
  const historyItem = {
    ref: "Genesis 1:5",
    he_ref: "בראשית א:א",
    versions: {},
    book: "Genesis",
    language: "english",
  };
  const getHistoryObject = jest.fn()
    .mockReturnValueOnce(historyItem)
    .mockReturnValueOnce(historyItem);
  Sefaria.history.lastPlace = [];
  Sefaria.history.lastSync = [];
  await AsyncStorage.setItem('lastSyncItems', '');
  await Sefaria.history.saveHistoryItem(getHistoryObject, true, null, 1);
  expect((await AsyncStorage.getItem('lastSyncItems'))).toBe(JSON.stringify([historyItem]));
  expect((await AsyncStorage.getItem('lastPlace'))).toBe(JSON.stringify([historyItem]));
});

test('saveHistoryItemDuplicate', async () => {
  const historyItem = {
    ref: "Genesis 1:5",
    he_ref: "בראשית א:א",
    versions: {},
    book: "Genesis",
    language: "english",
  };
  let getHistoryObject = jest.fn()
    .mockReturnValueOnce(historyItem)
    .mockReturnValueOnce(historyItem);
  Sefaria.history.lastPlace = [];
  Sefaria.history.lastSync = [{...historyItem, time_stamp: Sefaria.util.epoch_time()}];
  await AsyncStorage.setItem('lastSyncItems', '');
  await Sefaria.history.saveHistoryItem(getHistoryObject, true, null, 1);
  expect((await AsyncStorage.getItem('lastSyncItems'))).toBeNull();

  // test that if the item is old enough it will save
  getHistoryObject = jest.fn()
    .mockReturnValueOnce(historyItem)
    .mockReturnValueOnce(historyItem);
  Sefaria.history.lastPlace = [];
  const oldHistoryItem = {...historyItem, time_stamp: Sefaria.util.epoch_time() - 61};
  Sefaria.history.lastSync = [oldHistoryItem];
  await AsyncStorage.setItem('lastSyncItems', '');
  await Sefaria.history.saveHistoryItem(getHistoryObject, true, null, 1);
  expect((await AsyncStorage.getItem('lastSyncItems'))).toBe(JSON.stringify([historyItem, oldHistoryItem]));
});

test('saveHistoryItemChanged', async () => {
  const historyItem = {
    ref: "Genesis 1:5",
    he_ref: "בראשית א:א",
    versions: {},
    book: "Genesis",
    language: "english",
  };
  const historyItem2 = {...historyItem, ref: "Genesis 1:6", he_ref: "Genesis 1:7"};
  const getHistoryObject = jest.fn()
    .mockReturnValueOnce(historyItem)
    .mockReturnValueOnce(historyItem2);
  Sefaria.history.lastPlace = [];
  Sefaria.history.lastSync = [];
  await AsyncStorage.setItem('lastSyncItems', '');
  await Sefaria.history.saveHistoryItem(getHistoryObject, true, null, 1);
  expect((await AsyncStorage.getItem('lastSyncItems'))).toBeNull();
});

test('saveHistoryItemVersionChanged', async () => {
  const historyItem = {
    ref: "Genesis 1:5",
    he_ref: "בראשית א:א",
    versions: {},
    book: "Genesis",
    language: "english",
  };
  const historyItem2 = {...historyItem, versions: {en: "Version Yo"}};
  const getHistoryObject = jest.fn()
    .mockReturnValueOnce(historyItem)
    .mockReturnValueOnce(historyItem2);
  Sefaria.history.lastPlace = [];
  Sefaria.history.lastSync = [];
  await AsyncStorage.setItem('lastSyncItems', '');
  await Sefaria.history.saveHistoryItem(getHistoryObject, true, null, 1);
  expect((await AsyncStorage.getItem('lastSyncItems'))).toBeNull();
});

test('saveHistorySecondary', async () => {
  const historyItem = {
    ref: "Genesis 1:5",
    he_ref: "בראשית א:א",
    versions: {},
    book: "Genesis",
    language: "english",
    secondary: true,
  };
  const getHistoryObject = jest.fn()
    .mockReturnValueOnce(historyItem)
    .mockReturnValueOnce(historyItem);
  Sefaria.history.lastPlace = [];
  Sefaria.history.lastSync = [];
  await AsyncStorage.setItem('lastSyncItems', '');
  await AsyncStorage.setItem('lastPlace', '');
  await Sefaria.history.saveHistoryItem(getHistoryObject, true, null, 1);
  expect((await AsyncStorage.getItem('lastSyncItems'))).toBe(JSON.stringify([historyItem]));
  expect((await AsyncStorage.getItem('lastPlace'))).toBeNull();
});

test('getHistoryRefForTitle', async () => {
  Sefaria.history.lastPlace = [
    {
      ref: "Genesis 1:5",
      he_ref: "בראשית א:ה",
      versions: {},
      book: "Genesis",
      language: "english",
    },
    {
      ref: "Exodus 1:5",
      he_ref: "שמות א:ה",
      versions: {},
      book: "Exodus",
      language: "english",
    },
    {
      ref: "Genesis 1:6",
      he_ref: "בראשית א:ו",
      versions: {},
      book: "Genesis",
      language: "english",
    },
  ];
  Sefaria.textTitleForRef = jest.fn()
    .mockReturnValueOnce("Genesis")
    .mockReturnValueOnce("Genesis")
    .mockReturnValueOnce("Exodus");
  expect(Sefaria.history.getHistoryRefForTitle("Genesis")).toEqual(Sefaria.history.lastPlace[0]);
  expect(Sefaria.history.getHistoryRefForTitle("Exodus")).toEqual(Sefaria.history.lastPlace[1]);
});

test('_loadHistoryItems', async () => {
  // empty
  await AsyncStorage.removeItem('recent');
  await AsyncStorage.removeItem('lastPlace');
  await AsyncStorage.removeItem('lastSyncItems');
  await Sefaria.history._loadHistoryItems();
  expect(Sefaria.history.lastPlace).toEqual([]);
  expect(Sefaria.history.lastSync).toEqual([]);

  // with an item
  const historyItem = {
    ref: "Genesis 1:5",
    he_ref: "בראשית א:א",
    versions: {},
    book: "Genesis",
    language: "english",
    secondary: true,
  };
  await AsyncStorage.setItem('lastPlace', JSON.stringify([historyItem]));
  await Sefaria.history._loadHistoryItems();
  expect(Sefaria.history.lastPlace).toEqual([historyItem]);

  // with an error
  await AsyncStorage.setItem('lastPlace', "ERROR");
  await Sefaria.history._loadHistoryItems();
  expect(Sefaria.history.lastPlace).toEqual([]);
});

test('syncEmpty', async () => {
  await AsyncStorage.removeItem('history');
  await AsyncStorage.removeItem('lastSyncItems');
  await AsyncStorage.removeItem('lastSyncTime');
  Sefaria.api.authToken = jest.fn().mockReturnValueOnce({uid: 1, token: 1});

});
