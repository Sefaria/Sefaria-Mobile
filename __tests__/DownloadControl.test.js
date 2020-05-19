import RNFB from 'rn-fetch-blob';
import {
  PackagesState,
  Tracker,
  BooksState,
  packageSetupProtocol,
  Package,
  loadJSONFile,
  downloadBundle,
  getFullBookList,
  FILE_DIRECTORY, calculateBooksToDownload, calculateBooksToDelete
} from '../DownloadControl'
import AsyncStorage from '@react-native-community/async-storage';
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
  titles: {
    Genesis: 0,
    Exodus: 0,
    Leviticus: 0,
    "Rashi on Genesis": 0,
    "Rashi on Exodus": 0,
    "Rashi on Leviticus": 0,
    "Weird Random Book" : 0,
  }
};
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
  return {status: 200}
});

beforeEach(async () => {
  await RNFB.fs.writeFile(`${FILE_DIRECTORY}/toc.json`, tocJson);
  // await Sefaria._loadTOC();
  Sefaria.booksDict = [
    'Genesis',
    'Exodus',
    'Leviticus',
    'Rashi on Genesis',
    'Rashi on Exodus',
    'Rashi on Leviticus',
    'Weird Random Book'
    ].map(x => {
      return {[x]: 1}
    });
  await RNFB.fs.writeFile(`${FILE_DIRECTORY}/packages.json`, packageData);
});

afterEach(async () => {
  await RNFB.fs.clear();
  await AsyncStorage.clear();
});

describe('downloadBundle_tests', () => {
  test('Successful download', () => {
    return downloadBundle(['books']).then(response => {
      expect(response.info()).toEqual({status: 200});
    })
  });

  test ('Bad download status', () => {
    RNFB.config.mockImplementationOnce(() => {
      return {
        fetch: jest.fn().mockResolvedValue(Promise.resolve({
          info: () => {
            return {status: 404}
          }
        }))
      }
    });
    expect.assertions(1);
    return downloadBundle(['books']).catch(e => expect(e).toMatch("Bad download status"));
  });

  test ('total download failure', () => {
    RNFB.config.mockImplementationOnce(() => {
      return {
        fetch: () => {
          return Promise.reject('error')
          }
        }
      }
    );
    return downloadBundle(['books']).catch(e => expect(e).toMatch("error"));
  });


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
  async function basicTest(expectedDownloads, expectedDeletes) {
    // todo: make sure lstat is not throwing out default data; add a timestamp method to RNFB mock to set custom timestamps for test purposes.
    const preFiles =  await RNFB.fs.ls(FILE_DIRECTORY);
    // sanity check that our mock is not throwing out a default value. package.json at minimum should be on disk before every test
    expect(preFiles.length).toBeGreaterThan(0);
    await packageSetupProtocol();
    const [toDownload, toDelete] = await Promise.all([calculateBooksToDownload(BooksState), calculateBooksToDelete(BooksState)]);
    const postFiles = await RNFB.fs.ls(FILE_DIRECTORY);
    expect(toDownload).toHaveLength(expectedDownloads);
    expect(toDelete).toHaveLength(expectedDeletes);
    expect(postFiles).toEqual(preFiles);
  }
  beforeEach(async () => {
    await RNFB.fs.writeFile(`${FILE_DIRECTORY}/last_updated.json`, lastUpdated);
  });
  afterEach(async () => {
    AsyncStorage.clear();
    RNFB.fs.clear();
    jest.clearAllMocks();
  });
  test('noDownloads', async () => {
    await basicTest(0, 0);
  });
  test("noUpdates", async () => {
    await AsyncStorage.setItem('packagesSelected', JSON.stringify({
      "Gen with Rashi": true
    }));
    const relevantPackage = packageData.find(p => p['en'] === "Gen with Rashi");
    const bookPromises = relevantPackage.indexes.map(async x => {
      await RNFB.fs.writeFile(`${FILE_DIRECTORY}/${x}.zip`, 'foo')
    });
    await Promise.all(bookPromises);
    await basicTest(0, 0);
  });
  test('missingBook', async () => {
    await AsyncStorage.setItem('packagesSelected', JSON.stringify({
      "Gen with Rashi": true
    }));
    await RNFB.fs.writeFile(`${FILE_DIRECTORY}/Genesis.zip`, 'foo');
    await basicTest(1, 0)
  });
  test('bookOutOfDate', async () => {
    // calculateBooksToDownload will return the out-of-date book
    // calculateBooksToDelete returns nothing
    // disk stays the same
  });
  test('bookToDelete', async () => {
    await RNFB.fs.writeFile(`${FILE_DIRECTORY}/Genesis.zip`, 'foo');
    await basicTest(0, 1)
    // calculateBooksToDownload returns nothing
    // calculateBooksToDelete returns book to be deleted
    // disk stays the same
  });
  test('deleteUpdateMissing', () => {
    // calculateBooksToDownload returns missing and out-of-date
    // calculateBooksToDelete returns book to be deleted
    // disk the same
  });
});

describe('noLastUpdated', () => {});

describe('testMocking', () => {
  // These tests are sanity checks to make sure the mocks are behaving as intended
  test('readWrite', async () => {
    await RNFB.fs.writeFile('foo/bar', 'some random stuff');
    const result = await loadJSONFile('foo/bar');
    expect(result).toBe('some random stuff')
  });
  test('singleMock', async () => {
    // We want to verify we are properly using mockImplementationOnce
    let result = await RNFB.fs.lstat();
    const mockResult = [{
      'Genesis.zip': 'foo'
    }];
    expect(result).toEqual([]);
    RNFB.fs.lstat.mockImplementationOnce(x => Promise.resolve(mockResult));
    result = await RNFB.fs.lstat();
    expect(result).toBe(mockResult);
    result = await RNFB.fs.lstat();
    expect(result).toEqual([]);
  });
  test('stat', async () => {
    await RNFB.fs.writeFile('/foo', 'bar');
    const stat = await RNFB.fs.stat('/foo');
    expect(stat).toBeInstanceOf(Object);
    expect(stat).toHaveProperty('lastModified');
    expect(stat).toHaveProperty('filename')
  });
  test('lstat', async () => {
    const filePromises = ['/foo/a', '/foo/b', '/foo/c'].map(x => {
      RNFB.fs.writeFile(`${x}`, 'foo');
    });
    await Promise.all(filePromises);
    const lstatResults = await RNFB.fs.lstat('/foo');
    const fileBStat = await RNFB.fs.stat('/foo/b');
    expect(lstatResults).toBeInstanceOf(Array);
    expect(lstatResults).toHaveLength(3);
    expect(lstatResults[1]).toEqual(fileBStat);
  });
  test('customTimestamp', async () => {
    await RNFB.fs.writeFile('/foo/bar', 'blablabla');
    const someTime = new Date(123456);
    RNFB.fs.setTimestamp('/foo/bar', someTime);
    const stat = await RNFB.fs.stat('/foo/bar');
    expect(stat.lastModified).toBe(someTime.valueOf());
  });
});

/*
 * TEST LIST:
 * 1.
 */
