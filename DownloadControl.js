'use strict';

import RNFB from 'rn-fetch-blob';
import { unzip } from 'react-native-zip-archive'; //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
import strings from './LocalizedStrings'
import {Alert, Platform} from 'react-native';
import AsyncStorage from "@react-native-community/async-storage";

const SCHEMA_VERSION = "6";
const DOWNLOAD_SERVER = "https://readonly.sefaria.org";
const HOST_PATH = `${DOWNLOAD_SERVER}/static/ios-export/${SCHEMA_VERSION}`;
const HOST_BUNDLE_URL = `${HOST_PATH}/bundles`;
const BUNDLE_LOCATION = RNFB.fs.dirs.DocumentDir + "/tmp/bundle.zip";


let BooksState = {};
let PackagesState = {};

/*
 * A note on package tracking:
 * The PackagesState object contains detailed data on packages. This object is a combination of the file packages.json
 * and the data stored in AsyncStorage under the key packagesSelected.
 * packagesSelected is a simple mapping of packageName -> bool
 */
function selectedPackages() {
  let selections = {};
  for (let [packageTitle, packObj] of Object.entries(PackagesState)) {
    selections[packageTitle] = packObj.clicked &! packObj.disabled;
  }
  return selections
}

class DownloadTracker {
  constructor() {
    this.currentDownload = null;
    this.subscriptions = {};
  }
  addDownload(downloadState) {
    this.notify(true);
    if (this.downloadInProgress()) {
      throw "Another download is in Progress!"
    }
    this.currentDownload = downloadState;
    this.currentDownload.finally(() => this.removeDownload())
  }
  removeDownload() {
    this.currentDownload = false;
    this.notify(false)
  }
  downloadInProgress() {
    return (!!this.currentDownload);
  }
  cancelDownload() {
    if (!!this.currentDownload) {
      this.currentDownload.cancel().then(this.removeDownload());
    }
    else {
      throw "No download to cancel"
    }
  }
  attachProgressTracker(progressTracker, config) {
    if (this.downloadInProgress()) {
      this.currentDownload.progress(config, progressTracker);
    }
  }
  subscribe(listenerName, listenerFunc) {
    /*
     * add a function that will be updated when downloads begin and finish. Function should accept a boolean. A
     * name must be supplied as well. This will avoid a single method subscribing multiple times, as well as allowing
     * for unsubscribing.
     */
    this.subscriptions[listenerName] = listenerFunc;
  }
  unsubscribe(listenerName) {
    delete this.subscriptions[listenerName];
  }
  notify(value) {
    Object.values(this.subscriptions).map(x => x(value))
  }
}

const Tracker = new DownloadTracker();

class Package {
  constructor(jsonData, order=0) {
    this.name = jsonData['en'];
    this.jsonData = jsonData;
    this.children = [];
    this.disabled = false;  // a Package is disabled if its parent was clicked
    this.clicked = false;
    this.parent = this.getParent();
    this.order = order;
  }
  addChild = function (child) {
    this.children.push(child);
  };
  getParent = function () {
    if (this.name === 'COMPLETE LIBRARY') {
      return null;
    }
    else if (!!this.jsonData['parent']) {
      return 'COMPLETE LIBRARY'
    }
    else return this.jsonData['parent']
  };
  markAsClicked = async function (disabled=false) {
    /*
     * we want to correct for bad data. If both a parent and a child are marked as clicked, we need to make sure the
     * child is disabled. In the event that a child was marked before it's parent, the `disabled` parameter will trickle
     * down when the parent is marked. In case the parent was already marked, we'll will look up the parent in
     * PackagesState.
     *
     * We've separated the concerns of marking which packages were clicked and actually downloading packages. Keeping
     * this distinction is important both for usability (we can run UI logic between the click and when the download
     * starts) and for maintainability.
     */
    this.clicked = true;
    if (disabled) {
      this.disabled = disabled;
    }
    else {
      let parent = PackagesState[this.parent];
      this.disabled = !!parent.clicked;
    }
    this.children.forEach(child => PackagesState[child].markAsClicked(true));

    // at the end of the recursion we need to save the result to disk. The package actually clicked will have
    // disabled = false (disabled is marked as true when a parent was clicked).
    if (!disabled) {
      await AsyncStorage.setItem('packagesSelected', JSON.stringify(selectedPackages()));
    }
  };
  unclick = async function (activePackage=true) {
    /*
     * Set this package as desired = false. In addition to cleaning up this package, we will also use the opportunity to
     * delete any books that may be downloaded but not desired by the user but may reside outside the package.
     *
     * activePackage: set to true when this is the package clicked. Will be set to false when recursing over children
     */
    if (!!activePackage && !!this.disabled ) {
      throw "A disabled package cannot be active"
    }

    [this.clicked, this.disabled] = [false, false];
    this.children.forEach(p => p.unclick(activePackage=false));
    if (activePackage) {
      await AsyncStorage.setItem('packagesSelected', JSON.stringify(selectedPackages()));
      setDesiredBooks();

      // do we want to separate the concerns here? Less of an issue as there is not a network dependency
      await deleteBooks(calculateBooksToDelete(BooksState));
    }
  }
}

