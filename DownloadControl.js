'use strict';

import RNFB from 'rn-fetch-blob';
import { unzip } from 'react-native-zip-archive'; //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
import {Alert, Platform} from 'react-native';
import AsyncStorage from "@react-native-community/async-storage";

const SCHEMA_VERSION = "6";
const HOST_PATH = "https://readonly.sefaria.org/static/ios-export/" + SCHEMA_VERSION + "/";
const BUNDLE_LOCATION = RNFB.fs.dirs.DocumentDir + "/tmp/bundle.zip";


let BooksState = {};
let PackagesState = {};

class DownloadTracker {
  constructor() {
    this.currentDownload = null;
  }
  addDownload(downloadState) {
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
}

const Tracker = new DownloadTracker();

class Package {
  constructor(jsonData) {
    this.name = jsonData['en'];
    this.jsonData = jsonData;
    this.children = [];
    this.disabled = false;  // a Package is disabled if its parent was clicked
    this.clicked = false;
    this.parent = this.getParent();
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
  markAsClicked = function (disabled=false) {
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
  }
}

class Book {
  constructor(title, desired, checkSum) {
    this.title = title;
    this.desired = desired;
    this.checkSum = checkSum;  // todo: replace with a date
  }
}


function populatePackageState(pkgStateData) {
  PackagesState = {};
  pkgStateData.forEach(pkgData => {
    PackagesState[pkgData['en']] = new Package(pkgData);
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


function setupPackages() {
  function platform() {
    RNFB.fs.exists(RNFB.fs.dirs.DocumentDir + "/library/packages.json")
      .then(exists => {
        if (Platform.OS === "ios" || exists) {
          const pkgPath = exists ? (`${RNFB.fs.dirs.DocumentDir}/library/packages.json`) :
            `${RNFB.fs.dirs.MainBundleDir}/sources/packages.json`;
          return Sefaria._loadJSON(pkgPath)
        }
        // bundled packages.json lives in a different place on android
        else return RNFB.fs.readFile(RNFB.fs.asset('sources/packages.json'))
      })
  }
  return new Promise ((resolve, reject) => {
    Promise.all([
      platform().then(pkgStateData => populatePackageState),
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


function setDesiredBooks(packageList) {
  packageList.forEach(packageObj => {
    packageObj.jsonData.containedBooks.forEach(book => {
      if (book in BooksState) {
        BooksState[book].desired = packageObj.clicked;
      }
      else {
        BooksState[book] = new Book(book, packageObj.clicked, null);
      }
    })
  })
}

function setLocalBooksChecksums(bookTitleList) {  // todo: we are not using checksums
  return Promise.all(bookTitleList.map(bookTitle => {
    return new Promise((resolve, reject) => {
      const filepath = `${RNFB.fs.dirs.DocumentDir}/library/${bookTitle}.zip`;
      RNFB.fs.exists(filepath)
        .then(exists => {
          if (exists) {
            RNFB.fs.hash(filepath, 'sha1').then(hash => resolve(hash));
          }
          else resolve(null);
        })
    })
  })).then((hashList) => hashList.map((hash, i) => {
    const bookTitle = bookTitleList[i];
    if (bookTitle in BooksState) {
      BooksState[bookTitle].checkSum = hash;
    }
    else {
      BooksState[bookTitle] = new Book(bookTitle, false, hash);
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
  let packages = Object.values(PackagesState);
  setDesiredBooks(packages);
  let localBooks = await getLocalBookList();
  await setLocalBooksChecksums(localBooks);
  return BooksState
}

async function getRemoteBookChecksums(bookTitleList) {

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

async function downloadAndUnzipBooks(bookList) {
  if (Tracker.downloadInProgress()) {
    throw "Another Download is in Progress";
  }

  try {
    await downloadBundle(bookList);
  }
  catch (error) {
    return await handleDownloadError(error);
  }
  await setLocalBooksChecksums(bookList);
  await RNFB.fs.unlink(BUNDLE_LOCATION);
  return null
}

function downloadBundle(bookList, handler) {
  return new Promise((resolve, reject) => {
    const downloadState = RNFB.config({
      IOSBackgroundTask: true,
      indicator: true,
      path: BUNDLE_LOCATION,
      overwrite: true,
    }).fetch(HOST_PATH + "/api/bundle", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({'bookList': bookList})
    });
    Tracker.addDownload(downloadState);
    downloadState.progress({count: 20, interval: 250}, handler);
    downloadState.then(downloadResult => {
      Tracker.removeDownload();
      const status = downloadResult.info().status;
      if (status >= 300 || status < 200) {
        reject("Bad status");
      }
     resolve(downloadResult);
    }).catch(err => reject(err));
  });
}

function calculateBooksToDownload(booksState, remoteBookCheckSums) { // todo: use timestamps and not checksums
  let booksToDownload = [];
  for (const bookTitle in booksState) {
    if (booksState.hasOwnProperty(bookTitle)){
      const bookObj = booksState[bookTitle];
      if (bookObj.desired) {
        if (!(bookObj.checkSum)) {
          booksToDownload.push(bookTitle);
        }
        else if (booksState[bookTitle].checkSum !== remoteBookCheckSums[bookTitle]) {
          booksToDownload.push(bookTitle);
        }
      }
    }
  }
  return booksToDownload

}

function calculateBooksToDelete(booksState) { // todo use timestamps and not checksums
  let booksToDelete = [];
  for (const bookTitle in booksState) {
    if (booksState.hasOwnProperty(bookTitle)) {
      const bookObj = booksState[bookTitle];
      if (!bookObj.desired && !!(bookObj.checkSum)) {
        booksToDelete.push(bookTitle);
      }
    }
  }
  return booksToDelete;
}

function handleDownloadError(error) {
  return new Promise((resolve, reject) => {
    RNFB.fs.unlink(BUNDLE_LOCATION).then(reject(error))
  })
}

export {downloadBundle};
