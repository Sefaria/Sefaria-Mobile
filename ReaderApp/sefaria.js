const ZipArchive = require('react-native-zip-archive'); //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
var RNFS = require('react-native-fs'); //for access to file system -- (https://github.com/johanneslumpe/react-native-fs)
// var HTMLView = require('react-native-htmlview'); //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

Sefaria = {

    deleteAllFiles: function () {
        RNFS.readDir(RNFS.DocumentDirectoryPath).then((result) => {
            for(var i = 0; i < result.length; i++) {
                RNFS.unlink(result[i].path)
                // spread is a method offered by bluebird to allow for more than a
                // single return value of a promise. If you use `then`, you will receive
                // the values inside of an array
                    .spread((success, path) => {
           //         console.log('FILE DELETED', success, path);
                })
                // `unlink` will throw an error, if the item to unlink does not exist
                    .catch((err) => {
          //          console.log(err.message);
                });
            }
        });

            /*.then(() => {
            this.unZipAndLoadJSON(this.zipSourcePath(zip), this.JSONSourcePath(json),callback)
        })
            */


    },

    unZipAndLoadJSON: function (zipSourcePath, JSONSourcePath,callback) {
        ZipArchive.unzip(zipSourcePath, RNFS.DocumentDirectoryPath).then(() => {
            var REQUEST_URL = JSONSourcePath;
            fetch(REQUEST_URL).then((response) => response.json()).then((responseData) => {
                 callback(responseData);
            }).done();
        })
    },
    
    JSONSourcePath: function (fileName) {
        return (RNFS.DocumentDirectoryPath + "/" + fileName + ".json");
    },
    zipSourcePath: function (fileName) {
        return (RNFS.MainBundlePath + "/sources/" + fileName + ".zip");
    },

};


        