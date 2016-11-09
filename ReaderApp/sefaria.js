const ZipArchive = require('react-native-zip-archive'); //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
const RNFS = require('react-native-fs'); //for access to file system -- (https://github.com/johanneslumpe/react-native-fs)
import { GoogleAnalyticsTracker } from 'react-native-google-analytics-bridge'; //https://github.com/idehub/react-native-google-analytics-bridge/blob/master/README.md
import { AsyncStorage } from 'react-native';


Sefaria = {
  init: function() {
    // Load JSON data for TOC and Calendar
    return new Promise(function(resolve, reject) {
      var checkResolve = function() {
        if (Sefaria.toc && Sefaria.recent) {
          resolve();
        }
      };
      var tocPath = (RNFS.MainBundlePath + "/sources/toc.json");
      Sefaria._loadJSON(tocPath).then(function(data) {
        Sefaria.toc = data;
        checkResolve();
        Sefaria._cacheIndexFromToc(data);
      });
      Sefaria._loadRecentItems(checkResolve);
      // Sefaria.calendar is loaded async when ReaderNavigationMenu renders
    });
  },
  data: function(ref) {
    return new Promise(function(resolve, reject) {
      var fileNameStem = ref.split(":")[0];
      var bookRefStem  = Sefaria.textTitleForRef(ref);
      var jsonPath     = Sefaria._JSONSourcePath(fileNameStem);
      var zipPath      = Sefaria._zipSourcePath(bookRefStem);
      var processData = function(data) {
        // Store data in in memory cache if it's not there already
        if (!(jsonPath in Sefaria._jsonData)) {
          Sefaria._jsonData[jsonPath] = data;
        }
        if ("content" in data) {
          var result = data;
        } else {
          // If the data file represents multiple sections, pick the appropriate one to return
          var refUpOne = ref.lastIndexOf(":") !== -1 ? ref.slice(0, ref.lastIndexOf(":")) : ref;
          if (ref in data.sections) {
            var result = data.sections[ref];
          } else if (refUpOne in data.sections) {
            var result = data.sections[refUpOne];
          } else {
            reject("Couldn't find section in depth 3+ text");
            return;
          }
        }
        // Annotate link objects with useful fields not included in export
        result.content.forEach(function(segment) {
          if ("links" in segment) {
            segment.links.map(function(link) {
              link.textTitle = Sefaria.textTitleForRef(link.sourceRef);
              if (!("category" in link)) {
                link.category = Sefaria.categoryForTitle(link.textTitle);
              }
            });
          }
        });
        result.requestedRef   = ref;
        result.isSectionLevel = (ref === result.sectionRef);
        Sefaria.cacheCommentatorListBySection(result);
        resolve(result);
      };


      // Pull data from in memory cache if available
      if (jsonPath in Sefaria._jsonData) {
        processData(Sefaria._jsonData[jsonPath]);
        return;
      }
      Sefaria._loadJSON(jsonPath)
        .then(processData)
        .catch(function() {
          // If there was en error, assume it's because the data was not unzipped yet
          Sefaria._unzip(zipPath)
            .catch(function() { console.error("Error unzipping: ", zipPath)})
            .then(() => Sefaria._loadJSON(jsonPath))
            .then(processData)
            .catch(function() {
              // Now that the file is unzipped, if there was an error assume we have a depth 1 text
              var depth1FilenameStem = fileNameStem.substr(0, fileNameStem.lastIndexOf(" "));
              var depth1JSONPath = Sefaria._JSONSourcePath(depth1FilenameStem);
              Sefaria._loadJSON(depth1JSONPath)
                .then(processData)
                .catch(function() {
                  console.error("Error loading JSON file: " + jsonPath + " OR " + depth1JSONPath);
                });
            });
        });
    });
  },
  _jsonData: {}, // in memory cache for JSON data
  textTitleForRef: function(ref) {
    // Returns the book title named in `ref` by examining the list of known book titles.
    for (i = ref.length; i >= 0; i--) {
      book = ref.slice(0, i);
      if (book in Sefaria.booksDict) {
        return book;
      }
    }
    return null;
  },
  categoryForTitle: function(title) {
    var index = Sefaria.index(title);
    if (!index) { return null;}
    return index.categories[0] == "Commentary2" ? "Commentary" : index.categories[0];
  },
  categoryForRef: function(ref) {
    return Sefaria.categoryForTitle(Sefaria.textTitleForRef(ref));
  },
  getTitle: function(ref, isCommentary, isHe, engTitle) {
      if (isHe && engTitle) {
        //console.log("yoyoyoyo");
        var engSeg = engTitle.split(":")[1];
        var engFileNameStem = engTitle.split(":")[0];
        var engSec = engFileNameStem.substring(engFileNameStem.lastIndexOf(" ")+1,engFileNameStem.length);

        var heDaf = Sefaria.hebrew.encodeHebrewDaf(engSec,"long");
        if (heDaf != null) {
          var fullHeDaf = heDaf + ":" + Sefaria.hebrew.encodeHebrewNumeral(engSeg);
        } else {

        }
      }
      if (fullHeDaf) {
        var find = '[״׳]'; //remove geresh and gershaim
        var re = new RegExp(find, 'g');
        ref = ref.replace(re, '');
        var bookRefStem = ref.split(" " + fullHeDaf)[0];
      } else {
        var fileNameStem = ref.split(":")[0];
        var bookRefStem = fileNameStem.substring(0, fileNameStem.lastIndexOf(" "));
      }

      if (isCommentary) {
          var onInd = isHe ? bookRefStem.indexOf(" על ") : bookRefStem.indexOf(" on ");
          if (onInd != -1)
            bookRefStem = bookRefStem.substring(0,onInd);
      }
      return bookRefStem;
  },
  booksDict: {},
  _index: {}, // Cache for text index records
  index: function(text, index) {
    if (!index) {
      return this._index[text];
    } else {
      this._index[text] = index;
    }
  },
  showSegmentNumbers: function(text) {
    let index = Sefaria.index(text);
    if (!index) return true; //default to true
    return ['Talmud','Liturgy'].indexOf(index.categories[0]) == -1;
  },
  canBeContinuous: function(text) {
    let index = Sefaria.index(text);
    if (!index) { return false; } // default to false
    return ['Talmud','Tanakh'].indexOf(index.categories[0]) != -1;
  },
  _cacheIndexFromToc: function(toc) {
    // Unpacks contents of Sefaria.toc into index cache.
    for (var i = 0; i < toc.length; i++) {
      if ("category" in toc[i]) {
        Sefaria._cacheIndexFromToc(toc[i].contents)
      } else {
        Sefaria.index(toc[i].title, toc[i]);
        Sefaria.booksDict[toc[i].title] = 1;
      }
    }
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
      if (!found) {
        return [];
      }
    }
    return list;
  },
  commentaryList: function(title) {
    // Returns the list of commentaries for 'title' which are found in Sefaria.toc
    var index = this.index(title);
    if (!index) { return []; }
    var cats   = [index.categories[0], "Commentary"];
    var branch = this.tocItemsByCategories(cats);
    var commentariesInBranch = function(title, branch) {
      // Recursively walk a branch of TOC, return a list of all commentaries found on `title`.
      var results = [];
      for (var i=0; i < branch.length; i++) {
        if (branch[i].title) {
          var split = branch[i].title.split(" on ");
          if (split.length == 2 && split[1] === title) {
            results.push(branch[i]);
          }
        } else {
          results = results.concat(commentariesInBranch(title, branch[i].contents));
        }
      }
      return results;
    };
    return commentariesInBranch(title, branch);
  },
  _commentatorListBySection: {},
  commentatorListBySection: function(ref) {
    return Sefaria._commentatorListBySection[ref];
  },
  cacheCommentatorListBySection: function(data) {
    if (data.ref in Sefaria._commentatorListBySection) { return; }
    var en = new Set();
    var he = new Set();
    for (var i = 0; i < data.content.length; i++) {
      if (!("links" in data.content[i])) { continue; }
      for (var j =0; j < data.content[i].links.length; j++) {
        var link = data.content[i].links[j];
        if (link.category === "Commentary") {
          en.add(Sefaria.getTitle(link.sourceRef, true, false));
          he.add(Sefaria.getTitle(link.sourceHeRef, true, true));
        }
      }
    }
    commentators = {
      en: [...en],
      he: [...he]
    }
    Sefaria._commentatorListBySection[data.ref] = commentators;
  },
  _textToc: {},
  textToc: function(title, callback) {
    if (title in Sefaria._textToc) {
      return Sefaria._textToc[title];
    }
    var path = Sefaria._JSONSourcePath(title + "_index");
    Sefaria._loadJSON(path).then(function(data) {
      Sefaria._textToc[title] = data;
      callback(data);
    });
    return null;
  },
  calendar: null,
  loadCalendar: function(callback) {
    var calendarPath = (RNFS.MainBundlePath + "/sources/calendar.json");
    Sefaria._loadJSON(calendarPath).then(function(data) {
      Sefaria.calendar = data;
      callback();
    });
  },
  parashah: function() {
    // Returns an object representing this week's Parashah
    let parashah;
    let weekOffset = 1;

    //See if there's a Parshah this week -- If not return next week's, if not return the week after that... אא"וו
    while (!parashah) {
      let date = new Date();
      date.setDate(date.getDate() + (6 - 1 - date.getDay() + 7) % 7 + weekOffset);
      dateString = Sefaria._dateString(date);
      parashah = Sefaria.calendar.parshiot[dateString];
      weekOffset += 1;
    }
    return Sefaria.calendar ? parashah : null;
  },
  dafYomi: function() {
    // Returns an object representing today's Daf Yomi
    return Sefaria.calendar ? Sefaria.calendar.dafyomi[Sefaria._dateString()] : null;
  },
  _dateString: function(date) {
    // Returns of string in the format "DD/MM/YYYY" for either `date` or today.
    var date = typeof date === 'undefined' ? new Date() : date;
    var day = date.getDate();
    var month = date.getMonth()+1; //January is 0!
    var year = date.getFullYear();

    return month + '/' + day + '/' + year;
  },
  recent: null,
  saveRecentItem: function(item) {
    var items = Sefaria.recent || [];
    items = items.filter(function(existing) {
      return Sefaria.textTitleForRef(existing.ref) !== Sefaria.textTitleForRef(item.ref);
    });
    items = [item].concat(items).slice(0,4);
    Sefaria.recent = items;
    AsyncStorage.setItem("recent", JSON.stringify(items)).catch(function(error) {
      console.error("AsyncStorage failed to save: " + error);
    });
  },
  _loadRecentItems: function(callback) {
    AsyncStorage.getItem("recent").then(function(data) {
      Sefaria.recent = JSON.parse(data) || [];
      callback();
    }).catch(function(error) {
      console.error("AsyncStorage failed to load: " + error);
    });;
  },
  _deleteAllFiles: function() {
    return new Promise(function(resolve, reject) {
      RNFS.readDir(RNFS.DocumentDirectoryPath).then((result) => {
        for (var i = 0; i < result.length; i++) {
          if (result[i].isFile()) {
            RNFS.unlink(result[i].path);
          }
        }
        resolve();
      });
    });
  },
  _unzip: function(zipSourcePath) {
    return ZipArchive.unzip(zipSourcePath, RNFS.DocumentDirectoryPath);
  },
  _loadJSON: function(JSONSourcePath) {
    return fetch(JSONSourcePath).then((response) => response.json());
  },
  _JSONSourcePath: function(fileName) {
    return (RNFS.DocumentDirectoryPath + "/" + fileName + ".json");
  },
  _zipSourcePath: function(fileName) {
    return (RNFS.MainBundlePath + "/sources/" + fileName + ".zip");
  },
  textFromRefData: function(data) {
    // Returns a dictionary of the form {en: "", he: ""} that includes a single string with
    // Hebrew and English for `data.requestedRef` found in `data` as returned from Sefaria.data.
    // `data.requestedRef` may be either section or segment level.
    if (data.isSectionLevel) {
      let enText = "", heText = "";
      for (let i = 0; i < data.content.length; i++) {
        let item = data.content[i];
        if (typeof item.text === "string") enText += item.text + " ";
        if (typeof item.he === "string") heText += item.he + " ";
      }
      return({en: enText, he: heText});
    } else {
      var segmentNumber = data.requestedRef.slice(data.ref.length+1);
      for (let i = 0; i < data.content.length; i++) {
        let item = data.content[i];
        if (item.segmentNumber === segmentNumber) {
            let enText = "", heText = "";
            if (typeof item.text === "string") enText = item.text;
            if (typeof item.he === "string") heText = item.he;
            return({en: enText, he: heText});
        }
      }
    }
    return null;
  },
  links: {
    _linkContentLoadingStack: [],
    _linkContentLoadingHash: {},
    /* when you switch segments, delete stack and hashtable*/
    reset: function() {
      Sefaria.links._linkContentLoadingStack = [];
      Sefaria.links._linkContentLoadingHash = {};
    },
    loadLinkData: function(ref,pos,resolveClosure,rejectClosure,runNow) {
      parseData = function(data) {
        return new Promise(function(resolve, reject) {
          var result = Sefaria.textFromRefData(data);
          // console.log(data.requestedRef + ": " + result.en + " / " + result.he);
          if (result) {
            resolve(result);
          } else {
            reject(result);
          }
          let prev = Sefaria.links._linkContentLoadingStack.shift();
          //delete Sefaria.links._linkContentLoadingHash[prev.ref];
          //console.log("Removing from queue:",prev.ref,"Length:",Sefaria.links._linkContentLoadingStack.length);
          if (Sefaria.links._linkContentLoadingStack.length > 0) {
            let next = Sefaria.links._linkContentLoadingStack[0]; //Sefaria.links._linkContentLoadingStack.length-1
            Sefaria.links.loadLinkData(next.ref,next.pos,null,null,true).then(next.resolveClosure).catch(next.rejectClosure);
          }
        });
      };
      //if (ref.indexOf("Abarbanel") != -1) return new Promise(function(reject,resolve){reject({en:"I like to cause bugs in otherwise perfectly fine apps",he:"I like to cause bugs in otherwise perfectly fine apps"})});
      if (!runNow && !Sefaria.links._linkContentLoadingHash[ref]) {
        //console.log("Putting in queue:",ref,"Length:",Sefaria.links._linkContentLoadingStack.length);
        Sefaria.links._linkContentLoadingStack.push({"ref":ref,"pos":pos,"resolveClosure":resolveClosure,"rejectClosure":rejectClosure});
        Sefaria.links._linkContentLoadingHash[ref] = true;
      }
      if ((Sefaria.links._linkContentLoadingStack.length == 1 && !Sefaria.links._linkContentLoadingStack[ref]) || runNow) {
        //console.log("Starting to load",ref);
        return Sefaria.data(ref).then(parseData);
      } else {

        return new Promise(function(resolve,reject) {
          reject('inQueue');
        })
      }
    },
    linkSummary: function(sectionRef, tempLinks) {
        return new Promise(function(resolve, reject) {
          // Returns an ordered array summarizing the link counts by category and text
          // Takes an array of links which are of the form { "category", "sourceHeRef", "sourceRef", "textTitle"}
          let links = tempLinks || [];
          var summary = {"All": {count: 0, books: {}}, "Commentary": {count: 0, books: {}}};
          for (let link of links) {
            // Count Category
            if (link.category in summary) {
              summary[link.category].count += 1
            } else {
              summary[link.category] = {count: 1, books: {}};
            }
            summary["All"].count += 1;


            var category = summary[link.category];
            // Count Book
            if (link.textTitle in category.books) {
              category.books[link.textTitle].count += 1;
              category.books[link.textTitle].refList.push(link.sourceRef);
            } else {
              var isCommentary = link.category == "Commentary";
              category.books[link.textTitle] =
              {
                  count:    1,
                  title:    Sefaria.getTitle(link.sourceRef, isCommentary, false),
                  heTitle:  Sefaria.getTitle(link.sourceHeRef, isCommentary, true, link.sourceRef),
                  category: link.category,
                  refList:  [link.sourceRef]
              };
            }
          }

          //Add zero commentaries
          let commentatorList = Sefaria.commentatorListBySection(sectionRef);
          if (commentatorList) {
            let commentaryBooks = summary["Commentary"].books;
            let commentaryBookTitles = Object.keys(commentaryBooks).map((book)=>commentaryBooks[book].title);
            for (let i = 0; i < commentatorList.en.length; i++) {
              let commEn = commentatorList.en[i];
              let commHe = commentatorList.he[i];
              if (commentaryBookTitles.indexOf(commEn) == -1) {
                commentaryBooks[commEn] =
                {
                  count:    0,
                  title:    commEn,
                  heTitle:  commHe,
                  category: "Commentary",
                  refList:  []
                }
              }
            }
          }

          // Convert object into ordered list
          var summaryList = Object.keys(summary).map(function(category) {
            var categoryData = summary[category];
            categoryData.category = category;
            categoryData.refList = [];
            categoryData.books = Object.keys(categoryData.books).map(function(book) {
              var bookData = categoryData.books[book];
              return bookData;
            });
            // Sort the books in the category
            categoryData.books.sort(function(a, b) {
              // First sort by predefined "top"
              var topByCategory = {
                "Commentary": ["Rashi", "Ibn Ezra", "Ramban", "Sforno","Tosafot"]
              };
              var top = topByCategory[categoryData.category] || [];
              var aTop = top.indexOf(a.title);
              var bTop = top.indexOf(b.title);
              if (aTop !== -1 || bTop !== -1) {
                aTop = aTop === -1 ? 999 : aTop;
                bTop = bTop === -1 ? 999 : bTop;
                return aTop < bTop ? -1 : 1;
              }
              // Then sort alphabetically
              return a.book > b.book ? 1 : -1;
            });
            return categoryData;
          });

          var allRefs = [];
          for (let cat of summaryList) {
            for (let book of cat.books) {
              cat.refList = cat.refList.concat(book.refList);
              allRefs = allRefs.concat(book.refList);
            }
          }

          // Sort the categories
          var order = ["Commentary", "byCount", "Modern Works", "All"];
          summaryList.sort(function(a, b) {
            var indexByCount = order.indexOf("byCount");
            var indexA = order.indexOf(a.category) != -1 ? order.indexOf(a.category) : indexByCount;
            var indexB = order.indexOf(b.category) != -1 ? order.indexOf(b.category) : indexByCount;

            if (indexA == indexByCount && indexB == indexByCount) {
              return b.count - a.count
            }

            return indexA - indexB;

          });

          // Attach data to "All" category in last position
          summaryList[summaryList.length-1].refList = allRefs;

          // Remove "Commentary" section if it is empty or only contains greyed out items
          if (summaryList[0].books.length == 0) { summaryList = summaryList.slice(1); }
          // Remove "All" section if it's count is zero
          if (summaryList[summaryList.length-1].count == 0) { summaryList = summaryList.slice(0, -1); }

          resolve(summaryList);
        });

      },
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
    execute_query: function(args) {
      // To replace sjs.search.post in search.js

      /* args can contain
       query: query string
       size: size of result set
       from: from what result to start
       type: null, "sheet" or "text"
       get_filters: if to fetch initial filters
       applied_filters: filter query by these filters
       */
      if (!args.query) {
        return;
      }
      var req = JSON.stringify(Sefaria.search.get_query_object(args.query, args.get_filters, args.applied_filters, args.size, args.from, args.type));
      var cache_result = this.cache(req);
      //console.log("cache",JSON.stringify(cache_result));
      if (cache_result) {
        return cache_result;
      }
      return fetch(Sefaria.search.baseUrl,{
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: req
      })
      .then((response) => {
        //this.cache(req,json);
        return response.json();
      });
    },
    get_query_object: function(query, get_filters, applied_filters, size, from, type) {
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
          "exclude": ["content"]
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
  },
  track: {
      // Helper functions for event tracking (with Google Analytics and Mixpanel)
      _tracker: null,
      init: function() {
        //GoogleAnalytics.setTrackerId('UA-24447636-4');
        Sefaria.track._tracker = new GoogleAnalyticsTracker('UA-24447636-4',
          {'Panels Open':1,'Book Name':2,'Ref':3,'Version Title':4,'Page Type':5,'Sidebars':6});
        //Content Group Map
        //1 = Primary Category
        //2 = Secondary Category
        //3 = Book Name
        //5 = Content Language
      },
      /**
      * category: string
      * action: string
      * label: string
      * value: int / string
      * customDimensions: dict with keys specified in track.init() and values
      * contentGroups: dict with keys as ints specified in track.init() and values
      **/
      event: function(category, action, label, value, customDimensions, contentGroups) {
        if (contentGroups) {
          for (let contGroup of Object.keys(contentGroups)) {
            //Sefaria.track._tracker.trackContentGroup(contGroup, contentGroups.contGroup);
          }
        }

        if (customDimensions) {
          Sefaria.track._tracker.trackEventWithCustomDimensionValues(category, action, {label: label, value: value}, customDimensions);
        } else {
          Sefaria.track._tracker.trackEvent(category, action, {label: label, value: value});
        }

        console.log("EVENT",category,action,label,value);
      },
      pageview: function(page, customDimensions, contentGroups) {
        //console.log('Page',page);
        //console.log('CustDims',customDimensions);
        //console.log('ContGrou',contentGroups);
        if (contentGroups) {
          for (let contGroup of Object.keys(contentGroups)) {
            //Sefaria.track._tracker.trackContentGroup(parseInt(contGroup), contentGroups.contGroup);
          }
        }

        if (customDimensions) {
          Sefaria.track._tracker.trackScreenViewWithCustomDimensionValues(page, customDimensions);
        } else {
          Sefaria.track._tracker.trackScreenView(page);
        }

          //TODO make sure this both sets the screen and sends the screen
      },
      /*
      setPrimaryCategory: function(category_name) {
          primary cat. for commentaries it's second cat + " Commentary"


          Sefaria.track._tracker.trackContentGroup(1,category_name);
      },
      setSecondaryCategory: function(category_name) {
          if it exists, secondary cat

          Sefaria.track._tracker.trackContentGroup(2,category_name);
      },
      setContentLanguage: function(language) {
          hebrew, english, bilingual

          Sefaria.track._tracker.trackContentGroup(5,category_name);
      },
      setNumberOfPanels: function(val) {
          1 if text
          2 if text and commentary

          ga('set', 'dimension1', val);
      },
      setBookName: function(val) {
          current book name

          ga('set', 'dimension2', val);
          Sefaria.track._tracker.trackContentGroup(3,category_name);
          Sefaria.track._tracker.trackEventWithCustomDimensionValues()
      },
      setRef: function(val) {
          current ref you're looking at
          ga('set', 'dimension3', val);
      },
      setVersionTitle: function(val) {
          ga('set', 'dimension4', val);
      },
      setPageType: function(val) {
          text toc, Text, Text and Connections, navigation, search
          ga('set', 'dimension5', val);
      },
      */
      sheets: function(action, label) {
          Sefaria.site.track.event("Sheets", action, label);
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
    if (!haystack) {
      return -1
    } //For parity of behavior w/ JQuery inArray
    var index = -1;
    for (var i = 0; i < haystack.length; i++) {
      if (haystack[i] === needle) {
        index = i;
        break;
      }
    }
    return index;
  },
  getColumnLanguageWithContent(colLang,en,he) {
    let newColLang = colLang;

    if (newColLang == "bilingual") {
      if (en.trim() != "" && he.trim() == "") {
        newColLang = "english";
      } else if (en.trim() == "") newColLang  = "hebrew";
    }

    if (newColLang == "english")
      newColLang = en.trim() != "" ? "english" : "hebrew";
    else if (newColLang == "hebrew")
      newColLang = he.trim() != "" || en.trim() == "" ? "hebrew" : "english"; //make sure when there's no content it's hebrew
    return newColLang;
  }
};


Sefaria.hebrew = {
  hebrewNumerals: {
    "\u05D0": 1,
    "\u05D1": 2,
    "\u05D2": 3,
    "\u05D3": 4,
    "\u05D4": 5,
    "\u05D5": 6,
    "\u05D6": 7,
    "\u05D7": 8,
    "\u05D8": 9,
    "\u05D9": 10,
    "\u05D8\u05D5": 15,
    "\u05D8\u05D6": 16,
    "\u05DB": 20,
    "\u05DC": 30,
    "\u05DE": 40,
    "\u05E0": 50,
    "\u05E1": 60,
    "\u05E2": 70,
    "\u05E4": 80,
    "\u05E6": 90,
    "\u05E7": 100,
    "\u05E8": 200,
    "\u05E9": 300,
    "\u05EA": 400,
    "\u05EA\u05E7": 500,
    "\u05EA\u05E8": 600,
    "\u05EA\u05E9": 700,
    "\u05EA\u05EA": 800,
    1: "\u05D0",
    2: "\u05D1",
    3: "\u05D2",
    4: "\u05D3",
    5: "\u05D4",
    6: "\u05D5",
    7: "\u05D6",
    8: "\u05D7",
    9: "\u05D8",
    10: "\u05D9",
    15: "\u05D8\u05D5",
    16: "\u05D8\u05D6",
    20: "\u05DB",
    30: "\u05DC",
    40: "\u05DE",
    50: "\u05E0",
    60: "\u05E1",
    70: "\u05E2",
    80: "\u05E4",
    90: "\u05E6",
    100: "\u05E7",
    200: "\u05E8",
    300: "\u05E9",
    400: "\u05EA",
    500: "\u05EA\u05E7",
    600: "\u05EA\u05E8",
    700: "\u05EA\u05E9",
    800: "\u05EA\u05EA"
  },
  decodeHebrewNumeral: function(h) {
    // Takes a string representing a Hebrew numeral and returns it integer value.
    var values = Sefaria.hebrew.hebrewNumerals;

    if (h === values[15] || h === values[16]) {
      return values[h];
    }

    var n = 0
    for (c in h) {
      n += values[h[c]];
    }

    return n;
  },
  encodeHebrewNumeral: function(n) {
    // Takes an integer and returns a string encoding it as a Hebrew numeral.
    if (n >= 900) {
      return n;
    }

    var values = Sefaria.hebrew.hebrewNumerals;

    if (n === 15 || n === 16) {
      return values[n];
    }

    var heb = "";
    if (n >= 100) {
      var hundreds = n - (n % 100);
      heb += values[hundreds];
      n -= hundreds;
    }
    if (n >= 10) {
      var tens = n - (n % 10);
      heb += values[tens];
      n -= tens;
    }

    if (n > 0) {
      heb += values[n];
    }

    return heb;
  },
  encodeHebrewDaf: function(daf, form) {
    // Ruturns Hebrew daf strings from "32b"
    //if not in form of 32b, returns null
    var form = form || "short"
    var n = parseInt(daf.slice(0,-1));
    var a = daf.slice(-1);
    if (a != 'a' && a != 'b')
      return null; //ERROR
    if (form === "short") {
      a = {a: ".", b: ":"}[a];
      return Sefaria.hebrew.encodeHebrewNumeral(n) + a;
    }
    else if (form === "long"){
      a = {a: 1, b: 2}[a];
      return Sefaria.hebrew.encodeHebrewNumeral(n) + " " + Sefaria.hebrew.encodeHebrewNumeral(a);
    }
  },
  stripNikkud: function(rawString) {
    return rawString.replace(/[\u0591-\u05C7]/g,"");
  },
  isHebrew: function(text) {
    // Returns true if text is (mostly) Hebrew
    // Examines up to the first 60 characters, ignoring punctuation and numbers
    // 60 is needed to cover cases where a Hebrew text starts with 31 chars like: <big><strong>גמ׳</strong></big>
    var heCount = 0;
    var enCount = 0;
    var punctuationRE = /[0-9 .,'"?!;:\-=@#$%^&*()/<>]/;

    for (var i = 0; i < Math.min(60, text.length); i++) {
      if (punctuationRE.test(text[i])) { continue; }
      if ((text.charCodeAt(i) > 0x590) && (text.charCodeAt(i) < 0x5FF)) {
        heCount++;
      } else {
        enCount++;
      }
    }

    return (heCount >= enCount);
  },
  containsHebrew: function(text) {
    // Returns true if there are any Hebrew characters in text
    for (var i = 0; i < text.length; i++) {
      if ((text.charCodeAt(i) > 0x590) && (text.charCodeAt(i) < 0x5FF)) {
        return true;
      }
    }
    return false;
  },
  hebrewPlural: function(s) {
    var known = {
      "Daf":      "Dappim",
      "Mitzvah":  "Mitzvot",
      "Mitsva":   "Mitzvot",
      "Mesechet": "Mesechtot",
      "Perek":    "Perokim",
      "Siman":    "Simanim",
      "Seif":     "Seifim",
      "Se'if":    "Se'ifim",
      "Mishnah":  "Mishnayot",
      "Mishna":   "Mishnayot",
      "Chelek":   "Chelekim",
      "Parasha":  "Parshiot",
      "Parsha":   "Parshiot",
      "Pasuk":    "Psukim",
      "Midrash":  "Midrashim",
      "Aliyah":   "Aliyot"
    };

    return (s in known ? known[s] : s + "s");
  },
  intToDaf: function(i) {
    i += 1;
    daf = Math.ceil(i/2);
    return daf + (i%2 ? "a" : "b");
  },
  dafToInt: function(daf) {
    amud = daf.slice(-1)
    i = parseInt(daf.slice(0, -1)) - 1;
    i = amud == "a" ? i * 2 : i*2 +1;
    return i;
  }
};


Sefaria.hebrewCategory = function(cat) {
  // Returns a string translating `cat` into Hebrew.
  var categories = {
    "Torah": "תורה",
    "Tanakh": 'תנ"ך',
    "Tanakh": 'תנ"ך',
    "Prophets": "נביאים",
    "Writings": "כתובים",
    "Commentary": "מפרשים",
    "Quoting Commentary": "פרשנות מצטטת",
    "Targum": "תרגומים",
    "Mishnah": "משנה",
    "Tosefta": "תוספתא",
    "Talmud": "תלמוד",
    "Bavli": "בבלי",
    "Yerushalmi": "ירושלמי",
    "Rif": 'רי"ף',
    "Kabbalah": "קבלה",
    "Halakha": "הלכה",
    "Halakhah": "הלכה",
    "Midrash": "מדרש",
    "Aggadic Midrash": "מדרש אגדה",
    "Halachic Midrash": "מדרש הלכה",
    "Midrash Rabbah": "מדרש רבה",
    "Responsa": 'שו"ת',
    "Rashba": 'רשב"א',
    "Rambam": 'רמב"ם',
    "Other": "אחר",
    "Siddur": "סידור",
    "Liturgy": "תפילה",
    "Piyutim": "פיוטים",
    "Musar": "ספרי מוסר",
    "Chasidut": "חסידות",
    "Parshanut": "פרשנות",
    "Philosophy": "מחשבת ישראל",
    "Apocrypha": "ספרים חיצונים",
    "Modern Works": "עבודות מודרניות",
    "Seder Zeraim": "סדר זרעים",
    "Seder Moed": "סדר מועד",
    "Seder Nashim": "סדר נשים",
    "Seder Nezikin": "סדר נזיקין",
    "Seder Kodashim": "סדר קדשים",
    "Seder Toharot": "סדר טהרות",
    "Seder Tahorot": "סדר טהרות",
    "Dictionary": "מילון",
    "Early Jewish Thought": "מחשבת ישראל קדומה",
    "Minor Tractates": "מסכתות קטנות",
    "Rosh": 'ר"אש',
    "Maharsha": 'מהרשא',
    "Mishneh Torah": "משנה תורה",
    "Shulchan Arukh": "שולחן ערוך",
    "Sheets": "דפי מקורות",
    "Notes": "הערות",
    "Community": "קהילה"
  };
  return cat in categories ? categories[cat] : cat;
};

Sefaria.hebrewSectionName = function(name) {
  sectionNames = {
    "Chapter":          "פרק",
    "Chapters":         "פרקים",
    "Perek":            "פרק",
    "Line":             "שורה",
    "Negative Mitzvah": "מצות לא תעשה",
    "Positive Mitzvah": "מצות עשה",
    "Negative Mitzvot": "מצוות לא תעשה",
    "Positive Mitzvot": "מצוות עשה",
    "Daf":              "דף",
    "Paragraph":        "פסקה",
    "Parsha":           "פרשה",
    "Parasha":          "פרשה",
    "Parashah":         "פרשה",
    "Seif":             "סעיף",
    "Se'if":            "סעיף",
    "Siman":            "סימן",
    "Section":          "חלק",
    "Verse":            "פסוק",
    "Sentence":         "משפט",
    "Sha'ar":           "שער",
    "Gate":             "שער",
    "Comment":          "פירוש",
    "Phrase":           "ביטוי",
    "Mishna":           "משנה",
    "Chelek":           "חלק",
    "Helek":            "חלק",
    "Year":             "שנה",
    "Masechet":         "מסכת",
    "Massechet":        "מסכת",
    "Letter":           "אות",
    "Halacha":          "הלכה",
    "Piska":            "פסקה",
    "Seif Katan":       "סעיף קטן",
    "Se'if Katan":      "סעיף קטן",
    "Volume":           "כרך",
    "Book":             "ספר",
    "Shar":             "שער",
    "Seder":            "סדר",
    "Part":             "חלק",
    "Pasuk":            "פסוק",
    "Sefer":            "ספר",
    "Teshuva":          "תשובה",
    "Teshuvot":         "תשובות",
    "Tosefta":          "תוספתא",
    "Halakhah":         "הלכה",
    "Kovetz":           "קובץ",
    "Path":             "נתיב",
    "Parshah":          "פרשה",
    "Midrash":          "מדרש",
    "Mitzvah":          "מצוה",
    "Tefillah":         "תפילה",
    "Torah":            "תורה",
    "Perush":           "פירוש",
    "Peirush":          "פירוש",
    "Aliyah":           "עלייה",
    "Tikkun":           "תיקון",
    "Tikkunim":         "תיקונים",
    "Hilchot":          "הילכות",
    "Topic":            "נושא",
    "Contents":         "תוכן",
    "Article":          "סעיף",
    "Shoresh":          "שורש",
    "Story":            "סיפור",
    "Remez":            "רמז"
  };
  return name in sectionNames ? sectionNames[name] : name;
};


Sefaria.palette = {
  colors: {
    darkteal: "#004e5f",
    raspberry: "#7c406f",
    green: "#5d956f",
    paleblue: "#9ab8cb",
    blue: "#4871bf",
    orange: "#cb6158",
    lightpink: "#c7a7b4",
    darkblue: "#073570",
    darkpink: "#ab4e66",
    lavender: "#7f85a9",
    yellow: "#ccb479",
    purple: "#594176",
    lightblue: "#5a99b7",
    lightgreen: "#97b386",
    red: "#802f3e",
    teal: "#00827f",
    system: "#142b51"
  }
};
Sefaria.palette.categoryColors = {
  "All":                Sefaria.palette.colors.system,
  "Commentary":         Sefaria.palette.colors.blue,
  "Tanakh":             Sefaria.palette.colors.darkteal,
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
