
const testCache = {};


export default {
  fs: {
    dirs: {
      DocumentDir: '',
      MainBundleDir: '',
    },
    readFile: jest.fn(x => {
      return new Promise((resolve, reject) => {
        if (x in testCache) {
          resolve(testCache[x])
        }
        else reject(`File ${x} does not exist`)

      })
    }),
    exists: jest.fn(x => Promise.resolve((x in testCache))
    ),
    asset: jest.fn(x => Promise.reject("Asset not implemented.")),
    stat: jest.fn(x => Promise.resolve({})),
    ls: jest.fn(x => Promise.resolve([])),
    unlink: jest.fn(x => {
      delete testCache[x];
      return Promise.resolve('')
    }),
    isDir: jest.fn(x => Promise.resolve(true)),
    mkdir: jest.fn(x => Promise.resolve()),
    mv: jest.fn((source, dest) => {
      return new Promise((resolve, reject) => {
        if (source in testCache) {
          testCache[dest] = testCache[source];
          delete testCache[source];
          resolve()
        } else reject(`File at ${source} does not exist`)
      })
    }),
    writeFile: jest.fn((path, content) => {
        testCache[path] = content;
        return Promise.resolve()
    })
  },
  config: jest.fn(x => {
    return {
      fetch: jest.fn(x => Promise.resolve({
        info: () => {
          return {status: 200}
        }
      }))
    }
  })
};
