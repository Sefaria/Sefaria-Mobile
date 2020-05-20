'use strict';

import RNFB from 'rn-fetch-blob';
import { unzip } from 'react-native-zip-archive'; //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
import strings from './LocalizedStrings'
import {Alert, Platform} from 'react-native';
import AsyncStorage from "@react-native-community/async-storage";
import Sefaria from "./sefaria";
const SCHEMA_VERSION = "6";
// const DOWNLOAD_SERVER = "https://readonly.sefaria.org";
const DOWNLOAD_SERVER = "http://35.237.217.25";
const HOST_PATH = `${DOWNLOAD_SERVER}/static/ios-export/${SCHEMA_VERSION}`;
const HOST_BUNDLE_URL = `${HOST_PATH}/bundles`;
const BUNDLE_LOCATION = RNFB.fs.dirs.DocumentDir + "/tmp/bundle.zip";
const [FILE_DIRECTORY, TMP_DIRECTORY] = [`${RNFB.fs.dirs.DocumentDir}/library`, `${RNFB.fs.dirs.DocumentDir}/tmp`];  //todo: make sure these are used


let BooksState = {};
let PackagesState = {};

/*
 * A note on package tracking:
 * The PackagesState object contains detailed data on packages. This object is a combination of the file packages.json
 * and the data stored in AsyncStorage under the key packagesSelected.
 * packagesSelected is a simple mapping of packageName -> bool
 */
function selectedPackages() {
  // Test with Jest
  let selections = {};
  for (let [packageTitle, packObj] of Object.entries(PackagesState)) {
    if (packObj.wasSelectedByUser())
      selections[packageTitle] = true;
  }
  return selections
}

class DownloadTracker {
  // Test with Jest
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
    this.currentDownload.finally(this.removeDownload())
  }
  removeDownload() {
    this.currentDownload = null;
    this.notify(false)
  }
  downloadInProgress() {
    return (!!this.currentDownload);
  }
  cancelDownload() {
    if (!this.downloadInProgress()) {
      this.currentDownload.cancel().then(this.removeDownload);
    }
    else {
      throw "No download to cancel"
    }
  }
  attachProgressTracker(progressTracker, config) {
    if (this.downloadInProgress()) {
      this.currentDownload.progress(config, progressTracker);
    } else
      throw new Error("No download to track");
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
  // Test with Jest
  constructor(jsonData, order=0) {
    this.name = jsonData['en'];
    this.jsonData = jsonData;
    this.children = [];
    this.supersededByParent = false;
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
    else if (!this.jsonData['parent']) {
      return 'COMPLETE LIBRARY'
    }
    else return this.jsonData['parent']
  };
  _propagateClick(clicked) {
    this.children.forEach(child => {
      child = PackagesState[child];
      [child.clicked, child.supersededByParent] = [clicked, clicked];
      child._propagateClick(clicked);
    })
  }
  markAsClicked = async function (writeToDisk=true) {
    /*
     * we want to correct for bad data. If both a parent and a child are marked as clicked, we need to make sure the
     * child is disabled. In the event that a child was marked before it's parent, the `disabled` parameter will trickle
     * down when the parent is marked. In case the parent was already marked, we'll look up the parent in
     * PackagesState.
     *
     * We've separated the concerns of marking which packages were clicked and actually downloading packages. Keeping
     * this distinction is important both for usability (we can run UI logic between the click and when the download
     * starts) and for maintainability.
     */
    this.clicked = true;
    const parent = PackagesState[this.parent];
    const supersededByParent = parent && parent.clicked;
    this.supersededByParent = Boolean(supersededByParent);

    this._propagateClick(true);
    if (writeToDisk)
      await AsyncStorage.setItem('packagesSelected', JSON.stringify(selectedPackages()));

  };
  unclick = async function () {
    /*
     * Set this package as desired = false. In addition to cleaning up this package, we will also use the opportunity to
     * delete any books that may be downloaded but not desired by the user but may reside outside the package.
     *
     * activePackage: set to true when this is the package clicked. Will be set to false when recursing over children
     */
    if (this.supersededByParent) {
      throw "A disabled package cannot be unclicked"
    }

    this.clicked = false;
    this._propagateClick(false);
    await AsyncStorage.setItem('packagesSelected', JSON.stringify(selectedPackages()));


    // do we want to separate the concerns here? Less of an issue as there is not a network dependency
    setDesiredBooks();
    await deleteBooks(calculateBooksToDelete(BooksState));
  };
  wasSelectedByUser = function () {
    return this.clicked && !this.supersededByParent
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
  // Test with Appium
  return new Promise((resolve, reject) => {
    RNFB.config({
      IOSBackgroundTask: true,
      indicator: true,
      path: filepath,
      overwrite: true
    }).fetch('GET', fileUrl).then(x => resolve(x)).catch(e => reject(e))
  });
}


function deriveDownloadState(pkgStateData) {
  // Test with Jest
  // pkgStateData is the contents of packages.json
  const packageResult = {};
  pkgStateData.forEach((pkgData, index) => {
    packageResult[pkgData['en']] = new Package(pkgData, index);
  });

  // children are not defined in package.json. Each package points to a parent and we can now use that to set children
  let parentPackage;
  for (let [packageTitle, packObj] of Object.entries(packageResult)) {
    if (packageTitle === 'COMPLETE LIBRARY') {}
    else {
      parentPackage = packObj.parent;
      packageResult[parentPackage].addChild(packageTitle);
    }
  }

  return packageResult
}

function loadJSONFile(JSONSourcePath) {
  // Test with Appium
  return new Promise((resolve, reject) => {
    RNFB.fs.readFile(JSONSourcePath).then(result => {
      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
      } catch (e) {
        parsedResult = {}; // if file can't be parsed, fall back to empty object
      }
      resolve(parsedResult);
    }).catch(e => {
      reject(e);
    });
  })
}

