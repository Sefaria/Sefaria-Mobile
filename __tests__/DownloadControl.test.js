import RNFB from 'rn-fetch-blob';
import {
  PackagesState,
  Tracker,
  BooksState,
  packageSetupProtocol,
  Package,
  loadJSONFile,
  downloadBundle
} from '../DownloadControl'
import AsyncStorage from '@react-native-community/async-storage';

const fetch = jest.fn(x => {
  return {status: 200}
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
  const lastUpdated = {
    schema_version: 6,
    comment: "",
    titles: {
      Genesis: 0,
      Exodus: 0,
      Leviticus: 0,
      "Rashi on Genesis": 0,
      "Rashi on Exodus": 0,
      "Rashi on Leviticus": 0
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
  beforeAll(async () => {
    await RNFB.fs.writeFile(`${RNFB.fs.dirs.DocumentDir}/library/last_updated.json`, lastUpdated);
    await RNFB.fs.writeFile(`${RNFB.fs.dirs.DocumentDir}/library/packages.json`, packageData);
  });

  test('NoPackagesSelected', async () => {
    await packageSetupProtocol();
    expect(Object.values(PackagesState)).toHaveLength(3);
    Object.values(PackagesState).forEach(p => {
      expect(p).toBeInstanceOf(Package)
    });
    expect(PackagesState).toHaveProperty("Torah with Rashi");
    expect(PackagesState["Torah with Rashi"].parent).toEqual("COMPLETE LIBRARY");

  });

  test('PackageSelected', async () => {
    await AsyncStorage.setItem('packagesSelected', JSON.stringify({
      "Gen with Rashi": true
    }));
    await packageSetupProtocol();
    await PackagesState['Gen with Rashi'].markAsClicked();
    expect(BooksState.Genesis.desired).toBe(true);
    expect(BooksState.Exodus.desired).toBe(false)
  })
});

describe('testMocking', () => {
  // These tests are sanity checks to make sure the mocks are behaving as intended
  test('readWrite', async () => {
    await RNFB.fs.writeFile('foo/bar', 'some random stuff');
    const result = await loadJSONFile('foo/bar');
    expect(result).toBe('some random stuff')
  });
});

/*
 * TEST LIST:
 * 1.
 */
