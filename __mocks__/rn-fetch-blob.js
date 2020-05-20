
const testCache = {};
const timeStamps = {};

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

function stat(path) {
if (!(path in testCache))
  return Promise.reject(new Error(`File ${path} not found`));
let timestamp = (path in timeStamps) ? timeStamps[path] : new Date();
return Promise.resolve({
  filename: path.split('/').pop(),
  path: path,
  size: 1,
  type: 'file',
  lastModified: timestamp.valueOf()
})
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
    stat: jest.fn(path => {
      return stat(path);
    }),
    lstat: jest.fn(async path => {
      const pathFiles = Object.keys(testCache).filter(x => x.startsWith(path));
      const statData = pathFiles.map(p => stat(p));
      return await Promise.all(statData);
    }),
    ls: jest.fn(x => Promise.resolve(Object.keys(testCache).filter(k => k.startsWith(x)))),
    unlink: jest.fn(x => {
      delete testCache[x];
      if (x in timeStamps) {
        delete timeStamps[x]
      }
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
      Object.keys(timeStamps).forEach(x => {
        delete timeStamps[x];
      })
    }),
    setTimestamp: jest.fn((filename, timestamp) => {
      timeStamps[filename] = timestamp;
    }),
    clearTimestamp(filename) {
      if (filename in timeStamps)
        delete timeStamps[filename];
    }
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