async function loadCoreFile(filename) {
  // Test explicitly with Appium. Platform dependencies are not modeled well with Jest
  const exists = await RNFB.fs.exists(`${FILE_DIRECTORY}/${filename}`);

  if (exists || Platform.OS === "ios") {
    const pkgPath = exists ? `${FILE_DIRECTORY}/${filename}` : `${RNFB.fs.dirs.MainBundleDir}/sources/${filename}`;
    return await loadJSONFile(pkgPath);
  }
  else {
    const j = await RNFB.fs.readFile(RNFB.fs.asset(`sources/${filename}`));
    return JSON.parse(j);
  }
}

async function lastUpdated() {
  const lastUpdatedSource = `${FILE_DIRECTORY}/last_updated.json`;
  let exists = await RNFB.fs.exists(lastUpdatedSource);
  if (!exists)
    {
      return null;
    }
  return await loadJSONFile(lastUpdatedSource);
    /*
     * In the event the user never downloaded last_updated.json and the download failed we're going to throw out some
     * placeholder values. There might be a better way of dealing with this issue.
     */
  // return {  // todo: should we return with this object?
  //   schema_version: SCHEMA_VERSION,
  //   titles: []
  // };
}

function getFullBookList() { // todo: look at using Sefaria instance (Sefaria.booksDict). Use Sefaria.cacheIndexFromToc to initialize
  // Test with Jest
  return Sefaria.booksDict.map(x => Object.keys(x)[0]);
}

