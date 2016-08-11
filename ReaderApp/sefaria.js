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

Sefaria.hebrewCategory = function(cat) {
    // Returns a string translating `cat` into Hebrew.
    var categories = {
      "Torah":                "תורה",
      "Tanakh":               'תנ"ך',
      "Tanakh":               'תנ"ך',
      "Prophets":             "נביאים",
      "Writings":             "כתובים",
      "Commentary":           "מפרשים",
      "Quoting Commentary":   "פרשנות מצטטת",
      "Targum":               "תרגומים",
      "Mishnah":              "משנה",
      "Tosefta":              "תוספתא",
      "Talmud":               "תלמוד",
      "Bavli":                "בבלי",
      "Yerushalmi":           "ירושלמי",
      "Rif":                  'רי"ף',
      "Kabbalah":             "קבלה",
      "Halakha":              "הלכה",
      "Halakhah":             "הלכה",
      "Midrash":              "מדרש",
      "Aggadic Midrash":      "מדרש אגדה",
      "Halachic Midrash":     "מדרש הלכה",
      "Midrash Rabbah":       "מדרש רבה",
      "Responsa":             'שו"ת',
      "Rashba":               'רשב"א',
      "Rambam":               'רמב"ם',
      "Other":                "אחר",
      "Siddur":               "סידור",
      "Liturgy":              "תפילה",
      "Piyutim":              "פיוטים",
      "Musar":                "ספרי מוסר",
      "Chasidut":             "חסידות",
      "Parshanut":            "פרשנות",
      "Philosophy":           "מחשבת ישראל",
      "Apocrypha":            "ספרים חיצונים",
      "Modern Works":         "עבודות מודרניות",
      "Seder Zeraim":         "סדר זרעים",
      "Seder Moed":           "סדר מועד",
      "Seder Nashim":         "סדר נשים",
      "Seder Nezikin":        "סדר נזיקין",
      "Seder Kodashim":       "סדר קדשים",
      "Seder Toharot":        "סדר טהרות",
      "Seder Tahorot":        "סדר טהרות",
      "Dictionary":           "מילון",
      "Early Jewish Thought": "מחשבת ישראל קדומה",
      "Minor Tractates":      "מסכתות קטנות",
      "Rosh":                 'ר"אש',
      "Maharsha":             'מהרשא',
      "Mishneh Torah":        "משנה תורה",
      "Shulchan Arukh":       "שולחן ערוך",
      "Sheets":               "דפי מקורות",
      "Notes":                "הערות",
      "Community":            "קהילה"
    };
    return cat in categories ? categories[cat] : cat;
};

Sefaria.palette = {
  colors: {
    darkteal:  "#004e5f",
    raspberry: "#7c406f",
    green:     "#5d956f",
    paleblue:  "#9ab8cb",
    blue:      "#4871bf",
    orange:    "#cb6158",
    lightpink: "#c7a7b4",
    darkblue:  "#073570",
    darkpink:  "#ab4e66",
    lavender:  "#7f85a9",
    yellow:    "#ccb479",
    purple:    "#594176",
    lightblue: "#5a99b7",
    lightgreen:"#97b386",
    red:       "#802f3e",
    teal:      "#00827f"  
  }
};
Sefaria.palette.categoryColors = {
  "Commentary":         Sefaria.palette.colors.blue,
  "Tanakh" :            Sefaria.palette.colors.darkteal,
  "Midrash":            Sefaria.palette.colors.green,
  "Mishnah":            Sefaria.palette.colors.lightblue,
  "Talmud":             Sefaria.palette.colors.yellow,
  "Halakhah":           Sefaria.palette.colors.red,
  "Kabbalah":           Sefaria.palette.colors.purple,
  "Philosophy":         Sefaria.palette.colors.lavender,
  "Liturgy":            Sefaria.palette.colors.darkpink,
  "Tosefta":            Sefaria.palette.colors.teal,
  "Parshanut":          Sefaria.palette.colors.paleblue,
  "Chasidut":           Sefaria.palette.colors.lightgreen,
  "Musar":              Sefaria.palette.colors.raspberry,
  "Responsa":           Sefaria.palette.colors.orange,
  "Apocrypha":          Sefaria.palette.colors.lightpink,
  "Other":              Sefaria.palette.colors.darkblue,
  "Quoting Commentary": Sefaria.palette.colors.orange,
  "Commentary2":        Sefaria.palette.colors.blue,
  "Sheets":             Sefaria.palette.colors.raspberry,
  "Community":          Sefaria.palette.colors.raspberry,
  "Targum":             Sefaria.palette.colors.lavender,
  "Modern Works":       Sefaria.palette.colors.raspberry,
  "More":               Sefaria.palette.colors.darkblue,
};
Sefaria.palette.categoryColor = function(cat) {
  if (cat in Sefaria.palette.categoryColors) {
    return Sefaria.palette.categoryColors[cat];
  }
  return "transparent";
};

module.exports = Sefaria;
        