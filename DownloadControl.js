'use strict';

import * as FileSystem from 'expo-file-system';
import {unzip} from 'react-native-zip-archive'; //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
import strings from './LocalizedStrings'
import {Alert, Platform} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import crashlytics from '@react-native-firebase/crashlytics';

const SCHEMA_VERSION = "7";
// const DOWNLOAD_SERVER = "http://10.0.2.2:5000"  // this ip will allow the android emulator to access a localhost server
const DOWNLOAD_SERVER = "https://readonly.sefaria.org";
const HOST_PATH = `${DOWNLOAD_SERVER}/static/ios-export/${SCHEMA_VERSION}`;
const HOST_BUNDLE_URL = `${HOST_PATH}/bundles`;
const [FILE_DIRECTORY, TMP_DIRECTORY] = [`${FileSystem.documentDirectory}library`, `${FileSystem.cacheDirectory}tmp`];  //todo: make sure these are used

let BooksState = {};  // maps titles to Book objects
let PackagesState = {};  // maps package titles to Package objects

async function simpleDelete(filePath) {
try{
  await FileSystem.deleteAsync(encodeURI(filePath));
  } catch (e) { console.warn(e) }
}

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

function createCancelMethods() {
  /*
   * These methods are here so that async methods and promises can set up their own cancel method.
   */
  let cancelMethods = [];
  const addCancelMethod = value => cancelMethods.push(value);
  const resetCancelMethods = () => cancelMethods = [];
  const runCancelMethods = () => cancelMethods.map(x => x());
  return {addCancelMethod, resetCancelMethods, runCancelMethods}
}

const {addCancelMethod, resetCancelMethods, runCancelMethods} = createCancelMethods();

/*
 * A word on design - DownloadTracker was originally supposed to implement the Observer pattern (Pub - Sub). As the
 * complexity of the project grew, DownloadTracker got a little over-sized. It is now behaving as a semaphore, keeping
 * track of who can start a download as well as what downloads have happened in the past. A future project might examine
 * breaking out the responsibilities of this class.
 */
