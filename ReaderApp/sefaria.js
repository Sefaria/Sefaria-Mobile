const ZipArchive = require('react-native-zip-archive'); //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
var RNFS = require('react-native-fs'); //for access to file system -- (https://github.com/johanneslumpe/react-native-fs)
// var HTMLView = require('react-native-htmlview'); //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

Sefaria = {
    init: function() {
        // Load TOC JSON
        var JSONSourcePath = (RNFS.MainBundlePath + "/sources/toc.json");
        return new Promise(function(resolve, reject) {
            Sefaria._loadJSON(JSONSourcePath, function(data) {
                Sefaria.toc = data;
                resolve();
            });
        });
    },
    data: function(ref, settings) {
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
    toc: null,
    tocItemsByCategories: function(cats) {
      // Returns the TOC items that correspond to the list of categories 'cats'
      var list = Sefaria.toc
      for (var i = 0; i < cats.length; i++) {
        var found = false;
        for (var k = 0; k < list.length; k++) {
          if (list[k].category == cats[i]) { 
            list = Sefaria.util.clone(list[k].contents);
            found = true;
            break;
          }
        }
        if (!found) { return []; }
      }
      return list;        
    },
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
    search: {
        baseUrl: "http://search.sefaria.org/merged/_search/",
        _cache: {},
        cache: function(key, result) {
            if (result !== undefined) {
                this._cache[key] = result;
            }
            return this._cache[key]
        },
        execute_query: function (args) {
            // To replace sjs.search.post in search.js

            /* args can contain
            query: query string
            size: size of result set
            from: from what result to start
            type: null, "sheet" or "text"
            get_filters: if to fetch initial filters
            applied_filters: filter query by these filters
            success: callback on success
            error: callback on error
            */
            if (!args.query) {
                return;
            }
            var req = JSON.stringify(Sefaria.search.get_query_object(args.query, args.get_filters, args.applied_filters, args.size, args.from, args.type));
            var cache_result = this.cache(req);
            if (cache_result) {
                args.success(cache_result);
                return null;
            }
            var url = Sefaria.search.baseUrl;

            return $.ajax({
                url: url,
                type: 'POST',
                data: req,
                crossDomain: true,
                processData: false,
                dataType: 'json',
                success: function(data) {
                    this.cache(req, data);
                    args.success(data);
                }.bind(this),
                error: args.error
            });
        },
        get_query_object: function (query, get_filters, applied_filters, size, from, type) {
            /*
            Only the first argument - "query" - is required.

            query: string
            get_filters: boolean
            applied_filters: null or list of applied filters (in format supplied by Filter_Tree...)
            size: int - number of results to request
            from: int - start from result # (skip from - 1 results)
            type: string - currently either "texts" or "sheets"
            */

            get_filters = false; //Turning off filters for now
            applied_filters = [];

            var core_query = {
                "query_string": {
                    "query": query.replace(/(\S)"(\S)/g, '$1\u05f4$2'), //Replace internal quotes with gershaim.
                    "default_operator": "AND",
                    "fields": ["content"]
                }
            };

            var o = {
                "from": from,
                "size": size,
                "sort": [{
                    "order": {}                 // the sort field name is "order"
                }],
                "_source": {
                    "exclude": [ "content" ]
                },
                "highlight": {
                    "pre_tags": ["<b>"],
                    "post_tags": ["</b>"],
                    "fields": {
                        "content": {"fragment_size": 200}
                    }
                }
            };

            if (get_filters) {
                //Initial, unfiltered query.  Get potential filters.
                if (type) {
                    o['query'] = {
                        filtered: {
                            query: core_query,
                            filter: {type: {value: type}}
                        }
                    };
                } else {
                    o['query'] = core_query;
                }

                o['aggs'] = {
                    "category": {
                        "terms": {
                            "field": "path",
                            "size": 0
                        }
                    },
                    "type": {
                        "terms": {
                            "field": "_type",
                            "size": 0
                        }
                    }
                };
            } else if (!applied_filters || applied_filters.length == 0) {
                // This is identical to above - can be cleaned up into a variable
                if (type) {
                    o['query'] = {
                        filtered: {
                            query: core_query,
                            filter: {type: {value: type}}
                        }
                    };
                } else {
                    o['query'] = core_query;
                }
            } else {
                //Filtered query.  Add clauses.  Don't re-request potential filters.
                var clauses = [];
                for (var i = 0; i < applied_filters.length; i++) {
                    clauses.push({
                        "regexp": {
                            "path": RegExp.escape(applied_filters[i]) + ".*"
                        }
                    });
                    /* Test for Commentary2 as well as Commentary */
                    if (/^Commentary\//.test(applied_filters[i])) {
                        var c2 = "Commentary2/" + applied_filters[i].slice(11);
                        clauses.push({
                            "regexp": {
                                "path": RegExp.escape(c2) + ".*"
                            }
                        });
                    }
                }
                if (type) {
                    o['query'] = {
                        "filtered": {
                            "query": core_query,
                            "filter": {
                                "bool": {
                                    "must": [
                                        {"or": clauses},
                                        {type: {value: type}}
                                    ]
                                }
                            }
                        }
                    };
                } else {
                    o['query'] = {
                        "filtered": {
                            "query": core_query,
                            "filter": {
                                "or": clauses
                            }
                        }
                    };
                }
                o['aggs'] = {
                    "type": {
                        "terms": {
                            "field": "_type",
                            "size": 0
                        }
                    }
                };
            }
            return o;
        },

        //FilterTree object - for category filters
        FilterNode: function() {
            this.children = [];
            this.parent = null;
            this.selected = 0; //0 - not selected, 1 - selected, 2 - partially selected
        }
    }

};

Sefaria.util = {
    clone: function clone(obj) {
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;

        // Handle Date
        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle Array
        if (obj instanceof Array) {
            var copy = [];
            var len = obj.length;
            for (var i = 0; i < len; ++i) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        // Handle Object
        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }

        throw new Error("Unable to copy obj! Its type isn't supported.");
    },
    inArray: function(needle, haystack) {
      if (!haystack) { return -1 } //For parity of behavior w/ JQuery inArray
      var index = -1;
      for (var i = 0; i < haystack.length; i++) {
        if (haystack[i] === needle) {
          index = i;
          break;
        }
      }
      return index;
    }
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
