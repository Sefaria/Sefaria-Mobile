import RNFB from 'rn-fetch-blob';
import {PackagesState, Tracker, BooksState, ExportedFunctions, Package} from '../DownloadControl'
import AsyncStorage from '@react-native-community/async-storage';

const fetch = jest.fn(x => {
  return {status: 200}
});

jest.mock('rn-fetch-blob', () =>{
  return {
    fs: {
      dirs: {
        DocumentDir: "foo"
      }
    },
    config: jest.fn().mockImplementation(() => {
      return {
        fetch: jest.fn().mockResolvedValue(Promise.resolve({
          info: () => {
            return {status: 200}
          }
        }))
      }
    }),
  }
});

describe('downloadBundle_tests', () => {
  test('Successful download', () => {
    return ExportedFunctions.downloadBundle(['books']).then(response => {
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
    return ExportedFunctions.downloadBundle(['books']).catch(e => expect(e).toMatch("Bad download status"));
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
    return ExportedFunctions.downloadBundle(['books']).catch(e => expect(e).toMatch("error"));
  });


});

describe('InitializationTests', () => {
  test('PackageInitialization', async () => {
    const orig = ExportedFunctions.repopulateBooksState;
    ExportedFunctions.repopulateBooksState = jest.fn(() => {return {}});

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
    await ExportedFunctions.populateDownloadState(packageData);
    expect(Object.values(PackagesState)).toHaveLength(3);
    Object.values(PackagesState).forEach(p => {
      expect(p).toBeInstanceOf(Package)
    });
    expect(PackagesState).toHaveProperty("Torah with Rashi");
    expect(PackagesState["Torah with Rashi"].parent).toEqual("COMPLETE LIBRARY");

    ExportedFunctions.repopulateBooksState = orig;
  });
});

/*
 * TEST LIST:
 * 1.
 */
