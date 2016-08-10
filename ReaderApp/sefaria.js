const ZipArchive = require('react-native-zip-archive'); //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
var RNFS = require('react-native-fs'); //for access to file system -- (https://github.com/johanneslumpe/react-native-fs)
// var HTMLView = require('react-native-htmlview'); //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

Sefaria = {
    data: function(ref, settings) {
        //also technically includes links due to structure of JSON.
        return new Promise(function(resolve, reject) {

            var fileNameStem = ref.split(":")[0];
            var bookRefStem = fileNameStem.substring(0, fileNameStem.lastIndexOf(" "));

            fetch(Sefaria._JSONSourcePath(fileNameStem))
                .then(
                    (response) => response.json())
                .then(
                    (data) => {
                        resolve(data);
                    }
                )
                .catch(function() {
                    Sefaria._unZipAndLoadJSON(Sefaria._zipSourcePath(bookRefStem), Sefaria._JSONSourcePath(fileNameStem), function (data) {

                        resolve(data);

                    })
                });
        });
    },
    toc: function() {
        var JSONSourcePath = (RNFS.MainBundlePath + "/sources/toc.json");
        return new Promise(function(resolve, reject) {
            if (Sefaria._toc) {
                resolve(Sefaria._toc);
            } else {
                Sefaria._loadJSON(JSONSourcePath, function(data) {
                    Sefaria._toc = data;
                    resolve(data);
                });
            }
        });
    },
    _toc: null,
    _deleteAllFiles: function () {
        return new Promise(function(resolve, reject) {
            RNFS.readDir(RNFS.DocumentDirectoryPath).then((result) => {
                for (var i = 0; i < result.length; i++) {
                    RNFS.unlink(result[i].path)
                }
                resolve();
            });
        });
    },
    _unZipAndLoadJSON: function (zipSourcePath, JSONSourcePath, callback) {
        ZipArchive.unzip(zipSourcePath, RNFS.DocumentDirectoryPath).then(() => {
            this._loadJSON(JSONSourcePath, callback);
        });
    },
    _loadJSON: function(JSONSourcePath, callback) {
        fetch(JSONSourcePath).then((response) => response.json()).then((responseData) => {
             callback(responseData);
        }).done();        
    },
    _JSONSourcePath: function (fileName) {
        return (RNFS.DocumentDirectoryPath + "/" + fileName + ".json");
    },
    _zipSourcePath: function (fileName) {
        return (RNFS.MainBundlePath + "/sources/" + fileName + ".zip");
    },

};

module.exports = Sefaria;
        