class DownloadTracker {
  // Test with Jest
  constructor() {
    this.currentDownload = null;
    this.subscriptions = {};
    this.removeProgressTracker(); // sets default values for the progress event listener
    this.networkEventListener = null;
    this._alreadyDownloaded = 0;
    this._downloadSession = null;
    this.recoverLock = false;
    this.arrayDownloadState = {
      currentDownload: 0,
      totalDownloads: 0,
      downloadAllowed: false
    };
    this.progressListener = null;
    this.downloadSize = 0;
    this.downloadSavable = null;
  }
  addDownload(downloadState) {
    if (this.downloadInProgress()) {
      throw "Another download is in Progress!"
    }
    this.currentDownload = downloadState;
    // if (!!this.progressTracker) {
    //   const [tracker, config] = this.progressTracker;
    //   downloadState.progress(config, tracker);
    // }
  }
  removeDownload(endSession=false) {
    this.currentDownload = null;
    if (endSession) {

      this.removeDownloadSession().then(() => {})
    } else {
      this.updateSession({downloadActive: false})
    }
  }
  downloadInProgress() {
    return (!!this.currentDownload);
  }
  cancelDownload(cleanup=true) {
    // kill any async methods or promises that need to be stopped due to to downloads being canceled.
    runCancelMethods();
    resetCancelMethods();
    // if (this.downloadInProgress()) {
    //   this.currentDownload.catch(e => {});
    // }
    if (!this.downloadInProgress()) {
      this.removeDownload(cleanup);
      if (cleanup) { cleanTmpDirectory().then( () => {} ) }
      return
    }
    if (cleanup) {
      this.currentDownload.pauseAsync().then(() => {
        this.downloadSavable = null;
        this.removeDownload(true);
        cleanTmpDirectory().then( () => {} )
      });
    } else {
      this.currentDownload.pauseAsync().then(x => {
        this.downloadSavable = x;
        this.removeDownload(false);
      });
    }
  }
  attachProgressTracker(progressTracker, identity) {
    // todo rnfb refactor -> config is a thing from rnfb, we can get rid of it. identity is for react components to subscribe / unsubscribe
    const enhancedProgressTracker = (received, total) => {
      let [trueReceived, trueTotal] = [parseInt(received) + parseInt(this._alreadyDownloaded),
        parseInt(total) + parseInt(this._alreadyDownloaded)];

      let [numDownloads, totalDownloads] =
        this.arrayDownloadState ? [this.arrayDownloadState.currentDownload, this.arrayDownloadState.totalDownloads]
          : [0, 1];

      totalDownloads = totalDownloads >= 1 ? parseInt(totalDownloads) : 1;
      // the following is just algebraic expansion of an expression which adjust the progress to account for an array of downloads
      return progressTracker((trueReceived + numDownloads * trueTotal) / totalDownloads , trueTotal)
    };
    this.progressListener = identity;
    this.progressTracker = enhancedProgressTracker;
  }
  removeProgressTracker(identity) {
    if (identity !== this.progressListener) {
      return
    }
    this.progressListener = null;
    const dummyLogger = (received, total) => { console.log(`downloaded: ${received}/${total}`) };
    this.attachProgressTracker(dummyLogger, 'dummy');
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
  notify() {
    /*
     * At the start of a download we should notify via the method that initiated the download. This should happen from a
     * UI component. This allows the UI component to send whatever messages it needs to down to all the components
     * listening.
     *
     * At the end of a download we'll call notify(false) from the DownloadTracker. This is because only the DownloadTracker
     * can know when a download has completed
     */
    Object.values(this.subscriptions).map(x => {
      try{
        x(this._downloadSession);
      } catch (e) {
        crashlytics().log(`notification error: ${e}`);
      }
    })
  }
  getDownloadStatus() {
    return this._downloadSession;
  }
  addEventListener(networkSetting, downloadBuffer, runEvent=false) {
    /* the netinfo package triggers an event as soon as we attach an event listener
     * but that's not necessary - we only want to trigger the change method if the network status actually changed
     * we set up a variable so that nothing happens an that initial event
     */
    let firstRun = true;
    this.removeEventListener();  // keep things clean
    const allowedToDownload = state => isDownloadAllowed(state, networkSetting);

    const networkChangeMethod = state => {
      if (firstRun) {
        firstRun = false;
        return
      }
      if (allowedToDownload(state)) {
        downloadRecover(networkSetting, downloadBuffer).then(() => {});
      } else if (Tracker.downloadInProgress()){
        Tracker.cancelDownload(false);
      }
    };
    this.networkEventListener = NetInfo.addEventListener(networkChangeMethod);
    if (runEvent) { NetInfo.fetch().then(networkChangeMethod) }  // simulates an event so we can trigger the worker manually
  }
  removeEventListener() {
    if (!!this.networkEventListener) {
      this.networkEventListener();  // calling the event listener unsubscribes
      this.networkEventListener = null;
    }
  }
  hasEventListener() {
    return !!this.networkEventListener
  }
  setAlreadyDownloaded(value) {
    this._alreadyDownloaded = value;
  }
  async startDownloadSession(downloadContent) {
    this._downloadSession = {
      downloadNotification: downloadContent,
      downloadActive: false
    };
    this.notify();
  }
  async removeDownloadSession() {
    this.arrayDownloadState.downloadAllowed = false;
    this._downloadSession = null;
    await AsyncStorage.removeItem('lastDownloadLocation');
    this.notify();
  }
  updateSession(updates) {
    Object.assign(this._downloadSession, updates);
    this.notify();
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
    await repopulateBooksState()

  };
  unclick = async function () {
    /*
     * Set this package as desired = false.
     *
     * This method does not actually delete the books. Deleting takes some time. For better responsiveness it is
     * useful to be call the deleteBooks method explicitly.
     */
    if (this.supersededByParent) {
      throw "A disabled package cannot be unclicked"
    }

    this.clicked = false;
    this._propagateClick(false);
    await AsyncStorage.setItem('packagesSelected', JSON.stringify(selectedPackages()));


    // do we want to separate the concerns here? Less of an issue as there is not a network dependency
    setDesiredBooks();
    return calculateBooksToDelete(BooksState);
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

async function fileExists(filePath) {
  // RNFB had an explicit exists method, while Filesystem does not. This is useful for making the refactor simpler
  filePath = Platform.OS === "ios" ? encodeURI(filePath) : filePath;
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  return fileInfo.exists
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

async function loadJSONFile(JSONSourcePath) {
  if (Platform.OS === "ios") {JSONSourcePath = encodeURI(JSONSourcePath)}
  const readResult = await FileSystem.readAsStringAsync(JSONSourcePath);
  let parsedResult;
  try {
    parsedResult = JSON.parse(readResult);
  } catch (e) {
    parsedResult = {}; // if file can't be parsed, fall back to empty object
  }
  return parsedResult
}

async function loadCoreFile(filename) {
  // Test explicitly with Appium. Platform dependencies are not modeled well with Jest
  const exists = await fileExists(`${FILE_DIRECTORY}/${filename}`);
  const pkgPath = exists ? `${FILE_DIRECTORY}/${filename}`
    : Platform.OS === "ios" ? `${FileSystem.bundleDirectory}/sources/${filename}`
      : `${FileSystem.bundleDirectory}sources/${filename}`;
  try {
    return await loadJSONFile(pkgPath);
  } catch (e) {
    crashlytics().recordError(e);
  }
}

async function lastUpdated() {
  const lastUpdatedSource = `${FILE_DIRECTORY}/last_updated.json`;
  let exists = await fileExists(lastUpdatedSource);
  if (!exists)
    {
      return null;
    }
  return await loadJSONFile(lastUpdatedSource);
    /*
     * In the event the user never downloaded last_updated.json and the download failed we're going to throw out some
     * placeholder values. There might be a better way of dealing with this issue.
     */
  // return {
  //   schema_version: SCHEMA_VERSION,
  //   titles: []
  // };
}

function getFullBookList() { // todo: Use Sefaria.cacheIndexFromToc to initialize?
  // Test with Jest
  return Object.keys(Sefaria.booksDict);
}

async function packageSetupProtocol() {
  // addDir adds a directory if it does not exist. We'll set up the app directory here
  await addDir(FILE_DIRECTORY);

  const [packageData, packagesSelected] = await Promise.all([
    loadCoreFile('packages.json').then(pkgStateData => deriveDownloadState(pkgStateData)),
    AsyncStorage.getItem('packagesSelected').then(x => !!x ? JSON.parse(x) : {})
  ]).catch(e => crashlytics().log(`failed in packageSetupProtocol: ${e}`));
  PackagesState = packageData;

  let falseSelections = [];
  // for (let packName of Object.keys(packagesSelected)) {
  //   packageData[packName].markAsClicked(false)
  // } // rewrote these lines as a Promise.all as markAsClicked is async. Untested, so keeping the old code around
  await Promise.all(Object.keys(packagesSelected).map(
    packName => packageData[packName].markAsClicked(false)
  ));

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
  await repopulateBooksState();
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
        else {  // edge case, new books should not be added here
          BooksState[book] = new Book(book, packageObj.clicked, null);
        }
      })
    })
  }

}

