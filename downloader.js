import {
    Alert,
    AsyncStorage,
    NetInfo,
    Platform,
    PermissionsAndroid,
} from 'react-native';

import RNFB from 'rn-fetch-blob';
import RNFS from 'react-native-fs';
import strings from './LocalizedStrings';


const SCHEMA_VERSION = "4";
const HOST_PATH = "https://readonly.sefaria.org/static/ios-export/" + SCHEMA_VERSION + "/";
//const HOST_PATH = "file:///Users/nss/Documents/Sefaria-Export/ios/" + SCHEMA_VERSION + "/";

var Downloader = {
  _data: {
    shouldDownload: false,  // Whether or not to download books at all or just stick to API mode
    downloadPaused: false,  // Whether or not the download process has been temporarily paused
    lastDownload: {},       // Map book titles to timestamp of their last downloaded version or null
    availableDownloads: {}, // Server provided map of titles to the timestamp of their last update available
    updateComment: "",      // Current update comment. Generally a short note on what's new
    downloadQueue: [],      // Ordered list of title to download
    downloadInProgress: [], // List of titles currently downloading
    lastUpdateCheck: null,  // Timestamp of last download of updates list
    lastUpdateSchema: null, // Schema Version of  last update check
    debugNoLibrary: false   // True if you want to disable library access even if it's downloaded. for debugging purposes
  },
  checkingForUpdates: false,
  downloading: false,     // Whether the download is currently active, not stored in _data because we never want to persist value
  onChange: null, // Handler set above called when books in the Library finish downloading, or download mode changes.
  init: function() {
    return Sefaria.downloader._loadData()
            .then(function() {
              //console.log("Downloader init with data:")
              //console.log(Downloader._data);
              //console.log(Downloader.titlesAvailable().length + " titles available");
              //console.log(Downloader.titlesDownloaded().length + " titles downloaded");
              //console.log("Updates:" , Downloader.updatesAvailable());
              Sefaria.packages.initCompleteLibrary();
              Downloader.checkForUpdatesIfNeeded();
              if (!Downloader._data.downloadPaused) {
                Downloader.resumeDownload();
              }
            });
  },
  downloadLibrary: function(silent=false) {
    RNFB.fs.mkdir(RNFB.fs.dirs.DocumentDir + "/library").catch(error=>{console.log("error creating library folder: " + error)});
    RNFB.fs.mkdir(RNFB.fs.dirs.DocumentDir + "/tmp").catch(error=>{console.log("error creating tmp folder: " + error)});
    Downloader._setData("shouldDownload", true);
    Downloader.downloadUpdatesList()
    .then(() => {
      Downloader._updateDownloadQueue();
      Downloader._downloadNext();
     })
    .catch(Sefaria.downloader._handleDownloadError);
    Downloader.downloading = true;
    Downloader.onChange && Downloader.onChange();
    if (!silent) {
      Alert.alert(
        strings.libraryDownloading,
        strings.libraryDownloadingMessage,
        [{text: strings.ok}]
      );
    }
    Sefaria.track.event("Downloader", "Download Library");
  },
  deleteLibrary: function() {
    return new Promise((resolve, reject) => {
      Alert.alert(
        strings.deleteLibrary,
        strings.confirmDeleteLibraryMessage,
        [
          {text: strings.cancel, style: 'cancel', onPress: resolve},
          {text: strings.delete, style: 'destructive', onPress: () => {
            Sefaria.packages.deletePackage("COMPLETE LIBRARY", resolve);
          }}
        ]
      );
    });
  },
  resumeDownload: function() {
    // Resumes the download process if anything is left in progress or in queue.
    // if titles where left in progress, put them back in the queue
    RNFB.fs.unlink(RNFB.fs.dirs.DocumentDir + "/tmp");
    RNFB.fs.mkdir(RNFB.fs.dirs.DocumentDir + "/tmp");
    Downloader._setData("downloadPaused", false);
    if (Downloader._data.downloadInProgress.length) {
      Downloader._setData("downloadQueue", Downloader._data.downloadQueue.concat(Downloader._data.downloadInProgress));
      Downloader._setData("downloadInProgress", []);
    }
    // Resume working through queue
    if (Downloader._data.shouldDownload) {
      Downloader.downloading = true;
      Downloader._downloadNext();
      Downloader.onChange && Downloader.onChange();
    }
  },
  downloadUpdatesList: function() {
    // Downloads the "last_update.json", stores it in _data.availableDownloads
    // and adds any new items to _data.lastDownload with a null value indicating they've never been downloaded
    // Also downloads latest "toc.json"
    const lastUpdatePromise = fetch(HOST_PATH + "last_updated.json", {headers: {'Cache-Control': 'no-cache'}})
      .then((response) => response.json())
      .then((data) => {
        // Add titles to lastDownload list if they haven't been seen before
        var titles;
        if (!!data.titles) {
          titles = data.titles;
        } else {
          titles = data; //NOTE backwards compatibility
        }
        Downloader._setData("availableDownloads", titles);
        if (data.comment) {
          Downloader._setData("updateComment", data.comment);
        }
        for (var title in titles) {
          if (titles.hasOwnProperty(title) && !(title in Downloader._data.lastDownload)) {
            Downloader._data.lastDownload[title] = null;
          }
        }
        Downloader._setData("lastDownload", Downloader._data.lastDownload);
      });
    return Promise.all([
      lastUpdatePromise,
      Downloader._downloadFile("toc.json").then(Sefaria._loadTOC)
    ]).then(() => {
      var timestamp = new Date().toJSON();
      Downloader._setData("lastUpdateCheck", timestamp)
      Downloader._setData("lastUpdateSchema", SCHEMA_VERSION)
      Downloader.onChange && Downloader.onChange();
      // download these ancillary files after. they shouldn't hold up the update
      Promise.all([
        Downloader._downloadFile("search_toc.json").then(Sefaria.search._loadSearchTOC),
        Downloader._downloadFile("hebrew_categories.json").then(Sefaria._loadHebrewCategories),
        Downloader._downloadFile("people.json").then(Sefaria._loadPeople),
        Downloader._downloadFile("packages.json").then(Sefaria.packages._load),
        Downloader._downloadFile("calendar.json").then(Sefaria._loadCalendar),
      ]);
    });
  },
  downloadUpdates: function() {
    // Starts download of any known updates
    Downloader._updateDownloadQueue();
    Downloader.resumeDownload();
  },
  clearQueue: function() {
    Downloader._setData("downloadQueue", []);
    Downloader._setData("downloadInProgress", []);
  },
  checkForUpdates: function(confirmUpToDate = true) {
    // Downloads the most recent update list then prompts to download updates
    // or notifies the user that the library is up to date.
    Downloader.clearQueue();
    if (confirmUpToDate) {
      Downloader.checkingForUpdates = true;
      Downloader.onChange && Downloader.onChange();
    }
    return Downloader.downloadUpdatesList().then(() => {
      Downloader.checkingForUpdates = false;
      Downloader.onChange && Downloader.onChange();
      var updates = Downloader.updatesAvailable();
      if (updates.length) {
        Downloader._updateDownloadQueue();
        Downloader.promptLibraryUpdate();
      } else if (confirmUpToDate) {
        Alert.alert(
          strings.libraryUpToDate,
          strings.libraryUpToDateMessage,
          [
            {text: strings.ok},
          ]);
      }
    })
    .catch(() => {
      Downloader.checkingForUpdates = false;
      Downloader.onChange && Downloader.onChange();
    });
  },
  checkForUpdatesIfNeeded: function() {
    // Downloads the most recent update list if enough time has passed since previous check.
    // If not updates are available, prompts for to download.
    if (Downloader._data.shouldDownload && Downloader._isUpdateCheckNeeded()) {

      NetInfo.isConnected.fetch().then(isConnected => {
        if (isConnected) {
          Sefaria.downloader.checkForUpdates(false);
        }
      });
    }
  },
  prioritizeDownload: function(title) {
    // Moves `title` to the front of the downloadQueue if it's there
    var i = Sefaria.downloader._data.downloadQueue.indexOf(title);
    if (i > -1) {
        Sefaria.downloader._data.downloadQueue.splice(i, 1);
        Sefaria.downloader._setData("downloadQueue", [title].concat(Sefaria.downloader._data.downloadQueue));
    }
  },
  titlesAvailable: function() {
    // Returns a list of titles that are available for download
    var available = [];
    for (var title in Sefaria.downloader._data.availableDownloads) {
      if (Sefaria.downloader._data.availableDownloads.hasOwnProperty(title)) {
        available.push(title)
      }
    }
    return available;
  },
  titlesDownloaded: function() {
    // Returns a list of titles that have been downloaded
    var downloaded = [];
    for (var title in Sefaria.downloader._data.lastDownload) {
      if (Sefaria.downloader._data.lastDownload.hasOwnProperty(title)
          && Sefaria.downloader._data.lastDownload[title] !== null) {
        downloaded.push(title)
      }
    }
    return downloaded;
  },
  updatesAvailable: function() {
    // Returns a list of titles that have updates available to download
    return Object.keys(Sefaria.downloader._data.availableDownloads)
    .filter(title=>Sefaria.downloader._data.availableDownloads[title] !== Sefaria.downloader._data.lastDownload[title] && Sefaria.packages.titleIsSelected(title));
  },
  updateComment: function() {
    //Returns list of update comments, oldest first
    return Sefaria.downloader._data.updateComment;
  },
  promptLibraryDownload: function() {
    // If it hasn't been done already, prompt the user to download the library.
    AsyncStorage.getItem("libraryDownloadPrompted")
      .then(async (prompted) => {
        // always check for android library
        const oldLibraryExists = await Downloader.deleteOldAndroidLibrary();
        if (!prompted) {
          const onDownload = () => {
            AsyncStorage.setItem("libraryDownloadPrompted", "true");
            Downloader.onChange && Downloader.onChange(true);  // true means open settings page
            Sefaria.track.event("Downloader", "Initial Download Prompt", "accept");
          };
          const onCancel = () => {
            AsyncStorage.setItem("libraryDownloadPrompted", "true");
            Alert.alert(
              strings.usingOnlineLibrary,
              strings.howToDownloadLibraryMessage,
              [
                {text: strings.ok},
              ]);
            Sefaria.track.event("Downloader", "Initial Download Prompt", "decline");
          };
          const showWelcomeAlert = () => {
            Alert.alert(
              strings.welcome,
              strings.downloadLibraryRecommendedMessage,
              [
                {text: strings.openSettings, onPress: onDownload},
                {text: strings.notNow, onPress: onCancel}
              ]
            );
          };

          if (oldLibraryExists) {
            Alert.alert(
              "Found old offline library",
              "Old offline library is not compatible with this version of the app. Please redownload from settings",
              [
                {text: strings.openSettings, onPress: onDownload},
                {text: strings.notNow, onPress: onCancel}
              ]
            );
          } else {
            showWelcomeAlert();
          }
        }
      });
  },
  deleteOldAndroidLibrary: () => {
    const oldDBPath = RNFS.ExternalDirectoryPath + "/databases";
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'android') {
        RNFB.fs.exists(oldDBPath).then(exists => {
          if (exists) {
            RNFB.fs.unlink(oldDBPath);
          }
          resolve(exists);
        });
      } else {
        resolve(false);
      }
    });
  },
  promptLibraryUpdate: function() {
    var updates = Downloader.updatesAvailable();
    var updateComment = Downloader.updateComment();
    var updateFullString = updates.length + " " + strings.updatesAvailableMessage;
    if (updateComment.length > 0) {
      updateFullString += ". " + updateComment;
    }

    if (updates.length == 0) { return; }

    var onDownload = function() {
      Downloader.downloadUpdates();
      Sefaria.track.event("Downloader", "Update Prompt", "accept");
    };

    var onCancel = function() {
      Alert.alert(
        strings.updateLater,
        strings.howToUpdateLibraryMessage,
        [
          {text: strings.ok},
        ]);
      Downloader._setData("downloadPaused", true);
      Sefaria.track.event("Downloader", "Update Prompt", "decline");
    };
    Alert.alert(
      strings.updateLibrary,
      updateFullString,
      [
        {text: strings.download, onPress: onDownload},
        {text: strings.notNow, onPress: onCancel}
      ]);
  },
  _updateDownloadQueue: function() {
    // Examines availableDownloads and adds any title to the downloadQueue that has a newer download available
    // and is not already in queue.
    // Removes anything from downloadQueue that is not in the list of availableDownloads
    Sefaria.downloader._data.downloadQueue = Sefaria.downloader._data.downloadQueue.filter((title) => {
      return title in Sefaria.downloader._data.availableDownloads;
    });
    const updates = Sefaria.downloader.updatesAvailable();
    Sefaria.downloader._data.downloadQueue = Sefaria.downloader._data.downloadQueue.concat(updates.filter(title=>Sefaria.downloader._data.downloadQueue.indexOf(title) === -1));

    Sefaria.downloader._setData("downloadQueue", Sefaria.downloader._data.downloadQueue);
  },
  _downloadNext: function() {
    // Starts download of the next item of the queue, and continues doing so after successful completion.
    if (!Sefaria.downloader._data.downloadQueue.length || Downloader._data.downloadPaused) {
      Sefaria.downloader.downloading = false;
      Downloader.onChange && Downloader.onChange();
      return;
    }
    const nextTitle = Sefaria.downloader._data.downloadQueue[0];
    console.log("Downloading", nextTitle);
    Sefaria.downloader._downloadZip(nextTitle)
      .then(Downloader._downloadNext)
      .catch(Sefaria.downloader._handleDownloadError);
  },
  _handleDownloadError: function(error) {
    console.log("Download error: ", error);
    Downloader.downloading = false;
    var cancelAlert = function() {
      Downloader._setData("downloadPaused", true);
      Alert.alert(
        strings.downloadPaused,
        strings.howToResumeDownloadMessage,
        [
          {text: strings.ok},
        ]);
      Downloader.onChange && Downloader.onChange();
    };
    Alert.alert(
      strings.downloadError,
      strings.downloadErrorMessage,
      [
        {text: strings.tryAgain, onPress: () => { Downloader.resumeDownload(); }},
        {text: strings.pause, onPress: cancelAlert}
      ]);
  },
  _downloadFile: async function(filename) {
    const toFile = RNFB.fs.dirs.DocumentDir + "/library/" + filename;
    const start = new Date();
    const tempFile = RNFB.fs.dirs.DocumentDir + "/tmp/" + filename;
    try {
      const downloadResult = await RNFB.config({
        IOSBackgroundTask: true,
        indicator: true,
        path: tempFile,
      })
      .fetch(
        'GET',
        HOST_PATH + encodeURIComponent(filename)
      );
      console.log("Downloaded " + filename + " in " + (new Date() - start));
      const status = downloadResult.info().status;
      if (status >= 300 || status < 200) {
        RNFB.fs.unlink(tempFile);
        throw new Error(status + " - " + filename);
      }
      RNFB.fs.mv(tempFile, toFile)
      .catch(error => {
        console.log('mv error', error);
      });
    } catch (err) {
      Sefaria.downloader._handleDownloadError(err);
    }
  },
  _downloadZip: async function(title) {
    // Downloads `title`, first to /tmp then to /library when complete.
    // Manages `title`'s presence in downloadQueue and downloadInProgress.
    //console.log("Starting download of " + title);
    Sefaria.downloader._removeFromDownloadQueue(title);
    Sefaria.downloader._setData("downloadInProgress", [title].concat(Sefaria.downloader._data.downloadInProgress));
    await Sefaria.downloader._downloadFile(title + ".zip");
    Downloader._removeFromInProgress(title);
    Downloader._data.lastDownload[title] = Downloader._data.availableDownloads[title];
    Downloader._setData("lastDownload", Downloader._data.lastDownload);
    Downloader.onChange && Downloader.onChange();
  },
  _removeFromDownloadQueueBulk: function(titles) {
    for (t of titles) {
      let i = Sefaria.downloader._data.downloadQueue.indexOf(t);
      if (i > -1) { Sefaria.downloader._data.downloadQueue.splice(i, 1); }
      else {
        i = Sefaria.downloader._data.downloadInProgress.indexOf(t);
        if (i > -1) { Sefaria.downloader._data.downloadInProgress.splice(i, 1); }
      }
    }
    Sefaria.downloader._setData("downloadQueue", Sefaria.downloader._data.downloadQueue);
    Sefaria.downloader._setData("downloadInProgress", Sefaria.downloader._data.downloadInProgress);
  },
  _removeFromDownloadQueue: function(title) {
    var i = Sefaria.downloader._data.downloadQueue.indexOf(title);
    if (i > -1) {
        Sefaria.downloader._data.downloadQueue.splice(i, 1);
        Sefaria.downloader._setData("downloadQueue", Sefaria.downloader._data.downloadQueue);
    }
  },
  _removeFromInProgress: function(title) {
    var i = Sefaria.downloader._data.downloadInProgress.indexOf(title);
    if (i > -1) {
        Sefaria.downloader._data.downloadInProgress.splice(i, 1);
        Sefaria.downloader._setData("downloadInProgress", Sefaria.downloader._data.downloadInProgress);
    }
  },
  _isUpdateCheckNeeded: function() {
    // Returns true if enough time has passed since the last check for updates
    if (!Sefaria.downloader._data.lastUpdateCheck) { return true; }
    var cutoff = new Date(Sefaria.downloader._data.lastUpdateCheck);
    cutoff.setDate(cutoff.getDate() + 7) // One week;
    var now = new Date();
    return now > cutoff;
  },
  _loadData: function() {
    // Loads data from each field in `_data` stored in Async storage into local memory for sync access.
    // Returns a Promise that resolves when all fields are loaded.
    var promises = [];
    for (var field in Sefaria.downloader._data) {
      if (Sefaria.downloader._data.hasOwnProperty(field)) {
        var loader = function(field, value) {
          if (!value) { return; }
          Downloader._data[field] = JSON.parse(value);
        }.bind(null, field);
        var promise = AsyncStorage.getItem(field)
          .then(loader)
          .catch(function(error) {
            console.error("AsyncStorage failed to load libraryData: " + error);
          });;
        promises.push(promise);
      }
    }
    return Promise.all(promises);
  },
  _setData: function(field, value) {
    // Sets `_data[field]` to `value` in local memory and saves it to Async storage
    Sefaria.downloader._data[field] = value;
    AsyncStorage.setItem(field, JSON.stringify(value));
  },
};


export default Downloader;
