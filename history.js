import AsyncStorage from '@react-native-community/async-storage';

const History = {
  saved: [],
  _hasSwipeDeleted: false,
  migrateFromOldRecents: async function() {
    const recent = await AsyncStorage.getItem("recent");
    if (!!recent) {
      json = JSON.parse(recent);
      const history = json.map(r => ({
        ref: r.ref,
        he_ref: Sefaria.toHeSegmentRef(r.heRef, r.ref),
        versions: r.versions || {},
        book: Sefaria.textTitleForRef(r.ref),
      }));
      const historyStr = JSON.stringify(history);
      // 2017 12 1
      return Promise.all([
        AsyncStorage.removeItem("recent"),
        AsyncStorage.setItem("history", historyStr),
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
  getHistoryObject: function({
    sheet,
    activeSheetNode,
    segmentRef,
    heSegmentRef,
    sectionIndexRef,
    sectionArray,
    sectionHeArray,
    selectedVersions,
    textListVisible,
  }, textLanguage) {
    // get ref to send to /api/profile/user_history
    let ref, sheet_owner, sheet_title;
    if (!!sheet) {
      ref = `Sheet ${sheet.id}${activeSheetNode ? `:${activeSheetNode}`: ''}`;
      sheet_owner = sheet.ownerName;
      sheet_title = sheet.title;
    } else {
      ref = (textListVisible && segmentRef) ? segmentRef : sectionArray[sectionIndexRef];
      he_ref = (textListVisible && segmentRef) ? (heSegmentRef || Sefaria.toHeSegmentRef(sectionHeArray[sectionIndexRef], segmentRef)) : sectionHeArray[sectionIndexRef];
    }
    return {
      ref,
      he_ref,
      versions: selectedVersions || {},
      book: Sefaria.textTitleForRef(ref),
      language: textLanguage,
      sheet_owner,
      sheet_title,
    };
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
    await AsyncStorage.removeItem('lastSyncItems');
    await AsyncStorage.removeItem('lastSyncTime');
    await AsyncStorage.removeItem('history');
    */
    await Sefaria.history.migrateFromOldRecents();
    const lastPlace = await AsyncStorage.getItem('lastPlace');
    const lastSync = await AsyncStorage.getItem('lastSyncItems');
    try { Sefaria.history.lastPlace = JSON.parse(lastPlace) || []; }
    catch(e) { Sefaria.history.lastPlace = []; }
    try { Sefaria.history.lastSync = JSON.parse(lastSync) || []; }
    catch(e) { Sefaria.history.lastSync = []; }
  },
  syncHistory: async function() {
    // TODO: sync user settings
    const currHistoryStr = await AsyncStorage.getItem('history');
    const lastSyncStr = await AsyncStorage.getItem('lastSyncItems');
    const lastSyncItems = JSON.parse(lastSyncStr) || [];
    let currHistory = JSON.parse(currHistoryStr) || [];
    currHistory = lastSyncItems.concat(currHistory);
    await Sefaria.api.getAuthToken();
    if (Sefaria._auth.uid) {
      try {
        const lastSyncTime = await AsyncStorage.getItem('lastSyncTime') || '0';
        const url = Sefaria.api._baseHost + "api/profile/sync";
        const body = Sefaria.api.urlFormEncode({user_history: lastSyncStr, last_sync: lastSyncTime});
        const response = await fetch(url, {
          method: "POST",
          body,
          headers: {
            'Authorization': `Bearer ${Sefaria._auth.token}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
        }).then(res => {
          if (res.status < 200 || res.status >= 300) { throw new Error("Bad Response Code " + res.status); }
          return res.json();
        });
        console.log('resp', response);
        await AsyncStorage.setItem('lastSyncTime', '' + response.last_sync);
        await AsyncStorage.removeItem('lastSyncItems');
        currHistory = Sefaria.history.mergeHistory(currHistory, response.user_history);

        await AsyncStorage.setItem('lastPlace', JSON.stringify(Sefaria.history.historyToLastPlace(currHistory)));
        await AsyncStorage.setItem('history', JSON.stringify(currHistory));
      } catch (e) {
        // try again later
        console.log('sync error', e);
      }
    }
    return currHistory;
  },
  syncHistoryGetSaved: async () => {
    const history = await Sefaria.history.syncHistory();
    return history.filter(h => h.saved);
  },
  mergeHistory: function(currHistory, newHistory) {
    return newHistory.concat(currHistory).sort((a, b) => b.time_stamp - a.time_stamp);
  },
  saveSavedItem: function(item, action) {
    /* action: can be either 'add_saved' or 'delete_saved'
     */
    item = {
      ...item,
      action,
      time_stamp: Sefaria.util.epoch_time(),
    };
    Sefaria.history.last_sync = [item].concat(Sefaria.history.last_sync);
    AsyncStorage.setItem("lastSyncItems", JSON.stringify(Sefaria.history.lastSync));
  },
  indexOfSaved: function(ref) {
    // create saved in memory
    return Sefaria.history.saved.findIndex(existing => ref === existing.ref);
  },
  _loadSavedItems: async function() {
    const hasSwipeDeleted = await AsyncStorage.getItem("hasSwipeDeleted");
    Sefaria.history._hasSwipeDeleted = JSON.parse(hasSwipeDeleted) || false;
    const saved = await AsyncStorage.getItem("saved");
    Sefaria.saved = JSON.parse(saved) || [];
  },
};

export default History;