async function packageSetupProtocol() {

  const [packageData, packagesSelected] = await Promise.all([
    loadCoreFile('packages.json').then(pkgStateData => deriveDownloadState(pkgStateData)),
    AsyncStorage.getItem('packagesSelected').then(x => !!x ? JSON.parse(x) : {})
  ]);
  PackagesState = packageData;

  let falseSelections = [];
  for (let packName of Object.keys(packagesSelected)) {
    packageData[packName].markAsClicked(false)  // todo: markAsClicke is an async function
  }

  for (let packName of Object.keys(packagesSelected)) {
    if (!!packageData[packName].supersededByParent) {
      falseSelections.push(packName)
    }
  }
  if (falseSelections.length) {
    falseSelections.map(x => delete packagesSelected[x]);
    try {
      // this is here for cleaning up falseSelections on disk
      await AsyncStorage.setItem('packagesSelected', JSON.stringify(packagesSelected))
    } catch (e) {
      throw new Error(`AsyncStorage failed to save: ${error}`);
    }
  }
  await repopulateBooksState()
}

function setDesiredBooks() {
  // Test with Jest
  if (PackagesState['COMPLETE LIBRARY'].clicked) {
    Object.keys(BooksState).forEach(b => BooksState[b].desired = true)
  }
  else {
    // mark all books as not desired as a starting point
    Object.values(BooksState).map(x => x.desired=false);

    const selectedPackages = Object.values(PackagesState).filter(x => {
      /*
       * All books in packages marked desired should be flagged as desired. COMPLETE LIBRARY is a special case and
       * was dealt with above. Disabled packages are redundant (these are packages that are wholly contained within
       * a larger package that was already selected).
       */
      return x.name !== 'COMPLETE LIBRARY' && x.wasSelectedByUser()
    });
    selectedPackages.forEach(packageObj => {
      packageObj.jsonData['indexes'].forEach(book => {
        if (book in BooksState) {
          BooksState[book].desired = true;
        }
        else {  // edge case, new books should not be added here todo: add to crashlytics (look at ReaderApp 529)
          BooksState[book] = new Book(book, packageObj.clicked, null);
        }
      })
    })
  }

}

async function setLocalBookTimestamps(bookTitleList) {
  let fileData = await RNFB.fs.lstat(FILE_DIRECTORY);
  fileData = fileData.filter(x => x['filename'].endsWith('.zip'));
  const stamps = {};
  fileData.forEach(f => {
    const bookName = f['filename'].slice(0, -4);
    stamps[bookName] = new Date(f['lastModified'])
  });

  bookTitleList.map(title => {
    const timestamp = (title in stamps) ? new Date(stamps[title]) : null;
    if (title in BooksState)
      BooksState[title].localLastUpdated = timestamp;
    else
      BooksState[title] = new Book(title, false, timestamp);
  })
}

function getLocalBookList() {
  // Test with Appium?
  /*
   * This method is for getting the books that are stored on disk
   * Returns a Promise which resolves on a list of books
   */
  return new Promise((resolve, reject) => {
    RNFB.fs.ls(`${RNFB.fs.dirs.DocumentDir}/library`).then(fileList => {
      const books = [];
      const reg = /([^/]+).zip$/;
      fileList.forEach(fileName => { // todo: filter and map. Would be easier with async
        if (fileName.endsWith(".zip")) {
          books.push(reg.exec(fileName)[1]);
        }
      });
      resolve(books)
    }).catch(err=>reject(err))
  })
}

async function repopulateBooksState() {
  BooksState = {};
  const allBooks = getFullBookList();
  await setLocalBookTimestamps(allBooks);
  setDesiredBooks();
  return BooksState
}