class Book {
  constructor(title, desired, localLastUpdated=null) {
    this.title = title;
    this.desired = desired;
    if (!!localLastUpdated)
      this.localLastUpdated = new Date(localLastUpdated);
    else
      this.localLastUpdated = null;
  }
}


function downloadFilePromise(fileUrl, filepath) {
  return RNFB.config({
    IOSBackgroundTask: true,
    indicator: true,
    path: filepath,
    overwrite: true
  }).fetch(encodeURIComponent(fileUrl))
}


async function populateDownloadState(pkgStateData) {
  // pkgStateData is the contents of packages.json
  [PackagesState, BooksState] = [{}, {}];
  pkgStateData.forEach((pkgData, index) => {
    PackagesState[pkgData['en']] = new Package(pkgData, index);
  });

  // children are not defined in package.json. Each package points to a parent and we can now use that to set children
  let parentPackage;
  for (let [packageTitle, packObj] of Object.entries(PackagesState)) {
    if (packageTitle === 'COMPLETE LIBRARY') {
      continue
    }
    else {
      parentPackage = packObj.parent;
      PackagesState[parentPackage].addChild(packageTitle);
    }
  }
  try {
    await repopulateBooksState();
  } catch (e) {
    console.log(e)
  }
  return Promise.resolve(PackagesState)
}

function loadJSONFile(JSONSourcePath) {
  return new Promise((resolve, reject) => {
    RNFB.fs.readFile(JSONSourcePath).then(result => {
      try {
        resolve(JSON.parse(result));
        return;
      } catch (e) {
        resolve({}); // if file can't be parsed, fall back to empty object
      }
      resolve(JSON.parse(result));
    }).catch(e => {
      reject(e);
    });
  })
}

function loadCoreFile(filename) {
  return new Promise((resolve, reject) => {
    RNFB.fs.exists(RNFB.fs.dirs.DocumentDir + "/library/" + filename)
      .then(exists => {
        if (Platform.OS === "ios" || exists) {
          const pkgPath = exists ? (`${RNFB.fs.dirs.DocumentDir}/library/${filename}`) :
            `${RNFB.fs.dirs.MainBundleDir}/sources/${filename}`;
      loadJSONFile(pkgPath).then(x => resolve(x)).catch(e => reject(e))
    }
    // bundled packages.json lives in a different place on android
    else RNFB.fs.readFile(RNFB.fs.asset(`sources/${filename}`)).then(x => resolve(JSON.parse(x)))
          .catch(e => reject(e))
    })
  });

}

function getFullBookList() {
  // load books as defined in last_updated.json. Does not download a new file
  return new Promise((resolve, reject) => {
    loadCoreFile('last_updated.json').then(x => {
      resolve(Object.keys(x.titles))
    }).catch(e => reject(e))
  })
}

function packageSetupProtocol() {
  return new Promise ((resolve, reject) => {
    Promise.all([
      loadCoreFile('packages.json').then(pkgStateData => populateDownloadState(pkgStateData)),
      AsyncStorage.getItem("packagesSelected")
    ]).then(appState => {
      const [packageData, packagesSelected] = appState;
      let falseSelections = [];
      for (let [packName, clickStatus] of Object.entries(packagesSelected)) {
        !!clickStatus ? packageData[packName].markAsClicked() : falseSelections.push(packName)
      }
      for (let packName of Object.keys(packagesSelected)) {
        if (!!packageData[packName].disabled) {
          falseSelections.push(packName);
        }
      }
      falseSelections.map(x => delete packagesSelected[x]);
      AsyncStorage.setItem('packagesSelected', JSON.stringify(packagesSelected)).then(resolve()).catch(error => {
        console.error(`AsyncStorage failed to save: ${error}`);
        reject(error);
      })
    })
  })
}


function setDesiredBooks() {
  if (PackagesState['COMPLETE LIBRARY'].clicked) {
    Object.keys(BooksState).forEach(b => BooksState[b].desired = true)
  }
  else {
    // mark all books as not desired as a starting point
    Object.values(BooksState).map(x => x.desired=false);

    Object.values(PackagesState).filter(x => {
      /*
       * All books in packages marked desired should be flagged as desired. COMPLETE LIBRARY is a special case and
       * was dealt with above. Disabled packages are redundant (these are packages that are wholly contained within
       * a larger package that was already selected).
       */
      return x.name !== 'COMPLETE LIBRARY' && x.clicked && !x.disabled
    }).map(packageList => {
      packageList.forEach(packageObj => {
        packageObj.jsonData['containedBooks'].forEach(book => {
          if (book in BooksState) {
            BooksState[book].desired = packageObj.clicked;
          }
          else {  // edge case, new books should not be added here
            BooksState[book] = new Book(book, packageObj.clicked, null);
          }
        })
      })
    })
  }

}

