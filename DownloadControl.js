'use strict';

import RNFB from 'rn-fetch-blob';
import { unzip } from 'react-native-zip-archive'; //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)

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
  constructor(name, clicked, containedBooks, children) {
    this.name = name;
    this.clicked = clicked;
    this.containedBooks = containedBooks;
    this.children = children;
  }
}

class Book {
  constructor(title, desired, checkSum) {
    this.title = title;
    this.desired = desired;
    this.checkSum = checkSum;
  }
}

function setDesiredBooks(packageList) {
  packageList.forEach(packageObj => {
    packageObj.containedBooks.forEach(book => {
      if (book in BooksState) {
        BooksState[book].desired = packageObj.clicked;
      }
      else {
        BooksState[book] = new Book(book, packageObj.clicked, null);
      }
    })
  })
}

function setLocalBooksChecksums(bookTitleList) {
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

function calculateBooksToDownload(booksState, remoteBookCheckSums) {
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

function calculateBooksToDelete(booksState) {
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
