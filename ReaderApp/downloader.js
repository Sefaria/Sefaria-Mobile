const RNFS = require('react-native-fs'); //for access to file system -- (https://github.com/johanneslumpe/react-native-fs)
import { AsyncStorage } from 'react-native';

const SCHEMA_VERSION = "1";
const HOST_PATH = "http://dev.sefaria.org/static/ios-export/" + SCHEMA_VERSION + "/";


var Downloader = {
  _data: {
    shouldDownload: false,  // Whether or not to download books at all or just stick to API mode
    lastDownload: {},       // Map book titles to timestamp of their last downloaded version or null
    availableDownloads: {}, // Server provided map of titles to ther timestamp of their last update available
    downloadQueue: [],      // Ordered list of title to download
    downloadInProgress: [], // List of titles currently downloading
    lastUpdateCheck: null,  // Timestamp of last download of updates list
  },
  init: function() {
    this._loadData()
      .then(function() {
        console.log("Downloader init with data")
        console.log(Downloader._data);
        console.log(Downloader.titlesAvailable().length + " title available");
        console.log(Downloader.titlesDownloaded().length + " title downloaded");


        if (!Downloader._data.shouldDownload) {
          Downloader.downloadLibrary();
          return;
        }

        Downloader._updateDownloadQueue();


        // if titles where left in progress, put them back in the queue
        if (Downloader._data.downloadInProgress.length) {
          Downloader._setData("downloadQueue", Downloader._data.downloadQueue.concat(Downloader._data.downloadInProgress));
          Downloader._setData("downloadInProgress", []);
        }
        // Resume working through queue
        if (Downloader._data.shouldDownload) {
          Downloader._downloadNext();
        }
      });
  },
  downloadLibrary: function() {
    RNFS.mkdir(RNFS.DocumentDirectoryPath + "/library");
    RNFS.mkdir(RNFS.DocumentDirectoryPath + "/tmp");
    this._setData("shouldDownload", true);
    this.checkForUpdates()
      .then(() => { 
        Downloader._updateDownloadQueue();
        Downloader._downloadNext(); 
     });
  },
  deleteLibrary: function() {
    RNFS.unlink(RNFS.DocumentDirectoryPath + "/library");
    RNFS.unlink(RNFS.DocumentDirectoryPath + "/tmp");
    this._setData("lastDownload", {});
    this._setData("shouldDownload", false);
  },
  checkForUpdates: function() {
    // Downloads the "last_update.json", stores it in _data.availableDownloads 
    // and adds any new items to _data.lastDownload with a null value indicating they've never been downlaoded
    return new Promise(function(resolve, reject) {
      fetch(HOST_PATH + "last_updated.json")
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
          resolve();
        })
        .catch((error) => {
          console.log(error);
          reject(error)
        });
    });
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
  _updateDownloadQueue: function() {
    for (var title in this._data.availableDownloads) {
      if (this._data.availableDownloads.hasOwnProperty(title) && 
          this._data.availableDownloads[title] !== this._data.lastDownload[title]) {
            this._data.downloadQueue.push(title);
      }
    }
    this._setData("downloadQueue", this._data.downloadQueue);
  },
  _downloadNext: function() {
    if (!this._data.downloadQueue.length) { return; }
    var nextTitle = this._data.downloadQueue.shift();
    this._downloadZip(nextTitle)
      .then(() => { Downloader._downloadNext(); });
    this._setData("downloadQueue", this._data.downloadQueue);
  },
  _downloadZip: function(title) {
    var toFile = RNFS.DocumentDirectoryPath + "/tmp/" + title + ".zip";
    var start = new Date();
    console.log("Starting download of " + title);
    return new Promise(function(resolve, reject) {
      RNFS.downloadFile({
        fromUrl: HOST_PATH + encodeURIComponent(title) + ".zip",
        toFile: toFile,
        background: true,
      }).then(function(downloadResult) {
        console.log("Downloaded " + title + " in " + (new Date() - start));
        if (downloadResult.statusCode == 200) {
          RNFS.unlink(RNFS.DocumentDirectoryPath + "/library/" + title + ".zip");
          RNFS.moveFile(toFile, RNFS.DocumentDirectoryPath + "/library/" + title + ".zip");
          Downloader._removeFromInProgress(title);
          Downloader._data.lastDownload[title] = Downloader._data.availableDownloads[title];
          Downloader._setData("lastDownload", Downloader._data.lastDownload);
          resolve();
        } else {
          reject(downloadResult.statusCode);
          RNFS.unlink(toFile);
        }
      })
    });
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