function setLocalBookTimestamps(bookTitleList) {
  return Promise.all(bookTitleList.map(bookTitle => {
    return new Promise((resolve, reject) => {
      const filepath = `${RNFB.fs.dirs.DocumentDir}/library/${bookTitle}.zip`;
      RNFB.fs.exists(filepath)
        .then(exists => {
          if (exists) {
            RNFB.fs.stat(filepath).then(timestamp => resolve(timestamp));
          }
          else resolve(null);
        })
    })
  })).then((timestampList) => timestampList.map((timestamp, i) => {
    const bookTitle = bookTitleList[i];
    if (bookTitle in BooksState) {
      BooksState[bookTitle].lastUpdated = new Date(timestamp);
    }
    else {
      BooksState[bookTitle] = new Book(bookTitle, false, timestamp);
    }
  }))
}

function getLocalBookList() {
  /*
   * This method is for getting the books that are stored on disk
   * Returns a Promise which resolves on a list of books
   */
  return new Promise((resolve, reject) => {
    RNFB.fs.ls(`${RNFB.fs.dirs.DocumentDir}/library`).then(fileList => {
      const books = [];
      const reg = /([^/]+).zip$/g;
      fileList.forEach(fileName => {
        if (fileName.endsWith(".zip")) {
          books.push(reg.exec(fileName)[1]);
        }
      });
      resolve(books)
    })
  })
}

async function repopulateBooksState() {
  BooksState = {};
  const allBooks = await getFullBookList();
  await setLocalBookTimestamps(allBooks);
  setDesiredBooks();
  let localBooks = await getLocalBookList();
  await setLocalBookTimestamps(localBooks);
  return BooksState
}

function deleteBooks(bookList) {
  const results = bookList.map(bookTitle => {
    return new Promise((resolve, reject) => {
      const filepath = `${RNFB.fs.dirs.DocumentDir}/library/${bookTitle}.zip`;
      RNFB.fs.unlink(filepath).then(resolve(bookTitle));
    });
  });
  return Promise.all(results).then(bookTitles => {
    bookTitles.forEach(bookTitle => {
      if (bookTitle in BooksState) {
        BooksState[bookTitle].localLastUpdated = null;
        BooksState.desired = false;
      }
    })
  })
}

async function unzipBundle() {
  const unzipLocation = `${RNFB.fs.dirs.DocumentDir}/library`;
  const dirExists = await RNFB.fs.isDir(unzipLocation);
  if (!dirExists) {
    try {
      await RNFB.fs.mkdir(unzipLocation);
    } catch (e) {
      console.log(`error creating library folder: ${e}`)
    }
  }
  await unzip(BUNDLE_LOCATION, `${RNFB.fs.dirs.DocumentDir}/library`);
  return null
}

function requestNewBundle(bookList) {
  return new Promise((resolve, reject) => {
    fetch(`${DOWNLOAD_SERVER}/makeBundle`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({books: bookList})
    }).then(x => x.json()).then(x => resolve(x.bundle)).catch(err => reject(err))
  })
}

async function downloadBundle(bundleName) {
  const downloadState = downloadFilePromise(`${HOST_BUNDLE_URL}/${encodeURIComponent(bundleName)}`);
  try {
    Tracker.addDownload(downloadState);
  } catch (e) {
    console.log(e)
  }
  const downloadResult = await downloadState;
  Tracker.removeDownload();
  const status = downloadResult.info().status;
  if (status >= 300 || status < 200) {
    throw "Bad download status"
  }
}

async function calculateBooksToDownload(booksState) {
  const remoteBookUpdates = await loadCoreFile('last_updated.json');
  let booksToDownload = [];
  for (const bookTitle in booksState) {
    if (booksState.hasOwnProperty(bookTitle)){
      const bookObj = booksState[bookTitle];
      if (bookObj.desired) {
        if (!(bookObj.localLastUpdated)) {
          booksToDownload.push(bookTitle);
        }
        else if (booksState[bookTitle].localLastUpdated < remoteBookUpdates[bookTitle]) {
          booksToDownload.push(bookTitle);
        }
      }
    }
  }
  return booksToDownload

}

function calculateBooksToDelete(booksState) {
  let booksToDelete = [];
  for (const bookTitle in booksState) {
    if (booksState.hasOwnProperty(bookTitle)) {
      const bookObj = booksState[bookTitle];
      if (!bookObj.desired && !!(bookObj.localLastUpdated)) {
        booksToDelete.push(bookTitle);
      }
    }
  }
  return booksToDelete;
}