function deleteBooks(bookList) {
  // Test with Appium
  const results = bookList.map(bookTitle => {
    return new Promise((resolve, reject) => {
      const filepath = `${RNFB.fs.dirs.DocumentDir}/library/${bookTitle}.zip`; // todo: make library location (and tmp) variable
      RNFB.fs.unlink(filepath).then(resolve(bookTitle)).catch(err => reject(err));
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
  // Test with Appium
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
}

function requestNewBundle(bookList) {
  // Test with Appium
  return new Promise((resolve, reject) => {
    fetch(`${DOWNLOAD_SERVER}/makeBundle`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({books: bookList})
    }).then(x => x.json()).then(x => resolve(x.bundle)).catch(err => reject(err))
  })
}

async function downloadBundle(bundleName) {
  // Test with Appium
  const downloadState = downloadFilePromise(`${HOST_BUNDLE_URL}/${encodeURIComponent(bundleName)}`);
  try {
    Tracker.addDownload(downloadState);
  } catch (e) {
    console.log(e)
  }
  // todo
  const downloadResult = await downloadState;
  Tracker.removeDownload();
  const status = downloadResult.info().status;
  if (status >= 300 || status < 200) {
    throw "Bad download status"
  }
  return downloadResult
}

async function calculateBooksToDownload(booksState) {
  // Test with Jest
  const remoteBookUpdates = await lastUpdated();
  if (remoteBookUpdates === null)
    {
      console.log('no last_updated.json');
      return [];
    }
  let booksToDownload = [];
  for (const bookTitle in booksState) {  // todo: cleaner to user Object.entries() and the filter() and map()
    if (booksState.hasOwnProperty(bookTitle)){
      const bookObj = booksState[bookTitle];
      if (bookObj.desired) {
        if (!bookObj.localLastUpdated) {
          booksToDownload.push(bookTitle);
        } else {
          const [localUpdate, remoteUpdate] = [booksState[bookTitle].localLastUpdated, new Date(remoteBookUpdates.titles[bookTitle])];
          if (localUpdate < remoteUpdate) {
            booksToDownload.push(bookTitle)
          }
        }
      }
    }
  }
  return booksToDownload
}




function calculateBooksToDelete(booksState) {
  // Test with Jest
  let booksToDelete = [];
  for (const bookTitle in booksState) {  // todo: Object.entries with filter & map
    if (booksState.hasOwnProperty(bookTitle)) {
      const bookObj = booksState[bookTitle];
      if (!bookObj.desired && !!(bookObj.localLastUpdated)) {  // a book is on disk if localLastUpdated is set
        booksToDelete.push(bookTitle);
      }
    }
  }
  return booksToDelete;
}

async function _executeDownload(bundleName) {
  // Test with Appium
  // todo: make sure network is checked
  // todo: handle download interruption differently than download failure
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

async function downloadUpdate(booksToDownload=null) {  // todo: get rid of null
  // Test with Appium
  if (!!booksToDownload){  // todo: review. Isn't this redundant. should it be !bookToDownload
    booksToDownload = await calculateBooksToDownload(BooksState);
  }
  const bundleName = await requestNewBundle(booksToDownload);
  await _executeDownload(bundleName);

  // we're going to use the update as an opportunity to do some cleanup
  const booksToDelete = calculateBooksToDelete(BooksState);
  await deleteBooks(booksToDelete);
}


function wereBooksDownloaded() {
  // Test with Jest
  return Object.values(PackagesState).some(x => !!x.clicked)
}

function booksNotDownloaded(bookList) {
  // Test with Jest
  /*
   * check a list of book titles against the BooksState to see which books in the list were not downloaded.
   * !IMPORTANT! Book data should only be derived from the files saved on disk. This method should be used only for
   * telegraphing information to the user, state should not be changed based on the results of this method.
   */
  return bookList.filter(x => !(x in BooksState) || !(BooksState[x].localLastUpdated))
}

async function deleteLibrary() {
  // Test with Appium
  await PackagesState['COMPLETE LIBRARY'].unclick()
}

async function addDir(path) {
  const exists = await RNFB.fs.exists(path);
  if (!exists) {
    try {
      await RNFB.fs.mkdir(path)
    } catch(e) {
      console.log(`Could not create directory at ${path}; ${e}`)
    }
  }
}

async function downloadCoreFile(filename) {
  // Test with Appium
  console.log(`downloading ${filename}`);
  const [appDir, tempDir] = [`${RNFB.fs.dirs.DocumentDir}/library`, `${RNFB.fs.dirs.DocumentDir}/tmp`];
  await Promise.all([
    addDir(tempDir),
    addDir(appDir),
  ]);

  const [fileUrl, tempPath] = [`${HOST_PATH}/${encodeURIComponent(filename)}`, `${tempDir}/${filename}`];
  let downloadResp = null;
  try{
    downloadResp = await downloadFilePromise(fileUrl, tempPath);
  } catch (e) {
    console.log(e);
    return
  }
  const status = !!downloadResp ? downloadResp.info().status : 'total failure';
  if ((status >= 300 || status < 200) || (status === 'total failure')) {
    await RNFB.fs.unlink(tempPath);
    throw new Error(`bad download status; got : ${status}`);
  }
  else {
    console.log(`successfully downloaded ${filename} to ${tempPath} with status ${status}`);
  }
  try {
    await RNFB.fs.mv(tempPath, `${RNFB.fs.dirs.DocumentDir}/library/${filename}`);
  } catch(e) {
    console.log(`failed to move file at ${tempPath} to app storage: ${e}`);
    await RNFB.fs.unlink(tempPath);
  }
}

async function checkUpdatesFromServer() {
  // Test with Appium. Also worth timing this method to ensure it is responsive
  await schemaCheckAndPurge();
  let timestamp = new Date().toJSON();
  await AsyncStorage.setItem('lastUpdateCheck', timestamp);
  await AsyncStorage.setItem('lastUpdateSchema', SCHEMA_VERSION);
  try {
    await loadJSONFile(`${RNFB.fs.dirs.DocumentDir}/library/last_updated.json`);  // todo: download a new file
  } catch (e) {
    console.log(e)
  }

  await Promise.all([
    downloadCoreFile('toc.json').then(Sefaria._loadTOC),
    downloadCoreFile('search_toc.json').then(Sefaria._loadSearchTOC),
    downloadCoreFile('hebrew_categories.json').then(Sefaria._loadHebrewCategories),
    downloadCoreFile('people.json').then(Sefaria._loadPeople),
    downloadCoreFile('packages.json').then(packageSetupProtocol),
    downloadCoreFile('calendar.json').then(Sefaria._loadCalendar)
  ]);
  await repopulateBooksState();
  const allBooksToDownload = await calculateBooksToDownload(BooksState);
  return [allBooksToDownload, booksNotDownloaded(allBooksToDownload)]
}

function autoUpdateCheck() {
  /*
   * The mobile downloads are updated every 7 days. We want to prompt the user to update if they haven't checked the
   * server
   */
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem('lastUpdateCheck').then(lastUpdateCheck => {
      const cutoff = new Date(lastUpdateCheck);
      cutoff.setDate(cutoff.getDate() + 7);
      const now = new Date();
      resolve(now > cutoff)
    }).catch(e => reject(e))
  })

}

function promptLibraryUpdate(totalDownloads, newBooks) {
  // Test with Jest
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
  // Test with Jest
  // checks if there was a schema change. If so, delete the library
  const lastUpdateSchema = AsyncStorage.getItem("lastUpdateSchema");
  if (lastUpdateSchema !== SCHEMA_VERSION) {
    // We want to delete the library but keep the package selections
    const bookList = getFullBookList();
    await deleteBooks(bookList);
    setDesiredBooks()
  }
}

export {
  downloadBundle,
  packageSetupProtocol,
  wereBooksDownloaded,
  checkUpdatesFromServer,
  promptLibraryUpdate,
  downloadPackage,
  deleteLibrary,
  loadJSONFile,
  getLocalBookList,
  getFullBookList,
  autoUpdateCheck,
  downloadUpdate,
  repopulateBooksState,
  PackagesState,
  BooksState,
  Package,
  Tracker,
  FILE_DIRECTORY,
  calculateBooksToDownload,
  calculateBooksToDelete
};
