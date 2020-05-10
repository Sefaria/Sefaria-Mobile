import RNFB from 'rn-fetch-blob';
import {PackagesState, Tracker, BooksState, ExportedFunctions} from '../DownloadControl'
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
  test('PackageInitialization', () => {

  });
});

/*
 * TEST LIST:
 * 1.
 */