async function _executeDownload(bundleName) {
  try {
    await downloadBundle(bundleName);
    await unzipBundle();
  } catch (e) {
    console.log(e)
  } finally {
    await RNFB.fs.unlink(BUNDLE_LOCATION);
  }
  // update our local book list
  await repopulateBooksState()
}

async function downloadPackage(packageName) {
  await _executeDownload(`${packageName}.zip`)
}

async function downloadUpdate(booksToDownload=null) {
  if (!!booksToDownload){
    booksToDownload = await calculateBooksToDownload(BooksState);
  }
  const bundleName = await requestNewBundle(booksToDownload);
  await _executeDownload(bundleName);

  // we're going to use the update as an opportunity to do some cleanup
  const booksToDelete = calculateBooksToDelete(BooksState);
  await deleteBooks(booksToDelete);
}


function wereBooksDownloaded() {
  return Object.values(PackagesState).some(x => !!x.clicked)
}

function booksNotDownloaded(bookList) {
  /*
   * check a list of book titles against the BooksState to see which books in the list were not downloaded.
   * !IMPORTANT! Book data should only be derived from the files saved on disk. This method should be used only for
   * telegraphing information to the user, state should not be changed based on the results of this method.
   */
  return bookList.filter(x => !(x in BooksState) || !(BooksState[x].localLastUpdated))
}

async function deleteLibrary() {
  await PackagesState['COMPLETE LIBRARY'].unclick()
}

async function downloadCoreFile(filename) {
  const tmpFolder = `${RNFB.fs.DocumentDir}/tmp`;
  const exists = await RNFB.fs.exists(tmpFolder);
  if (!exists) {
    await RNFB.fs.mkdir()
  }
  const [fileUrl, tempPath] = [`${HOST_PATH}/${filename}`, `${RNFB.fs.DocumentDir}/tmp/${filename}`];
  const downloadResp = await downloadFilePromise(fileUrl, tempPath);
  const status = downloadResp.info().status;
  if (status >= 300 || status < 200) {
    await RNFB.fs.unlink(tempPath);
    throw new Error(`bad download status; got : ${status}`);
  }
  await RNFB.mv(tempPath, `${RNFB.fs.DocumentDir}/library/${filename}`);
}

async function checkUpdatesFromServer() {
  let timestamp = new Date().toJSON();
  await AsyncStorage.setItem('lastUpdateCheck', timestamp);
  await AsyncStorage.setItem('lastUpdateSchema', SCHEMA_VERSION);
  try {
    await downloadCoreFile('last_updated.json');
  } catch (e) {
    console.log(e)
  }
  await repopulateBooksState();
  const allBooksToDownload = await calculateBooksToDownload(BooksState);
  return [allBooksToDownload, booksNotDownloaded(allBooksToDownload)]
}

function autoUpdateCheck() {
  /*
   * The mobile downloads are updated every 7 days. We want to prompt the user to update if they haven't checked the
   * server
   */

}

function promptLibraryUpdate(totalDownloads, newBooks) {
  /*
   * This is one of the few places we have UI components in this module. This is a point of control where the user
   * can interact directly with the update logic. This interaction is not unique to any one page on the app. Conversely,
   * any communication or UI logic that is unique to a particular app page or component should be written as part of
   * that component.
   */
  const updates = totalDownloads.length - newBooks.length;
  const updateString = `${newBooks.length} ${strings.newBooksAvailable}\n${updates} ${strings.updatesAvailableMessage}`;

  const onCancel = function () {
    Alert.alert(
      strings.updateLater,
      strings.howToUpdateLibraryMessage,
      [
        {text: strings.ok}
      ])
  };
  Alert.alert(
    strings.updateLibrary,
    updateString,
    [
      {text: strings.download, onPress: () => downloadUpdate(totalDownloads)},
      {text: strings.notNow, onPress: onCancel}
    ]
  )

}

async function schemaCheckAndPurge() {
  // checks if there was a schema change. If so, delete the library
  const lastUpdateSchema = AsyncStorage.getItem("lastUpdateSchema");
  if (lastUpdateSchema !== SCHEMA_VERSION) {
    // We want to delete the library but keep the package selections
    const bookList = await getFullBookList();
    await deleteBooks(bookList);
    setDesiredBooks()
  }
}


export {
  downloadBundle,
  packageSetupProtocol,
  PackagesState,
  Tracker,
  wereBooksDownloaded,
  checkUpdatesFromServer,
  promptLibraryUpdate,
  downloadPackage,
  deleteLibrary,
  loadJSONFile,
  getLocalBookList,
  getFullBookList
};
