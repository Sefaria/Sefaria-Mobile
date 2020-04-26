'use strict';

import RNFB from 'rn-fetch-blob';
import { unzip } from 'react-native-zip-archive'; //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
import strings from './LocalizedStrings'
import {Alert, Platform} from 'react-native';
import AsyncStorage from "@react-native-community/async-storage";

const SCHEMA_VERSION = "6";
const DOWNLOAD_SERVER = "https://readonly.sefaria.org";
const HOST_PATH = `${DOWNLOAD_SERVER}/static/ios-export/${SCHEMA_VERSION}/bundles`;
const BUNDLE_LOCATION = RNFB.fs.dirs.DocumentDir + "/tmp/bundle.zip";


let BooksState = {};
let PackagesState = {};

class DownloadTracker {
  constructor() {
    this.currentDownload = null;
  }
  addDownload(downloadState) {
    if (this.downloadInProgress()) {
      throw "Another download is in Progress!"
    }
    this.currentDownload = downloadState;
  }
  removeDownload() {
    this.currentDownload = false;
  }
  downloadInProgress() {
    return (!!this.currentDownload);
  }
  cancelDownload() {
    if (!!this.currentDownload) {
      this.currentDownload.cancel();
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
      await AsyncStorage.setItem('packagesSelected', JSON.stringify(PackagesState))
      await downloadPackage(this.name)
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
      await AsyncStorage.setItem('packagesSelected', JSON.stringify(PackagesState));
      setDesiredBooks();
      await deleteBooks(calculateBooksToDelete(BooksState));
    }
  }
}

class Book {
  constructor(title, desired, localLastUpdated=0) {
    this.title = title;
    this.desired = desired;
    this.localLastUpdated = new Date(localLastUpdated);
  }
}


function populatePackageState(pkgStateData) {
  PackagesState = {};
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
  return Promise.resolve(PackagesState)
}


function loadPlatformFile(filename) {
    RNFB.fs.exists(RNFB.fs.dirs.DocumentDir + "/library/" + filename)
      .then(exists => {
        if (Platform.OS === "ios" || exists) {
          const pkgPath = exists ? (`${RNFB.fs.dirs.DocumentDir}/library/${filename}`) :
            `${RNFB.fs.dirs.MainBundleDir}/sources/${filename}`;
          return Sefaria._loadJSON(pkgPath)
        }
        // bundled packages.json lives in a different place on android
        else return RNFB.fs.readFile(RNFB.fs.asset(`sources/${filename}`))
      })
  }



function setupPackages() {

  return new Promise ((resolve, reject) => {
    Promise.all([
      loadPlatformFile('packages.json').then(pkgStateData => populatePackageState),
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
        reject();
      })
    })
  })
}


function setDesiredBooks() {
  if (PackagesState['COMPLETE LIBRARY'].clicked) {
    Object.keys(BooksState).forEach(b => BooksState[b].desired = true)
  }
  else {
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
        BooksState[bookTitle].checkSum = null;
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

function makeNewBundle(bookList) {
  return new Promise((resolve, reject) => {
    fetch(`${DOWNLOAD_SERVER}/makeBundle`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({books: bookList})
    }).then(x => x.json()).then(x => resolve(x.bundle)).catch(err => reject(err))
  })
}

async function downloadBundle(bundleName) {
  const downloadState = RNFB.config({
    IOSBackgroundTask: true,
    indicator: true,
    path: BUNDLE_LOCATION,
    overwrite: true
  }).fetch(`${HOST_PATH}/${bundleName}`);
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
  const remoteBookUpdates = await loadPlatformFile('last_updated.json');
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

async function downloadUpdate() {
  const booksToDownload = await calculateBooksToDownload(BooksState);
  const bundleName = await makeNewBundle(booksToDownload);
  await _executeDownload(bundleName);

  // we're going to use the update as an opportunity to do some cleanup
  const booksToDelete = calculateBooksToDelete(BooksState);
  await deleteBooks(booksToDelete);
}


function booksWereDownloaded() {
  return Object.values(PackagesState).some(x => !!x.clicked)
}

async function deleteLibrary() {
  const localBooks = await getLocalBookList()
}

async function checkUpdates() {
  // todo: what did I want to do here?!
}

function promptLibraryUpdate(totalDownloads, newBooks) {
  /*
   * This is one of the few places we have UI components in this module. This is a point of control where the user
   * can interact directly with the update logic. This interaction is not unique to any one page on the app. Conversely,
   * any communication or UI logic that is unique to a particular app page or component should be written as part of
   * that component.
   */
  const updates = totalDownloads - newBooks;
  const updateString = `${newBooks} ${strings.newBooksAvailable}\n${updates} ${strings.updatesAvailableMessage}`;

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
      {text: strings.download, onPress: downloadUpdate},
      {text: strings.notNow, onPress: onCancel}
    ]
  )

}


export {downloadBundle, setupPackages, PackagesState, Tracker, booksWereDownloaded, checkUpdates};
