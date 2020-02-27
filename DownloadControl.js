'use strict';

import RNFB from 'rn-fetch-blob';
import { unzip } from 'react-native-zip-archive'; //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)

const SCHEMA_VERSION = "6";
const HOST_PATH = "https://readonly.sefaria.org/static/ios-export/" + SCHEMA_VERSION + "/";
const BUNDLE_LOCATION = RNFB.fs.dirs.DocumentDir + "/tmp/bundle.zip";


let BooksState = {};
let PackagesState = {};

class Package {
  constructor() {

  }
}

class Book {
  constructor(title, desired, CRC) {
    this.title = title;
    this.desired = desired;
    this.CRC = CRC;
  }
}

function getLocalBooksCRC(bookTitleList) {
  
}

async function getRemote(bookTitleList) {

}

async function deleteBooks(bookList) {
  
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

function calculateBooksToDownload(booksState, localBookCRCs, remoteBookCRCs) {

}

function calculateBooksToDelete(booksState, localBookCRCs) {

}

function handleDownloadError(error) {
  console.log(error);
}

export {downloadBundle};
