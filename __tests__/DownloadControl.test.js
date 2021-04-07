import {
  PackagesState,
  Tracker,
  BooksState,
  packageSetupProtocol,
  Package,
  loadJSONFile,
  downloadBundle,
  getFullBookList,
  requestNewBundle,
  getLocalBookList,
  FILE_DIRECTORY, calculateBooksToDownload, calculateBooksToDelete, autoUpdateCheck
} from '../DownloadControl'
import AsyncStorage from '@react-native-async-storage/async-storage';
import {FileSystem} from 'react-native-unimodules'
import Sefaria from '../sefaria'


const tocJson = [
  {
    contents: [
      'Genesis',
      'Exodus',
      'Leviticus',
      'Rashi on Genesis',
      'Rashi on Exodus',
      'Rashi on Leviticus',
      'Weird Random Book'
    ].map(x => {
      return {title: x}
    })
  }
];

const lastUpdated = {
  schema_version: 6,
  comment: "",
  titles: {}
};
let yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
[  // set the dates to yesterday
    "Genesis",
    "Exodus",
    "Leviticus",
    "Rashi on Genesis",
    "Rashi on Exodus",
    "Rashi on Leviticus",
    "Weird Random Book",
  ].map(x => lastUpdated.titles[x] = yesterday.toISOString());
const packageData = [
  {
    en: "COMPLETE LIBRARY",
    he: "כל הספרייה",
    color: "Other",
    size: 10
  },
  {
    en: "Gen with Rashi",
    he: 'בראשית עם רש"י',
    color: "Blue",
    parent: "Torah with Rashi",
    indexes: [
      "Genesis",
      "Rashi on Genesis",
    ],
    size: 2
  },
  {
    en: "Torah with Rashi",
    he: 'תורה עם רש"י',
    color: "Blue",
    indexes: [
      "Genesis",
      "Exodus",
      "Leviticus",
      "Rashi on Genesis",
      "Rashi on Exodus",
      "Rashi on Leviticus"
    ],
    size: 5
  }
];

fetch = jest.fn(x => {
  return Promise.resolve({status: 200, ok: true, json: async () => Promise.resolve({})})
});

beforeEach(async () => {
  await FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/toc.json`, JSON.stringify(tocJson));
  // await Sefaria._loadTOC();
  Sefaria.booksDict = {};
  [
    'Genesis',
    'Exodus',
    'Leviticus',
    'Rashi on Genesis',
    'Rashi on Exodus',
    'Rashi on Leviticus',
    'Weird Random Book'
    ].map(x => Sefaria.booksDict[x] = 1);
  await FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/packages.json`, JSON.stringify(packageData));
});

afterEach(async () => {
  await FileSystem.clear();
  await AsyncStorage.clear();
});

describe('InitializationTests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('NoPackagesSelected', async () => {
    await packageSetupProtocol();
    expect(Object.values(PackagesState)).toHaveLength(3);
    Object.values(PackagesState).forEach(p => {
      expect(p).toBeInstanceOf(Package)
    });
    expect(PackagesState).toHaveProperty("Torah with Rashi");
    expect(PackagesState["Torah with Rashi"].parent).toEqual("COMPLETE LIBRARY");
    expect(BooksState.Genesis.desired).toBe(false)

  });

  test('PackageSelected', async () => {
    await AsyncStorage.setItem('packagesSelected', JSON.stringify({
      "Gen with Rashi": true
    }));
    await packageSetupProtocol();
    expect(BooksState.Genesis.desired).toBe(true);
    expect(BooksState.Exodus.desired).toBe(false);
    expect(BooksState['Weird Random Book'].desired).toBe(false);
  });

  test('CompleteLibraryTest', async () => {
    await AsyncStorage.setItem('packagesSelected', JSON.stringify({
      'COMPLETE LIBRARY': true
    }));
    await packageSetupProtocol();
    expect(BooksState.Genesis.desired).toBe(true);
    expect(BooksState.Exodus.desired).toBe(true);
    expect(BooksState["Weird Random Book"].desired).toBe(true);
    expect(PackagesState["COMPLETE LIBRARY"].clicked).toBe(true);
    expect(PackagesState["COMPLETE LIBRARY"].supersededByParent).toBe(false);
    expect(PackagesState["Torah with Rashi"].supersededByParent).toBe(true);
  });
  test('Package Selections Stable', async () => {
    const selection = {"Gen with Rashi": true};
    await AsyncStorage.setItem('packagesSelected', JSON.stringify(selection));
    await packageSetupProtocol();
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);  // should only be called here
    const retrievedSelection = await AsyncStorage.getItem('packagesSelected');
    expect(JSON.parse(retrievedSelection)).toEqual(selection);
  });
  test('Bad Data Correction', async () => {
    const selection = {
      "Torah with Rashi": true,
      "Gen with Rashi": true,  // child of Torah with Rashi, should be purged
    };
    await AsyncStorage.setItem('packagesSelected', JSON.stringify(selection));
    await packageSetupProtocol();
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    const retrievedSelection = await AsyncStorage.getItem('packagesSelected');
    expect(JSON.parse(retrievedSelection)).toEqual({"Torah with Rashi": true});
  })
});

