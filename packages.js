import { AsyncStorage, AlertIOS } from 'react-native';
const RNFS = require('react-native-fs');

const Packages = {
  available: null,
  selected: null,
  titleToPackageMap: {},
  _load: function() {
    return Promise.all([
      new Promise((resolve, reject) => {
        Sefaria._loadJSON(RNFS.MainBundlePath + "/sources/packages.json").then(function(data) {
          Sefaria.packages.available = data;
          for (pkgObj of data) {
            if (!!pkgObj.indexes) {
              for (i of pkgObj.indexes) {
                if (!!Sefaria.packages.titleToPackageMap[i]) {
                  Sefaria.packages.titleToPackageMap[i].push(pkgObj.en);
                } else {
                  Sefaria.packages.titleToPackageMap[i] = [pkgObj.en];
                }
              }
            }
          }
          resolve();
        })
      }),
      AsyncStorage.getItem("packagesSelected").then(function(data) {
        Sefaria.packages.selected = JSON.parse(data) || {};
      }),
    ]);
  },
  updateSelected: pkgName => {
    if (Sefaria.packages.isSelected(pkgName)) {
      //prompt user about delete
      AlertIOS.alert(
        strings.deleteLibrary,
        `Are you sure you want to delete "${pkgName}"?`,
        [
          {text: strings.cancel, style: 'cancel'},
          {text: strings.delete, style: 'destructive', onPress: Sefaria.packages.deletePackage.bind(null, pkgName)}
        ]
      );
      delete Sefaria.packages.selected[pkgName];
    } else {
      for (let pkg of Sefaria.packages.available) {
        if (pkg.parent === pkgName || (Sefaria.packages.isFullLibrary(pkgName) && pkg.en !== pkgName)) {
          delete Sefaria.packages.selected[pkg.en];
          // in the case of full library, there won't be pkg.indexes. however, this `if` cannot run for full library
          Sefaria.downloader._removeFromDownloadQueueBulk(pkg.indexes)
        }
      }
      Sefaria.packages.selected[pkgName] = 0;  // value is number of downloaded indexes in pkg
      Sefaria.downloader.downloadLibrary(true);
    }
    return AsyncStorage.setItem("packagesSelected", JSON.stringify(Sefaria.packages.selected)).catch(function(error) {
      console.error("AsyncStorage failed to save: " + error);
    });
  },
  isSelected: pkgName => {
    return !!Sefaria.packages.selected[pkgName] || Sefaria.packages.selected[pkgName] === 0;
  },
  isFullLibrary: pkgName => {
    //full library pkg has no indexes listed
    return !Sefaria.packages.available.find(p=>p.en === pkgName).indexes;
  },
  getSelectedParent: pkgName => {
    const currPkgObj = Sefaria.packages.available.find(p=>p.en === pkgName);
    for (let tempPkg of Object.keys(Sefaria.packages.selected)) {
      if (currPkgObj.parent === tempPkg || (Sefaria.packages.isFullLibrary(tempPkg) && tempPkg !== currPkgObj.en)) {
        return tempPkg;
      }
    }
    return false;
  },
  titleIsSelected: title => {
    const pkgs = Sefaria.packages.titleToPackageMap[title];
    for (pkg of Object.keys(Sefaria.packages.selected)) {
      if (Sefaria.packages.isFullLibrary(pkg)) { return true; }
    }
    if (!!pkgs) {
      for (pkg of pkgs) {
        if (Sefaria.packages.isSelected(pkg)) { return true; }
      }
    }
    return false;
  },
  titleInPackage: (title, pkg) => {
    const pkgList = Sefaria.packages.titleToPackageMap[title];
    return Sefaria.packages.isFullLibrary(pkg) || (!!pkgList && pkgList.indexOf(pkg) !== -1);
  },
  deletePackage: pkgName => {
    RNFS.unlink(RNFS.DocumentDirectoryPath + "/tmp");
    RNFS.mkdir(RNFS.DocumentDirectoryPath + "/tmp");
    if (Sefaria.packages.isFullLibrary(pkgName)) {
      RNFS.unlink(RNFS.DocumentDirectoryPath + "/library");
    } else {
      const pkgObj = Sefaria.packages.available.find(p=>p.en === pkgName);
      const promises = pkgObj.indexes.map(i => RNFS.unlink.bind(null,`${RNFS.DocumentDirectoryPath}/library/${i}.zip`));
      const reflect = promise => promise.then(v=>1,e=>0);
      Promise.all(promises).then
      for (i of pkgObj.indexes) {
        RNFS.unlink(`${RNFS.DocumentDirectoryPath}/library/${i}.zip`)
        .catch(error=>{console.log(error);});
      }
    }

    Downloader._setData("lastDownload", {});
    Downloader._setData("shouldDownload", false);
    Downloader.clearQueue();
    Downloader.onChange && Downloader.onChange();
    Sefaria.track.event("Downloader", "Delete Library");
  },
}

export default Packages