async function setLocalBookTimestamps(bookTitleList) {
  let fileList = await FileSystem.readDirectoryAsync(FILE_DIRECTORY);
  fileList = fileList.filter(x => x.endsWith('.zip'));
  // todo: we desperately need an lstat method here. Not currently known to be supported by FileSystem
  let fileData = await throttlePromiseAll(fileList, x => {
    if (Platform.OS === "ios") { x = encodeURI(x) }
    return FileSystem.getInfoAsync(`${FILE_DIRECTORY}/${x}`)
  }, 10);
  const stamps = {};
  fileData.forEach((f, i) => {
    const bookName = fileList[i].slice(0, -4);
    stamps[bookName] = new Date(parseInt(f['modificationTime'] * 1000));  // FileSystem records seconds since the epoch
  });
  bookTitleList.map(title => {
    const timestamp = (title in stamps) ? stamps[title] : null;
    if (title in BooksState)
      BooksState[title].localLastUpdated = timestamp;
    else
      BooksState[title] = new Book(title, false, timestamp);
  });
}

async function getLocalBookList() {
  // This method is for getting the books that are stored on disk
  let books;
  try {
    books = await FileSystem.readDirectoryAsync(FILE_DIRECTORY);
  } catch (e) {
    crashlytics().error(e);
    books = [];
  }
  const reg = /([^/]+).zip$/;
  return books.filter(filename => filename.endsWith(".zip")).map(fileName => reg.exec(fileName)[1]);
}

async function repopulateBooksState() {
  BooksState = {};
  const allBooks = getFullBookList();
  await setLocalBookTimestamps(allBooks);
  setDesiredBooks();
  return BooksState
}