describe('UpdateTests', () => {
  async function fileSetup(packageName) {
    // Selects the package and write the file to disk
    await AsyncStorage.setItem('packagesSelected', JSON.stringify({
      [packageName]: true
    }));
    const relevantPackage = packageData.find(p => p['en'] === packageName);
    const bookPromises = relevantPackage.indexes.map(x => {
      FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/${x}.zip`, 'foo')
    });
    await Promise.all(bookPromises);
  }
  async function basicTest(expectedDownloads, expectedDeletes) {
    // sanity check that our mock is not throwing out a default value. package.json should be on disk before every test
    const preFiles =  await FileSystem.readDirectoryAsync(FILE_DIRECTORY);
    expect(preFiles.length).toBeGreaterThan(0);

    await packageSetupProtocol();
    const [toDownload, toDelete] = await Promise.all([calculateBooksToDownload(BooksState), calculateBooksToDelete(BooksState)]);
    const postFiles = await FileSystem.readDirectoryAsync(FILE_DIRECTORY);
    expect(toDownload).toHaveLength(expectedDownloads);
    expect(toDelete).toHaveLength(expectedDeletes);
    expect(postFiles).toEqual(preFiles);
  }
  beforeEach(async () => {
    await FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/last_updated.json`, JSON.stringify(lastUpdated));
  });
  afterEach(async () => {
    AsyncStorage.clear();
    FileSystem.clear();
    jest.clearAllMocks();
  });
  test('noDownloads', async () => {
    await basicTest(0, 0);
  });
  test("noUpdates", async () => {
    await fileSetup("Gen with Rashi");
    await basicTest(0, 0);
  });
  test('missingBook', async () => {
    await fileSetup("Gen with Rashi");
    await FileSystem.deleteAsync(`${FILE_DIRECTORY}/Genesis.zip`);
    await basicTest(1, 0)
  });
  test('bookOutOfDate', async () => {
    await fileSetup("Gen with Rashi");
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    FileSystem.setTimestamp(`${FILE_DIRECTORY}/Genesis.zip`, lastWeek.valueOf());
    await basicTest(1, 0)
  });
  test('bookToDelete', async () => {
    await FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/Genesis.zip`, 'foo');
    await basicTest(0, 1)
  });
  test('deleteUpdateMissing', async () => {
    await fileSetup("Torah with Rashi");
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    FileSystem.setTimestamp(`${FILE_DIRECTORY}/Genesis.zip`, lastWeek.valueOf());
    await FileSystem.deleteAsync(`${FILE_DIRECTORY}/Exodus.zip`);
    await FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/Weird Random Book.zip`, 'bar');
    await basicTest(2, 1)
  });
  test('MissingCompleteLibrary', async () => {
    await AsyncStorage.setItem('packagesSelected', JSON.stringify({
      'COMPLETE LIBRARY': true
    }));
    await basicTest(7, 0);
  });
  test('CompleteLibraryMissingUpdate', async () => {
    await AsyncStorage.setItem('packagesSelected', JSON.stringify({
      'COMPLETE LIBRARY': true
    }));
    await FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/Genesis.zip`, 'foo');
    await FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/Exodus.zip`, 'foo');
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    FileSystem.setTimestamp(`${FILE_DIRECTORY}/Exodus.zip`, lastWeek.valueOf());
    await basicTest(6, 0);
  });
  test('requestNewBundle', async () => {
    // check that the method retries after server failure
    fetch.mockImplementationOnce(x => Promise.resolve({status: 202, ok: true}));
    await requestNewBundle(['Genesis', 'Job'], 1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('lastUpdated', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });
  const setDate = async daysAgo => {
    let d = new Date();
    d.setDate(d.getDate() - daysAgo);
    await AsyncStorage.setItem('lastUpdateCheck', d.toJSON());
  };
  const setup = async () => {
    await AsyncStorage.setItem('packagesSelected', JSON.stringify({
      'COMPLETE LIBRARY': true
    }));
    await packageSetupProtocol();
  };
  test('noLibrary', async () => {
    await packageSetupProtocol();
    const requiresUpdate = await autoUpdateCheck();
    expect(requiresUpdate).toBe(true);
  });
  test('updatedRecently', async () => {
    await setup();
    await setDate(1);
    const requiresUpdate = await autoUpdateCheck();
    expect(requiresUpdate).toBe(false);
  });
  test('updatedALongTimeAgo', async () => {
    await setup();
    await setDate(10);
    const requiresUpdate = await autoUpdateCheck();
    expect(requiresUpdate).toBe(true);
  });
});

