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
  const lastSyncTime = Math.floor((new Date(2017, 11, 1)).getTime()/1000);
  const lastPlace = JSON.stringify(Sefaria.history.historyToLastPlace(JSON.parse(historyItems)));
  Sefaria.textTitleForRef = jest.fn(() => "Genesis");
  AsyncStorage.setItem('recent', recentItems);
  await Sefaria.history.migrateFromOldRecents();

  // matchers
  expect((await AsyncStorage.getItem('recent'))).toBeNull();
  expect((await AsyncStorage.getItem('history'))).toBe(historyItems);
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
