'use strict';
import crashlytics from '@react-native-firebase/crashlytics';
import {FileSystem} from 'react-native-unimodules'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STATE_ACTIONS } from './StateManager';

const History = {
  saved: [],
  lastPlace: [],
  lastSync: [],
  _hasSwipeDeleted: false,
  _hasSyncedOnce: false,
  migrateFromAsyncStorageHistory: async function() {
    const hasMigrated = await AsyncStorage.getItem('hasMigratedToHistoryJSONFiles');
    if (hasMigrated) { return; }
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}history`);
    try {
      const lastPlace = await AsyncStorage.getItem('lastPlace');
      Sefaria.history.setItem('lastPlace', lastPlace);
      await AsyncStorage.removeItem('lastPlace');
    } catch (e) {
      crashlytics().recordError(new Error("Failed to migrate lastPlace"));
    }

    try {
      const savedItems = await AsyncStorage.getItem('savedItems');
      Sefaria.history.setItem('savedItems', savedItems);
      await AsyncStorage.removeItem('savedItems');
    } catch (e) {
      crashlytics().recordError(new Error("Failed to migrate savedItems"));
    }

    try {
      const lastSyncItems = await AsyncStorage.getItem('lastSyncItems');
      Sefaria.history.setItem('lastSyncItems', lastSyncItems);
      await AsyncStorage.removeItem('lastSyncItems');
    } catch (e) {
      crashlytics().recordError(new Error("Failed to migrate lastSyncItems"));
    }

    try {
      const history = await AsyncStorage.getItem('history');
      Sefaria.history.setItem('history', history)
      await AsyncStorage.removeItem('history');
    } catch (e) {
      crashlytics().recordError(new Error("Failed to migrate history"));
    }

    await AsyncStorage.setItem('hasMigratedToHistoryJSONFiles', 'true');
  },
  getFilename: key => `${FileSystem.documentDirectory}history/${key}.json`,
  getItem: key => FileSystem.readAsStringAsync(Sefaria.history.getFilename(key)).catch(e => null),
  setItem: (key, value) => FileSystem.writeAsStringAsync(Sefaria.history.getFilename(key), value),
  removeItem: key => FileSystem.deleteAsync(Sefaria.history.getFilename(key)).catch((e)=>{}),
  historyToLastPlace: function(history_item_array) {
    const seenBooks = {};
    const lastPlace = [];
    for (let history_item of history_item_array) {
      if (seenBooks[history_item.book]) { continue; }
      seenBooks[history_item.book] = true;
      lastPlace.push(history_item);
    }
    return lastPlace;
  },
  historyToSaved: function(history_item_array) {
    return history_item_array.filter(h => h.saved);
  },
  saveHistoryItem: async function(getHistoryObject, withIntent, onSave, intentTime=3000) {
    // getHistoryObject: dependent on state of whatever component called this func
    // onSave: optional function which is called with the list of history items to actually save
    let history_item = getHistoryObject();
    if (!history_item.ref) { return; }
    if (withIntent) {
      await Sefaria.util.timeoutPromise(intentTime);
      const new_history_item = getHistoryObject();
      if (history_item.ref !== new_history_item.ref || !Sefaria.util.object_equals(history_item.versions, new_history_item.versions)) { return; /* didn't spend enough time reading */ }
    }
    history_item.time_stamp = Sefaria.util.epoch_time();
    const lSync = Sefaria.history.lastSync;
    // remove items that are the same and saved recently
    if (
      lSync.length > 0 &&
      history_item.ref === lSync[0].ref &&
      history_item.time_stamp - lSync[0].time_stamp <= 60
    ) { return; }
    if (onSave) { onSave(history_item); }
    Sefaria.history.lastSync = [history_item].concat(lSync);
    Sefaria.history.setItem("lastSyncItems", JSON.stringify(Sefaria.history.lastSync));
    if (!history_item.secondary) {
      // secondary items should not be saved in lastPlace
      Sefaria.history.lastPlace = Sefaria.history.historyToLastPlace([history_item].concat(Sefaria.history.lastPlace));
      Sefaria.history.setItem("lastPlace", JSON.stringify(Sefaria.history.lastPlace));
    }
  },
  getHistoryRefForTitle: function(title) {
    //given an index title, return the ref of that title in Sefaria.history.
    //if it doesn't exist, return null
    for (let item of Sefaria.history.lastPlace) {
      if (Sefaria.textTitleForRef(item.ref) === title) { return item; }
    }
    return null;
  },
  _loadHistoryItems: async function() {
    await Sefaria.history.migrateFromAsyncStorageHistory();
    const lastPlace = await Sefaria.history.getItem('lastPlace');
    const lastSync = await Sefaria.history.getItem('lastSyncItems');
    const saved = await Sefaria.history.getItem('savedItems');
    const hasSwipeDeleted = await AsyncStorage.getItem("hasSwipeDeleted");
    const hasSyncedOnce = await AsyncStorage.getItem('hasSyncedOnce');
    try { Sefaria.history.lastPlace = JSON.parse(lastPlace) || []; }
    catch(e) { Sefaria.history.lastPlace = []; }
    try { Sefaria.history.lastSync = JSON.parse(lastSync) || []; }
    catch(e) { Sefaria.history.lastSync = []; }
    try { Sefaria.history.saved = JSON.parse(saved) || []; }
    catch(e) { Sefaria.history.saved = []; }
    Sefaria.history._hasSwipeDeleted = JSON.parse(hasSwipeDeleted) || false;
    Sefaria.history._hasSyncedOnce = JSON.parse(hasSyncedOnce) || false;
  },
  syncHistory: async function(dispatch, settings) {
    /*
    settings is of the form
    {
      email_notifications: oneOf('daily', 'weekly', 'never'),
      interface_language: oneOf('english', 'hebrew'),
      textual_custom: oneOf('sephardi', 'ashkenazi')
    }
    */
    const currHistoryStr = await Sefaria.history.getItem('history') || '[]';
    const lastSyncStr = await Sefaria.history.getItem('lastSyncItems') || '[]';
    const settingsStr = JSON.stringify(settings);
    const lastSyncItems = JSON.parse(lastSyncStr);
    let currHistory = JSON.parse(currHistoryStr);
    currHistory = lastSyncItems.filter(h => !h.action).concat(currHistory);
    await Sefaria.api.getAuthToken();
    if (Sefaria._auth.uid) {
      try {
        const lastSyncTime = await AsyncStorage.getItem('lastSyncTime') || '0';
        const url = Sefaria.api._baseHost + "api/profile/sync";
        const body = Sefaria.api.urlFormEncode({user_history: lastSyncStr, last_sync: lastSyncTime, settings: settingsStr});
        const response = await fetch(url, {
          method: "POST",
          body,
          headers: {
            'Authorization': `Bearer ${Sefaria._auth.token}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
        }).then(res => {
          if (res.status < 200 || res.status >= 300) {
            console.log('Error text', res.text());
            throw new Error("Bad Response Code " + res.status);
          }
          return res.json();
        });
        console.log('resp', response);
        await AsyncStorage.setItem('lastSyncTime', '' + response.last_sync);
        await Sefaria.history.removeItem('lastSyncItems');
        const currSaved = JSON.parse(await Sefaria.history.getItem('savedItems') || '[]');
        const { mergedHistory, mergedSaved } = Sefaria.history.mergeHistory(currHistory, currSaved, response.user_history);
        Sefaria.history.lastPlace = Sefaria.history.historyToLastPlace(mergedHistory);
        Sefaria.history.saved = mergedSaved;
        currHistory = mergedHistory;
        await Sefaria.history.setItem('savedItems', JSON.stringify(Sefaria.history.saved));
        await Sefaria.history.setItem('lastPlace', JSON.stringify(Sefaria.history.lastPlace));
        await Sefaria.history.setItem('history', JSON.stringify(mergedHistory));
        Sefaria.history.updateSettingsAfterSync(dispatch, response.settings);
        if (!Sefaria.history._hasSyncedOnce) {
          Sefaria.history._hasSyncedOnce = true;
          await AsyncStorage.setItem('hasSyncedOnce', 'true');
        }
      } catch (e) {
        // try again later
        console.log('sync error', e);
      }
    }
    return currHistory;
  },
  syncHistoryGetSaved: async (dispatch, settings) => {
    await Sefaria.history.syncHistory(dispatch, settings);
    return Sefaria.history.saved;
  },
  updateSettingsAfterSync: function(dispatch, newSettings) {
    const fieldToActionMap = {
      email_notifications: STATE_ACTIONS.setEmailFrequency,
      interface_language: STATE_ACTIONS.setInterfaceLanguage,
      textual_custom: STATE_ACTIONS.setPreferredCustom,
    };
    Object.entries(newSettings).map(([key, value]) => {
      if (!fieldToActionMap[key]) { return; }
      dispatch({
        type: fieldToActionMap[key],
        value,
        time: newSettings.time_stamp,
      });
    });
  },
  mergeHistory: function(currHistory, currSaved, newHistory) {
    const delete_saved_set = new Set();
    const newSaved = [];
    const mergedHistory = newHistory
    .map(h => {
      // see https://codeburst.io/use-es2015-object-rest-operator-to-omit-properties-38a3ecffe90
      const { delete_saved, saved, ...rest } = h;
      if (delete_saved) { delete_saved_set.add(h.ref); }
      if (saved) { newSaved.push(h); }
      return h;
    })
    .concat(currHistory)
    .sort((a, b) => b.time_stamp - a.time_stamp);

    const mergedSaved = newSaved
    .concat(currSaved)
    .filter(s => !delete_saved_set.has(s.ref))
    .sort((a, b) => b.time_stamp - a.time_stamp);

    return {
      mergedHistory,
      mergedSaved,
    };
  },
  saveSavedItem: function(item, action) {
    /* action: can be either 'add_saved' or 'delete_saved'
     */
    const lastSyncItem = {
      ...item,
      action,
      time_stamp: Sefaria.util.epoch_time(),
    };
    Sefaria.history.lastSync = [lastSyncItem].concat(Sefaria.history.lastSync);
    if (action === 'add_saved') {
      Sefaria.history.saved = [item].concat(Sefaria.history.saved);
    } else {
      Sefaria.history.saved = Sefaria.history.saved.filter(s => s.ref !== item.ref);
    }
    Sefaria.history.setItem("lastSyncItems", JSON.stringify(Sefaria.history.lastSync));
    Sefaria.history.setItem("savedItems", JSON.stringify(Sefaria.history.saved));
  },
  indexOfSaved: function(ref) {
    return Sefaria.history.saved.findIndex(existing => ref === existing.ref);
  },
};

export default History;