test('getLocalBookList', async () => {
  await Promise.all([
    FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/Genesis.zip`, '123'),
    FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/Berakhot.zip`, '456'),
    FileSystem.writeAsStringAsync(`${FILE_DIRECTORY}/Midrash Rabbah.zip`, '789')
  ]);
  const result = await getLocalBookList();
  expect(result).toEqual(['Genesis', 'Berakhot', 'Midrash Rabbah']);
});

describe('testMocking', () => {
  // These tests are sanity checks to make sure the mocks are behaving as intended
  test('readWrite', async () => {
    await FileSystem.writeAsStringAsync('foo/bar', JSON.stringify('some random stuff'));
    const result = await loadJSONFile('foo/bar');
    expect(result).toBe('some random stuff')
  });
  test('singleMock', async () => {
    // We want to verify we are properly using mockImplementationOnce
    const [realResult, mockResult] = [{exists: false, isDirectory: false}, {exists: true, fakeKey: 'foobar'}];
    let result = await FileSystem.getInfoAsync('/fakeFile.txt');
    expect(result).toEqual(realResult);
    FileSystem.getInfoAsync.mockImplementationOnce(x => Promise.resolve(mockResult));
    result = await FileSystem.getInfoAsync('/fakeFile.txt');
    expect(result).toBe(mockResult);
    result = await FileSystem.getInfoAsync('/fakeFile.txt');
    expect(result).toEqual(realResult);
  });
  test('getInfoAsync', async () => {
    await FileSystem.writeAsStringAsync('/foo', 'bar');
    const stat = await FileSystem.getInfoAsync('/foo');
    expect(stat).toBeInstanceOf(Object);
    expect(stat).toHaveProperty('modificationTime');
    expect(stat).toHaveProperty('uri')
  });
  test('multipleGetInfoAsync', async () => {
    const fileList = ['/foo/a', '/foo/b', '/foo/c']
    const filePromises = fileList.map(x => {
      FileSystem.writeAsStringAsync(`${x}`, 'foo');
    });
    await Promise.all(filePromises);
    const lstatResults = await Promise.all(fileList.map(x => FileSystem.getInfoAsync(x)));
    const fileBStat = await FileSystem.getInfoAsync('/foo/b');
    expect(lstatResults).toBeInstanceOf(Array);
    expect(lstatResults).toHaveLength(3);
    delete fileBStat['modificationTime'];  // these cause annoying off-by-1 errors on occasion
    delete lstatResults[1]['modificationTime'];
    expect(lstatResults[1]).toEqual(fileBStat);
  });
  test('customTimestamp', async () => {
    await FileSystem.writeAsStringAsync('/foo/bar', 'blablabla');
    const someTime = new Date(123000);
    FileSystem.setTimestamp('/foo/bar', someTime);
    const fileInfo = await FileSystem.getInfoAsync('/foo/bar');
    expect(fileInfo.modificationTime * 1000).toBe(someTime.valueOf());
  });
  test('fetchMocks', async () => {
    fetch.mockImplementationOnce(x => Promise.resolve({status: 404}));
    let fetchResponse;
    fetchResponse = await fetch('foo');
    expect(fetchResponse.status).toBe(404);
    fetchResponse = await fetch('foo');
    expect(fetchResponse.status).toBe(200);
    const j = await fetchResponse.json();
    expect(j).toEqual({});
  });
});
