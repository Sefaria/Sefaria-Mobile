
const testCache = {};

// using this seems more "correct", but much more difficult to implement correctly. Unclear at this time if worth the effort
function getPath(path) {
  let curdir = testCache;
  let pathList = path.split('/').slice(1);  // get rid of the leading slash
  for (let p in pathList) {
    if (curdir instanceof Object && p in curdir)
      curdir = curdir[p];
    else
      throw new Error(`Path ${path} does not exist`);
  }
  return curdir
}


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
        testCache[path] = JSON.stringify(content);
        return Promise.resolve()
    }),
    clear: jest.fn(() => {
      for (let member in testCache) {
        if (testCache.hasOwnProperty(member))
          delete testCache[member]
      }
    })
  },
  /*
   * Testing tip: Use RNFB.fs.writeFile in test setup to populate disk with data that would have been downloaded
   * from a server
   */
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
