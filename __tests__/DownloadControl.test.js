import RNFB from 'rn-fetch-blob';
import {downloadBundle} from '../DownloadControl'

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
    config: (x => {
      return {
        fetch: jest.fn(x => {
          return Promise.resolve({
            info: () => {
              return {status: 200}
            }
          })
        })
      }
    })
  }
});






test('mockfetch', () => {
  return downloadBundle(['books']).then(response => {
    expect(response.info()).toEqual({status: 200});
  })
});

test('testLog', () => {
  console.log('testing');
  return expect(2 + 2).toBe(4);
  }

);
