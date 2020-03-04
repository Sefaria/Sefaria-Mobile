'use strict';

import RNFB from 'rn-fetch-blob';
import { unzip } from 'react-native-zip-archive'; //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)

const SCHEMA_VERSION = "6";
const HOST_PATH = "https://readonly.sefaria.org/static/ios-export/" + SCHEMA_VERSION + "/";
const BUNDLE_LOCATION = RNFB.fs.dirs.DocumentDir + "/tmp/bundle.zip";


let BooksState = {};
let PackagesState = {};

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

async function downloadBooks(bookList) {
  const tempFile = RNFB.fs.dirs.DocumentDir + "/tmp/bundle.zip";
  try {
    const downloadResult = await RNFB.config({
      IOSBackgroundTask: true,
      indicator: true,
      path: tempFile,
    }).fetch(HOST_PATH + "/api/bundle", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({'bookList': bookList})
      }
    );
    const status = downloadResult.info().status;
    if (status >= 300 || status < 200) {
      await RNFB.fs.unlink(tempFile);
      return;
    }
    console.log('foo');
  } catch(err) {
    handleDownloadError(err);
  }
}

function downloadBundle(bookList) {
  return new Promise((resolve, reject) => {
    RNFB.config({
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
    }).then(downloadResult => {
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
  console.log(error);
}

export {downloadBundle};