async function deleteBooks(bookList, shouldCleanTmpDirectory=true) {
  // Test with Appium
  const deleteBook = async (bookTitle) => {
    const filepath = `${FILE_DIRECTORY}/${bookTitle}.zip`;
    const exists = true;
    if (exists) {
      try {
      await simpleDelete(filepath);
      } catch (e) {
        console.log(`Error deleting file: ${e}`)
        crashlytics().log(`Error deleting file: ${e}`);
      }
    }
    return bookTitle
  };
  await throttlePromiseAll(bookList, deleteBook, 50);
  bookList.forEach(bookTitle => {
    if (bookTitle in BooksState) {
      BooksState[bookTitle].localLastUpdated = null;
      BooksState[bookTitle].desired = false;
    }
  });

  // deleting should clean out the tmp directory. This will clear out partially completed downloads, so we want to be able to opt out
  if (shouldCleanTmpDirectory) { await cleanTmpDirectory(); }
}

async function unzipBundle(bundleSessionLocation) {
  // Test with Appium
  await addDir(FILE_DIRECTORY);
  await unzip(bundleSessionLocation, FILE_DIRECTORY);
}

function timeoutPromise(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

async function requestNewBundle(bookList, badResponseWaitTime=3000) {
  /*
   * send a post request to the server. This will cause the server to create a new set of zip files specially
   * tailored for the specific device.
   * This method will continually ping the server until the download is ready (and a 200 is received).
   */
  while (true) {
    let response = await fetch(`${DOWNLOAD_SERVER}/makeBundle?schema_version=${SCHEMA_VERSION}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({books: bookList})
    });
    if (response.ok && response.status !== 202) {  // 202 is returned when the download file is still under construction
      return await response.json();

    } else {
      if (!response.ok) { console.log('bad status from downloadServer - trying bundle request again'); }
      await timeoutPromise(badResponseWaitTime);
    }
  }
}

function getPackageUrls(packageName) {
  const aborter = {abort: false, complete: false}
  addCancelMethod(() => aborter.abort = true)

  const mainPromise = async pn => {
    const response = await fetch(`${DOWNLOAD_SERVER}/packageData?package=${pn}&schema_version=${SCHEMA_VERSION}`);
    const json = await response.json();
    aborter.complete = true;
    return json
  }
  const rejector = async () => {
    do {
      await timeoutPromise(100);
      if (aborter.abort) { throw 'aborted'}
    } while (!aborter.complete)
  }
  return Promise.race([mainPromise(packageName), rejector()])
}

function isDownloadAllowed(networkState, downloadNetworkSetting) {
  if (!networkState.isInternetReachable) { return false }
  switch (networkState.type) {
    case 'none':
      return false;
    case 'wifi':
      return true;
    default:
      return downloadNetworkSetting !== 'wifiOnly';
  }
}

async function _downloadRecover(networkMode='wifiOnly', downloadBuffer) {
  if (Tracker.downloadInProgress()) {
    return
  }
  /*
   * Tricky puzzle here. downloadRecover is scheduled by asynchronous events. Therefore, it is possible for more than
   * one event to schedule. We check Tracker.downloadInProgress early to avoid running unecessary code. But the actual
   * download is only scheduled much further down the line, after MANY asynchronous lines of code. A second
   * downloadRecover can get scheduled while this recovery is awaiting a piece of asynchronous code.
   *
   * My solution is to set a second flag on Tracker. This flag MUST be set before downloadRecover gives up control to
   * the event loop (before an `await` or Promise.then is called). This should be used sparingly, as mistakes
   * here can create "deadlocks" where the Tracker gets locked but no recover that can release the lock can be scheduled.
   */
  const networkState = await NetInfo.fetch();
  if (!isDownloadAllowed(networkState, networkMode)) {
    return
  }
  const downloadSavable = Tracker.downloadSavable;
  if (!downloadSavable) {
    console.log('no savable on Tracker');
    return
  }

  await downloadBundle(downloadSavable.url, networkMode, downloadBuffer, true, downloadSavable);
}

async function downloadBundle(bundleName, networkSetting, downloadBuffer, recoveryMode=false, resumeData='') {
  // Test with Appium
  // console.log(`expect to see ${
  //   Object.values(BooksState).filter(b => b.desired).length
  // } books after download`);
  const getUniqueFilename = () => {  // It's not critical to have a truly unique filename
    return `${FileSystem.cacheDirectory}/${String(Math.floor(Math.random()*10000000))}.zip`
  };
  const getDownloadUrl = (bundle) => {
    // if (recoveryMode) { return bundleName }
    // return `${HOST_BUNDLE_URL}/${encodeURIComponent(bundle)}`
    return bundle
  };

  const [filename, url] = [getUniqueFilename(), getDownloadUrl(bundleName)];
  console.log(`downloading ${url}`);

  // const downloadState = downloadFilePromise(url, filename, downloadFrom);
  const callback = progress => Tracker.progressTracker(progress.totalBytesWritten, progress.totalBytesExpectedToWrite);
  const downloadState = recoveryMode
    ? new FileSystem.createDownloadResumable(
      resumeData.url, resumeData.fileUri, resumeData.options, callback, resumeData.resumeData
    )
    : new FileSystem.createDownloadResumable(
      url, filename, {}, callback
    );

  try {
    Tracker.addDownload(downloadState);  // todo rnfb refactor -> check all the places the downloadState is being used, make sure api is compatible with new library
    Tracker.updateSession({downloadActive: true});
  } catch (e) {
    console.warn(e);
    crashlytics().log(e);
  }
  let downloadResult;
  Tracker.addEventListener(networkSetting, downloadBuffer);
  try {
    downloadResult = await downloadState.downloadAsync();
  }  catch (e) {
    // don't start again if download "failed" due to user request. Download Removal is handled by the cancel method
    if (e.message === 'stream was reset: CANCEL') { return }
    else {
      /* Try again if download failed; recover will abort if the failure is due to network
       *
       * The NetInfo package is updated asynchronously. If we run immediately into a recovery download as soon as a
       * call to `fetch` fails, the Promise updating NetInfo won't get a chance to resolve. Because of this, it is
       * important to schedule the download recovery, rather than running into it directly. Hence the call to setTimeout.
       * Further investigation recommended.
       */
      console.log('Error when awaiting download Promise:');
      console.log(e);
      Tracker.removeDownload();
      Tracker.downloadSavable = await downloadState.pauseAsync();

      setTimeout(async () => {
        console.log('scheduled download recovery from downloadBundle');
        await downloadRecover(networkSetting, downloadBuffer)
      }, 250);
    }
    return
  }

  Tracker.removeEventListener();
  const status = downloadResult.status;
  if (status >= 300 || status < 200) {
    crashlytics().log(`Got status ${status} from download server. Full info below`);
    // crashlytics().log(downloadResult.info());

    // we're going to schedule a recover in the hope that the server will come back up at a later point
    Tracker.removeDownload();
    setTimeout(async () => {
      await downloadRecover(networkSetting, downloadBuffer);
    }, 60*1000);
    return
  }
  try {
    await postDownload(downloadResult.uri, !recoveryMode);
  } catch (e) {
    crashlytics().log(e);
    Alert.alert(
      strings.downloadError,
      strings.downloadErrorMessage,
      [{text: strings.ok}]
    )
  }

  const nextDownload = downloadBuffer.next();
  if (nextDownload.done) {
    Tracker.removeDownload(true);
  }
  else {
    Tracker.removeDownload();
    nextDownload.value();
  }
}

const downloadRecover = async (networkMode, downloadBuffer) => {
  if (Tracker.recoverLock) { return }
  Tracker.recoverLock = true;
  try {
    await _downloadRecover(networkMode, downloadBuffer);
  } finally {
    Tracker.recoverLock = false;
  }
};

async function calculateBooksToDownload(booksState) {
  // Test with Jest
  let timeFudge = null;
  const getTimeFudge = () => {
    if (!!timeFudge) { return timeFudge }
    const [now, later] = [new Date(0), new Date(0)];
    later.setHours(later.getHours() + 6);
    timeFudge = later - now;
    return timeFudge
  }
  const remoteBookUpdates = await lastUpdated();
  if (remoteBookUpdates === null)
    {
      crashlytics().log('no last_updated.json');
      return [];
    }
  const booksToDownload = [];
  Object.keys(booksState).forEach(bookTitle => {
    const bookObj = booksState[bookTitle];
    if (bookObj.desired) {
      if (!bookObj.localLastUpdated) {
        booksToDownload.push(bookTitle);
      } else {
        const [localUpdate, remoteUpdate] = [booksState[bookTitle].localLastUpdated, new Date(remoteBookUpdates.titles[bookTitle])];
        // file timestamp will come from the server on certain platforms - we pad a bit as these values can be very similar to those on last_updated.json
        if ((remoteUpdate - localUpdate) > getTimeFudge()) {
            if (bookTitle === 'Genesis') {
                console.log(`Genesis localUpdate: ${localUpdate}; remoteUpdate: ${remoteUpdate}`);
            }
          booksToDownload.push(bookTitle)
        }
      }
    }
  });
  return booksToDownload
}




function calculateBooksToDelete(booksState) {
  return Object.entries(booksState).filter(
    ([bookTitle, bookObj]) => !bookObj.desired && !!(bookObj.localLastUpdated)
    ).map(([bookTitle, bookObj]) => bookTitle);
}

async function cleanTmpDirectory() {
  let files = [];
  try {
    files = await FileSystem.readDirectoryAsync(TMP_DIRECTORY);
  } catch (e) {  // if for whatever reason TMP_DIRECTORY doesn't exist, we can just exit now
    return
  }
  await Promise.all(files.map(f => simpleDelete(`${TMP_DIRECTORY}/${f}`)));
}

async function postDownload(downloadPath, newDownload=true) {
  const exists = await fileExists(downloadPath);
  if (!exists) {
    console.log(`file at ${downloadPath} missing`);  // todo: we may want to flag a failed download here
    return
  }

  try {
    await unzipBundle(downloadPath);
  } catch (e) {
    // Take to the settings page and check for updates?
    crashlytics().log(`Error when unzipping bundle: ${e}`)
  }
  try {
    await simpleDelete(downloadPath)
  } catch (e) { console.warn(e) }
  await cleanTmpDirectory();
  await repopulateBooksState();
  Tracker.downloadSavable = null;
  console.log(`we have ${
    Object.values(BooksState).filter(b => !!b.localLastUpdated).length
  } books on disk`)

  // -- DEBUG CODE --
  // const genesisExists = await fileExists(`${FILE_DIRECTORY}/Genesis.zip`);
  // if (genesisExists) {
  //     const s = await FileSystem.getInfoAsync(`${FILE_DIRECTORY}/Genesis.zip`);
  //     const genesisAdded = new Date(parseInt(s.lastModified));
  //     console.log(`Genesis added at ${genesisAdded}. Raw value: ${s.lastModified}`);
  // } else { console.log('Genesis file does not exist'); }
 // -- END DEBUG --
}

const downloadBlockedNotification = () => {
  Alert.alert(
    "Download Blocked by Network",
    `Current network setting forbids download`,
    [{text: strings.ok}]
  )
};

async function downloadBundleArray(bundleArray, downloadData, networkSetting) {
  /*
   * downloadData is an object with the properties:
   * {
   *   currentDownload
   *   totalDownloads
   *   downloadAllowed
   * }
   * All fields will be set here, but as this Object will be created and used elsewhere, proper initialization is
   * recommended.
   *
   * We want to make sure the disk is properly cleaned up before starting a download.
   */
  const abortDownload = {abort: false};
  addCancelMethod(() => abortDownload.abort = true);  // allow this method to be cancelled when downloads are cancelled
  const booksToDelete = calculateBooksToDelete(BooksState);
  await deleteBooks(booksToDelete);

  const buffer = [];
  const bufferGen = buffer[Symbol.iterator]();
  Object.assign(downloadData, {
    currentDownload: -1,
    totalDownloads: bundleArray.length,
    downloadAllowed: true,
  });
  /*
   * We can't naively iterate over the urls and download each one. We need to take into account that any one download
   * process can get interrupted and then restart. Therefore, we want to convert each download into a callback. We'll
   * then pass along the list of callbacks so they can be scheduled only after the proceeding download terminated
   * successfully.
   */
  for (const b of bundleArray) {
    buffer.push(async () => {
      downloadData.currentDownload += 1;
      if (abortDownload.abort) { return }
      await downloadBundle(`${DOWNLOAD_SERVER}/${b}`, networkSetting, bufferGen);
    });
  }
  // last method will be resetting the cancel methods and turning off the progress bar
  buffer.push(() => {
    resetCancelMethods();
    Tracker.removeDownload(true);
  });
  if (abortDownload.abort) { return }
  bufferGen.next().value()
  // Tracker.removeDownload(true);
  // console.log('ending download')
}



async function downloadPackage(packageName, networkSetting) {
  const aborter = {abort: false}
  addCancelMethod(() => aborter.abort=true)
  let packageSize = 0;
  try {
    packageSize = PackagesState[packageName].jsonData.size;
  } catch (e) {
    console.log(e);
  }
  Tracker.downloadSize = packageSize;
  await schemaCheckAndPurge();  // necessary for maintaining consistency
  const netState = await NetInfo.fetch();
  if (!isDownloadAllowed(netState, networkSetting)) {
    downloadBlockedNotification();
    return
  }  // todo: review: should notification to the user be sent for a forbidden download?
  let bundles;
  try {
    bundles = await getPackageUrls(packageName);
  } catch (e) { return }

  bundles = bundles.map(u => encodeURIComponent(u));
  if (aborter.abort) { return }
  await downloadBundleArray(bundles, Tracker.arrayDownloadState, networkSetting);
  // bundles.map(async b => {await downloadBundle(`${DOWNLOAD_SERVER}/${b}`, networkSetting)});

  // await downloadBundle(`${packageName}.zip`, networkSetting)
}

async function downloadUpdate(networkSetting, triggeredByUser=true, booksToDownload=null) {
  // Test with Appium
  const aborter = {abort: false};
  addCancelMethod(() => aborter.abort = true);
  const netState = await NetInfo.fetch();
  if (!isDownloadAllowed(netState, networkSetting)) {
    if (triggeredByUser) { downloadBlockedNotification(); }
    return
  }
  if (!booksToDownload) {
    booksToDownload = await calculateBooksToDownload(BooksState);
  }
  if (!booksToDownload.length) { return }
  console.log('requesting new bundle');
  await Tracker.startDownloadSession('Update');
  const bundles = await requestNewBundle(booksToDownload);
  if (Tracker.downloadInProgress()) {  // before starting the process, double check that another one wasn't triggered
    Tracker.cancelDownload(true);  // we'll want to abort everything, this state should be illegal
    return
  }
  Tracker.downloadSize = bundles.downloadSize;
  if (aborter.abort) {
    Tracker.cancelDownload(true);
    return
  }
  await downloadBundleArray(bundles['bundleArray'], Tracker.arrayDownloadState, networkSetting);
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

async function markLibraryForDeletion() {
  // Test with Appium
  return await PackagesState['COMPLETE LIBRARY'].unclick()
}

async function addDir(path) {
  const exists = await fileExists(path);
  if (!exists) {
    try {
      await FileSystem.makeDirectoryAsync(path);
    } catch(e) {
      crashlytics().log(`Could not create directory at ${path}; ${e}`);
    }
  }
}

async function downloadCoreFile(filename) {
  // Test with Appium
  await Promise.all([
    addDir(TMP_DIRECTORY),
    addDir(FILE_DIRECTORY),
  ]);

  const [fileUrl, tempPath] = [`${HOST_PATH}/${encodeURIComponent(filename)}`, `${TMP_DIRECTORY}/${filename}`];
  let downloadResp = null;
  try{
    downloadResp = await FileSystem.downloadAsync(fileUrl, tempPath);
  } catch (e) {
    crashlytics().log(e);
    return
  }
  const status = !!downloadResp ? downloadResp.status : 'total failure';
  if ((status >= 300 || status < 200) || (status === 'total failure')) {
    await simpleDelete(tempPath);
    const e = new Error(`bad download status; got : ${status} from ${fileUrl}`);
    crashlytics().recordError(e);
    throw e  // todo: review. Should we alert the user here?
  }
  else {
  }
  try {
    await FileSystem.moveAsync({from: tempPath, to: `${FILE_DIRECTORY}/${filename}`});
  } catch(e) {
    crashlytics().log(`failed to move file at ${tempPath} to app storage: ${e}`);
    await simpleDelete(tempPath, {idempotent: true});
  }
}

async function checkUpdatesFromServer() {
  // Test with Appium. Also worth timing this method to ensure it is responsive
  await schemaCheckAndPurge();
  let timestamp = new Date().toJSON();
  await AsyncStorage.setItem('lastUpdateCheck', timestamp);

  await Promise.all([
    downloadCoreFile('last_updated.json'),
    downloadCoreFile('toc.json').then(Sefaria._loadTOC),
    downloadCoreFile('search_toc.json').then(Sefaria._loadSearchTOC),
    downloadCoreFile('topic_toc.json'),  // topic toc doesn't need to be in ram
    downloadCoreFile('hebrew_categories.json').then(Sefaria._loadHebrewCategories),
    downloadCoreFile('people.json').then(Sefaria._loadPeople),
    downloadCoreFile('packages.json').then(packageSetupProtocol),
    downloadCoreFile('calendar.json').then(Sefaria._loadCalendar)
  ]);
  await repopulateBooksState();
  const allBooksToDownload = await calculateBooksToDownload(BooksState);
  return [allBooksToDownload, booksNotDownloaded(allBooksToDownload)]
}

async function autoUpdateCheck() {
  /*
   * The mobile downloads are updated every 7 days. We want to prompt the user to update if they haven't checked the
   * server
   */
  let lastUpdateCheck;
  try {
    lastUpdateCheck = await AsyncStorage.getItem('lastUpdateCheck');
  } catch (e) {
    console.log(`failed to retrieve lastUpdateCheck from AsyncStorage: ${e}`);
    return false
  }
  const cutoff = new Date(lastUpdateCheck);
  cutoff.setDate(cutoff.getDate() + 7);
  const now = new Date();

  return now > cutoff
}

function promptLibraryUpdate(totalDownloads, newBooks, networkMode) {
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
      {text: strings.download, onPress: () => downloadUpdate(networkMode, true, totalDownloads)},
      {text: strings.notNow, onPress: onCancel}
    ]
  )

}

async function schemaCheckAndPurge() {
  // Test with Jest
  // checks if there was a schema change. If so, delete the library. The library will be re-downloaded as part of the update process.
  let lastUpdateSchema = await AsyncStorage.getItem("lastUpdateSchema");
  lastUpdateSchema = parseInt(JSON.parse(lastUpdateSchema));
  const schemaVersion = parseInt(SCHEMA_VERSION);  // gets rid of annoying bugs due to the types of these values
  if (!!lastUpdateSchema && lastUpdateSchema !== schemaVersion) {
    crashlytics().log("a user's library has been purged");  // todo: review: should we notify the user that his Library is about to be purged?
    // We want to delete the library but keep the package selections
    const bookList = getFullBookList();
    await deleteBooks(bookList);
    setDesiredBooks();
  }
  await AsyncStorage.setItem("lastUpdateSchema", SCHEMA_VERSION);
}

async function throttlePromiseAll(argList, promiseCallback, maxWorkers=10) {
  let [promiseList, result] = [[], []];
  let resultSubset;
  for (let i=0; i < argList.length; i++) {
    if (promiseList.length >= maxWorkers) {
      resultSubset = await Promise.all(promiseList);
      result.push(...resultSubset);
      promiseList = [];
    }
    promiseList.push(promiseCallback(argList[i]));
  }
  resultSubset = await Promise.all(promiseList);
  result.push(...resultSubset);
  return result
}

function doubleDownload() {
  Alert.alert(
    strings.doubleDownload,
    '',
    [
      {text: strings.ok, onPress: () => {}}
    ]
  )
}

/*
Set a path for download. Save in async-storage. Make sure path is unique.
After download, move to BUNDLE_LOCATION
unzip from BUNDLE_LOCATION
clean up contents of temp directory

Download Recovery:
  check if the file at path of last download exists
  if so, move to BUNDLE_LOCATION
  download from (size_of_BUNDLE_LOCATION)
  append to BUNDLE_LOCATION

Let's stick to downloads over Wi-Fi only by default. I'm going to advocate for an option to allow downloads over a mobile
connection.

Don't allow download initiation if network is not available  -- why not?
On download initiation - set an event handler to cancel the download if network changes
When network comes back up, go for download recovery.
Advanced - Have Progress bar show "Paused" while download is paused


Event listeners are only present when a download is running.

Under network change:
  if download is allowed:
    try a new download (this will fail if another download is still running)
  if download is forbidden:
    remove the download

Under download failure:
  remove the download

Upon cancellation:  // to be run explicitly when StatefulPromise.cancel is called
  remove the download
  clean up tmp folder

seems like there is a situation where a failed download sticks around on the downloadTracker
something is off with rendering the progress bar for an existing download
 */

export {
  downloadBundle,
  packageSetupProtocol,
  wereBooksDownloaded,
  checkUpdatesFromServer,
  promptLibraryUpdate,
  downloadPackage,
  markLibraryForDeletion,
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
  calculateBooksToDelete,
  deleteBooks,
  downloadRecover,
  doubleDownload,
  isDownloadAllowed,
  requestNewBundle,
  fileExists,
  simpleDelete,
};
