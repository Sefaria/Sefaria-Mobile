import {
  AlertIOS,
  AsyncStorage
} from 'react-native';

const RNFS = require('react-native-fs'); //for access to file system -- (https://github.com/johanneslumpe/react-native-fs)
const strings = require('./LocalizedStrings');


const SCHEMA_VERSION = "2";
const HOST_PATH = "http://readonly.sefaria.org/static/ios-export/" + SCHEMA_VERSION + "/";
//git commconst HOST_PATH = "file:///Users/nss/Documents/Sefaria-Export/ios/" + SCHEMA_VERSION + "/";

var Downloader = {
  _data: {
    shouldDownload: false,  // Whether or not to download books at all or just stick to API mode
    lastDownload: {},       // Map book titles to timestamp of their last downloaded version or null
    availableDownloads: {}, // Server provided map of titles to ther timestamp of their last update available
    downloadQueue: [],      // Ordered list of title to download
    downloadInProgress: [], // List of titles currently downloading
    lastUpdateCheck: null,  // Timestamp of last download of updates list
    debugNoLibrary: false   // True if you want to disable library access even if it's downloaded for debugging purposes
  },
  downloading: false,     // Whether the download is currently active, not stored in _data because we never want to persist value
  onChange: null, // Handler set above called when books in the Library finish downloading, or download mode changes.
  init: function() {
    return this._loadData()
            .then(function() {
              //console.log("Downloader init with data:")
              //console.log(Downloader._data);
              //console.log(Downloader.titlesAvailable().length + " titles available");
              //console.log(Downloader.titlesDownloaded().length + " titles downloaded");
              Downloader.resumeDownload();
            });
  },
  downloadLibrary: function() {
    RNFS.mkdir(RNFS.DocumentDirectoryPath + "/library");
    RNFS.mkdir(RNFS.DocumentDirectoryPath + "/tmp");
    Downloader._setData("shouldDownload", true);
    Downloader.checkForUpdates()
      .then(() => {
        Downloader._updateDownloadQueue();
        Downloader._downloadNext();
     });
    Downloader.downloading = true;
    Downloader.onChange && Downloader.onChange();
    AlertIOS.alert(
      strings.libraryDownloading,
      strings.libraryDownloadingMessage,
      [{text: strings.ok}]
    );
  },
  deleteLibrary: function() {
    AlertIOS.alert(
      strings.deleteLibrary,
      strings.confirmDeleteLibraryMessage,
      [
        {text: strings.cancel, style: 'cancel'},
        {text: strings.delete, style: 'destructive', onPress: () => {
          RNFS.unlink(RNFS.DocumentDirectoryPath + "/library");
          RNFS.unlink(RNFS.DocumentDirectoryPath + "/tmp");
          Downloader._setData("lastDownload", {});
          Downloader._setData("shouldDownload", false);
          Downloader.onChange && Downloader.onChange();
        }}
      ]);
  },
  resumeDownload: function() {
    // Resumes the download process if anything is left in progress or in queue.
    // if titles where left in progress, put them back in the queue
    RNFS.unlink(RNFS.DocumentDirectoryPath + "/tmp");
    RNFS.mkdir(RNFS.DocumentDirectoryPath + "/tmp");
    if (Downloader._data.downloadInProgress.length) {
      Downloader._setData("downloadQueue", Downloader._data.downloadQueue.concat(Downloader._data.downloadInProgress));
      Downloader._setData("downloadInProgress", []);
    }
    // Resume working through queue
    if (Downloader._data.shouldDownload) {
      Downloader.downloading = true;
      Downloader._downloadNext();
    }
  },
  checkForUpdates: function() {
    // Downloads the "last_update.json", stores it in _data.availableDownloads
    // and adds any new items to _data.lastDownload with a null value indicating they've never been downlaoded
    // Also downloads latest "toc.json"
    var lastUpdatePromise = fetch(HOST_PATH + "last_updated.json")
      .then((response) => response.json())
      .then((data) => {
        Downloader._setData("availableDownloads", data);
        // Add titles to lastDownload list if they haven't been seen before
        for (var title in data) {
          if (data.hasOwnProperty(title) && !(title in Downloader._data.lastDownload)) {
            Downloader._data.lastDownload[title] = null;
          }
        }
        Downloader._setData("lastDownload", Downloader._data.lastDownload);
      });
    var tocPromise = RNFS.downloadFile({
      fromUrl: HOST_PATH + "toc.json",
      toFile: RNFS.DocumentDirectoryPath + "/library/toc.json",
      background: true,
    }).then(() => {
      Sefaria._loadTOC();
    });
    return Promise.all([lastUpdatePromise, tocPromise]);
  },
  prioritizeDownload: function(title) {
    // Moves `title` to the front of the downloadQueue if it's there
    var i = this._data.downloadQueue.indexOf(title);
    if (i > -1) {
        this._data.downloadQueue.splice(i, 1);
        this._setData("downloadQueue", [title].concat(this._data.downloadQueue));
    }
  },
  titlesAvailable: function() {
    // Returns a list of titles that are available for download
    var available = [];
    for (var title in this._data.availableDownloads) {
      if (this._data.availableDownloads.hasOwnProperty(title)) {
        available.push(title)
      }
    }
    return available;
  },
  titlesDownloaded: function() {
    // Returns a list of titles that have been downloaded
    var downloaded = [];
    for (var title in this._data.lastDownload) {
      if (this._data.lastDownload.hasOwnProperty(title)
          && this._data.lastDownload[title] !== null) {
        downloaded.push(title)
      }
    }
    return downloaded;
  },
  promptLibraryDownload: function() {
    // If it hasn't been done already, prompt the user to download the library.
    AsyncStorage.getItem("libraryDownloadPrompted")
      .then((prompted) => {
        if (!prompted) {
          var onDownload = function() {
            AsyncStorage.setItem("libraryDownloadPrompted", "true");
            Downloader.downloadLibrary();
          };
          var onCancel = function() {
            AsyncStorage.setItem("libraryDownloadPrompted", "true");
            AlertIOS.alert(
              strings.usingOnlineLibrary,
              strings.howToDownloadLibraryMessage,
              [
                {text: strings.ok},
              ]);
          };
          AlertIOS.alert(
            strings.welcome,
            strings.downloadLibraryRecommendedMessage,
            [
              {text: strings.download, onPress: onDownload},
              {text: strings.notNow, onPress: onCancel}
            ]);
        }
      });
  },
  _updateDownloadQueue: function() {
    // Examines availableDownloads and adds any title to the downloadQueue that has a newer download available
    // and is not already in queue.
    for (var title in this._data.availableDownloads) {
      if (this._data.availableDownloads.hasOwnProperty(title) &&
          this._data.availableDownloads[title] !== this._data.lastDownload[title]) {
            if (this._data.downloadQueue.indexOf(title) == -1) {
              this._data.downloadQueue.push(title);
            }
      }
    }
    this._setData("downloadQueue", this._data.downloadQueue);
  },
  _downloadNext: function() {
    // Starts download of the next item of the queue, and continues doing so after successful completion.
    if (!this._data.downloadQueue.length) {
      this.downloading = false;
      return;
    }
    var nextTitle = this._data.downloadQueue[0];
    this._downloadZip(nextTitle)
      .then(() => { Downloader._downloadNext(); })
      .catch(this._handleDownloadError);
  },
  _handleDownloadError: function(error) {
    console.log("Download error: ", error);
    Downloader.downloading = false;
    var cancelAlert = function() {
      AlertIOS.alert(
        strings.downloadPaused,
        strings.howToResumeDownloadMessage,
        [
          {text: strings.ok},
        ]);
    };
    AlertIOS.alert(
      strings.downloadError,
      strings.downloadErrorMessage,
      [
        {text: strings.tryAgain, onPress: () => { Downloader.resumeDownload(); }},
        {text: strings.pause, onPress: cancelAlert}
      ]);
  },
  _downloadZip: function(title) {
    // Downloads `title`, first to /tmp then to /library when complete.
    // Manages `title`'s presense in downloadQueue and downloadInProgress.
    var tempFile = RNFS.DocumentDirectoryPath + "/tmp/" + title + ".zip";
    var toFile   = RNFS.DocumentDirectoryPath + "/library/" + title + ".zip"
    var start = new Date();
    //console.log("Starting download of " + title);
    this._removeFromDowloadQueue(title);
    this._setData("downloadInProgress", [title].concat(this._data.downloadInProgress));
    return new Promise(function(resolve, reject) {
      RNFS.exists(toFile).then((exists) => {
        if (exists) { RNFS.unlink(toFile); }
      });
      RNFS.downloadFile({
        fromUrl: HOST_PATH + encodeURIComponent(title) + ".zip",
        toFile: tempFile
      }).then(function(downloadResult) {
        if (downloadResult.statusCode == 200) {
          //console.log("Downloaded " + title + " in " + (new Date() - start));
          RNFS.moveFile(tempFile, toFile);
          Downloader._removeFromInProgress(title);
          Downloader._data.lastDownload[title] = Downloader._data.availableDownloads[title];
          Downloader._setData("lastDownload", Downloader._data.lastDownload);
          Downloader.onChange && Downloader.onChange();
          resolve();
        } else {
          reject(downloadResult.statusCode);
          RNFS.unlink(tempFile);
        }
      })
    });
  },
  _removeFromDowloadQueue: function(title) {
    var i = this._data.downloadQueue.indexOf(title);
    if (i > -1) {
        this._data.downloadQueue.splice(i, 1);
        this._setData("downloadQueue", this._data.downloadQueue);
    }
  },
  _removeFromInProgress: function(title) {
    var i = this._data.downloadInProgress.indexOf(title);
    if (i > -1) {
        this._data.downloadInProgress.splice(i, 1);
        this._setData("downloadInProgress", this._data.downloadInProgress);
    }
  },
  _loadData: function() {
    // Loads data from each field in `_data` stored in Async storage into local memory for sync access.
    // Returns a Promise that resolves when all fields are loaded.
    var promises = [];
    for (var field in this._data) {
      if (this._data.hasOwnProperty(field)) {
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
    this._data[field] = value;
    AsyncStorage.setItem(field, JSON.stringify(value));
  },
};


module.exports = Downloader;
