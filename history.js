import AsyncStorage from '@react-native-community/async-storage';
import { STATE_ACTIONS } from './StateManager';

const History = {
  saved: [],
  _hasSwipeDeleted: false,
  migrateFromOldRecents: async function() {
    const recentStr = await AsyncStorage.getItem("recent");
    const savedStr = await AsyncStorage.getItem("saved");
    if (!!recentStr || !!savedStr) {
      recent = JSON.parse(recentStr) || [];
      saved = JSON.parse(savedStr) || [];
      const history = recent.map(r => ({
        ref: r.ref,
        he_ref: Sefaria.toHeSegmentRef(r.heRef, r.ref),
        versions: r.versions || {},
        book: Sefaria.textTitleForRef(r.ref),
      }));
      const savedHistory = saved.map(r => ({
        action: 'add_saved',
        ref: r.ref,
        he_ref: Sefaria.toHeSegmentRef(r.heRef, r.ref),
        versions: {},  // saved didn't keep track of version
        book: Sefaria.textTitleForRef(r.ref),
      }));
      const historyStr = JSON.stringify(savedHistory.concat(history));
      // 2017 12 1
      return Promise.all([
        AsyncStorage.removeItem("recent"),
        AsyncStorage.removeItem("saved"),
        AsyncStorage.setItem("lastSyncItems", historyStr),
        AsyncStorage.setItem("lastSyncTime", '' + Math.floor((new Date(2017, 11, 1)).getTime()/1000)),  // Dec 1, 2017 approx date of launch of old recent items
        AsyncStorage.setItem("lastPlace", JSON.stringify(Sefaria.history.historyToLastPlace(history))),
      ]);
    }
    return Promise.resolve();
  },
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
    AsyncStorage.setItem("lastSyncItems", JSON.stringify(Sefaria.history.lastSync));
    if (!history_item.secondary) {
      // secondary items should not be saved in lastPlace
      Sefaria.history.lastPlace = Sefaria.history.historyToLastPlace([history_item].concat(Sefaria.history.lastPlace));
      AsyncStorage.setItem("lastPlace", JSON.stringify(Sefaria.history.lastPlace));
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
    /*
    await AsyncStorage.removeItem('lastPlace');
    await AsyncStorage.removeItem('savedItems');
    await AsyncStorage.removeItem('lastSyncItems');
    await AsyncStorage.removeItem('lastSyncTime');
    await AsyncStorage.removeItem('history');
    await AsyncStorage.removeItem('lastSettingsUpdateTime');
    */
    await Sefaria.history.migrateFromOldRecents();
    const lastPlace = await AsyncStorage.getItem('lastPlace');
    const lastSync = await AsyncStorage.getItem('lastSyncItems');
    const saved = await AsyncStorage.getItem('savedItems');
    const hasSwipeDeleted = await AsyncStorage.getItem("hasSwipeDeleted");
    try { Sefaria.history.lastPlace = JSON.parse(lastPlace) || []; }
    catch(e) { Sefaria.history.lastPlace = []; }
    try { Sefaria.history.lastSync = JSON.parse(lastSync) || []; }
    catch(e) { Sefaria.history.lastSync = []; }
    try { Sefaria.history.saved = JSON.parse(saved) || []; }
    catch(e) { Sefaria.history.saved = []; }
    Sefaria.history._hasSwipeDeleted = JSON.parse(hasSwipeDeleted) || false;
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
    const currHistoryStr = await AsyncStorage.getItem('history') || '[]';
    const lastSyncStr = await AsyncStorage.getItem('lastSyncItems') || '[]';
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
        await AsyncStorage.removeItem('lastSyncItems');
        const currSaved = JSON.parse(await AsyncStorage.getItem('savedItems') || '[]');
        const { mergedHistory, mergedSaved } = Sefaria.history.mergeHistory(currHistory, currSaved, response.user_history);
        Sefaria.history.lastPlace = Sefaria.history.historyToLastPlace(mergedHistory);
        Sefaria.history.saved = mergedSaved;
        await AsyncStorage.setItem('savedItems', JSON.stringify(Sefaria.history.saved));
        await AsyncStorage.setItem('lastPlace', JSON.stringify(Sefaria.history.lastPlace));
        await AsyncStorage.setItem('history', JSON.stringify(mergedHistory));
        Sefaria.history.updateSettingsAfterSync(dispatch, response.settings);
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
    const finalItem = {
      ...item,
      action,
      time_stamp: Sefaria.util.epoch_time(),
    };
    console.log('save', finalItem);
    Sefaria.history.lastSync = [finalItem].concat(Sefaria.history.lastSync);
    if (action === 'add_saved') {
      Sefaria.history.saved = [item].concat(Sefaria.history.saved);
    } else {
      Sefaria.history.saved = Sefaria.history.saved.filter(s => s.ref !== item.ref);
    }
    AsyncStorage.setItem("lastSyncItems", JSON.stringify(Sefaria.history.lastSync));
    AsyncStorage.setItem("savedItems", JSON.stringify(Sefaria.history.saved));
  },
  indexOfSaved: function(ref) {
    return Sefaria.history.saved.findIndex(existing => ref === existing.ref);
  },
};

export default History;
