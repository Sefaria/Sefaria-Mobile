import { Alert, Platform } from 'react-native';
//import { GoogleAnalyticsTracker } from 'react-native-google-analytics-bridge'; //https://github.com/idehub/react-native-google-analytics-bridge/blob/master/README.md
const ZipArchive  = require('react-native-zip-archive'); //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
import AsyncStorage from '@react-native-community/async-storage';
import VersionNumber from 'react-native-version-number';
import RNFB from 'rn-fetch-blob';
import RNFS from 'react-native-fs';
import { Search } from '@sefaria/search';
import sanitizeHtml from 'sanitize-html'
import Downloader from './downloader';
import Api from './api';
import History from './history';
import Packages from './packages';
import LinkContent from './LinkContent';
import { initAsyncStorage } from './ReduxStore';
import { Filter } from './Filter';
import URL from 'url-parse';
import firebase from 'react-native-firebase';


const ERRORS = {
  NOT_OFFLINE: 1,
  NO_CONTEXT: 2,
  CANT_GET_SECTION_FROM_DATA: "Couldn't find section in depth 3+ text",
};

Sefaria = {
  _auth: {},
  init: async function() {
    console.log("YO");
    // numTimesOpenedApp
    const numTimesOpenedApp = await AsyncStorage.getItem("numTimesOpenedApp");
    Sefaria.numTimesOpenedApp = !!numTimesOpenedApp ? parseInt(numTimesOpenedApp) : 0;
    if (Sefaria.numTimesOpenedApp === 0) {
      AsyncStorage.setItem('lastSyncTime', Sefaria.util.epoch_time());
    }
    AsyncStorage.setItem("numTimesOpenedApp", JSON.stringify(Sefaria.numTimesOpenedApp + 1));
    Sefaria.lastAppUpdateTime = await Sefaria.getLastAppUpdateTime();
    await Sefaria._loadTOC();
    await Sefaria.history._loadHistoryItems();
    await initAsyncStorage();
  },
  postInitSearch: function() {
    return Sefaria._loadRecentQueries()
      .then(Sefaria._loadSearchTOC);
  },
  postInit: function() {
    return Sefaria.getGalusStatus()
      .then(Sefaria._loadCalendar)
      .then(Sefaria._loadPeople)
      .then(Sefaria.history._loadSavedItems)
      .then(Sefaria._loadHebrewCategories)
      .then(Sefaria.packages._load)
      .then(Sefaria.downloader.init);  // downloader init is dependent on packages
  },
  getLastAppUpdateTime: async function() {
    // returns epoch time of last time the app was updated. used to compare if sources files are newer than downloaded files
    const lastAppVersionString = await AsyncStorage.getItem("lastAppVersionString");
    const currAppVersionString = VersionNumber.appVersion;
    let lastAppUpdateTime;
    if (lastAppVersionString !== currAppVersionString) {
      // app has updated
      lastAppUpdateTime = (new Date).getTime();
      AsyncStorage.setItem("lastAppUpdateTime", JSON.stringify(lastAppUpdateTime));
      AsyncStorage.setItem("lastAppVersionString", VersionNumber.appVersion);
    } else {
      // get stored time
      lastAppUpdateTime = await AsyncStorage.getItem("lastAppUpdateTime");
      lastAppUpdateTime = !!lastAppUpdateTime ? parseInt(lastAppUpdateTime) : 0;
    }
    return lastAppUpdateTime;
  },
  /*
  if `context` and you're using API, only return section no matter what. default is true
  versions is object with keys { en, he } specifying version titles of requested ref
  */
  data: function(ref, context, versions) {
    if (typeof context === "undefined") { context = true; }
    return new Promise(function(resolve, reject) {
      const bookRefStem  = Sefaria.textTitleForRef(ref);
      Sefaria.loadOfflineFile(ref, context, versions)
        .then(data => { Sefaria.processFileData(ref, data).then(resolve); })
        .catch(error => {
          if (error === ERRORS.NOT_OFFLINE) {
            Sefaria.loadFromApi(ref, context, versions, bookRefStem)
              .then(data => { Sefaria.processApiData(ref, context, versions, data).then(resolve); })
              .catch(error => {
                if (error.error === ERRORS.NO_CONTEXT) {
                  resolve(error.data);
                } else {
                  reject(error);
                }
              })
          } else {
            reject(error);
          }
        })
    });
  },
  getSectionFromJsonData: function(ref, data) {
    if ("content" in data) {
      return data;
    } else {
      // If the data file represents multiple sections, pick the appropriate one to return
      const refUpOne = Sefaria.refUpOne(ref);
      //console.log(ref, data.sections);
      if (ref in data.sections) {
        return data.sections[ref];
      } else if (refUpOne in data.sections) {
        return data.sections[refUpOne];
      } else {
        return;
      }
    }
  },
  refUpOne: function(ref) {
    //return ref up one level, assuming you can
    return ref.lastIndexOf(":") !== -1 ? ref.slice(0, ref.lastIndexOf(":")) : ref;
  },
  processFileData: function(ref, data) {
    return new Promise((resolve, reject) => {
      // Store data in in memory cache if it's not there already
      const result = Sefaria.getSectionFromJsonData(ref, data);
      if (!result) { reject(ERRORS.CANT_GET_SECTION_FROM_DATA); }
      // Annotate link objects with useful fields not included in export
      result.content.forEach(segment => {
        if ("links" in segment) {
          segment.links.map(link => {
            link.textTitle = Sefaria.textTitleForRef(link.sourceRef);
            if (!("category" in link)) {
              link.category = Sefaria.categoryForTitle(link.textTitle);
            }
          });
        }
      });
      result.requestedRef   = ref;
      result.isSectionLevel = (ref === result.sectionRef);
      Sefaria.cacheVersionInfo(result, true);
      resolve(result);
    });
  },
  processApiData: function(ref, context, versions, data) {
    return new Promise((resolve, reject) => {
      Sefaria.api.textCache(ref, context, versions, data);
      Sefaria.cacheVersionInfo(data, true);
      //console.log(data);
      resolve(data);
    });
  },
  shouldLoadFromApi: function(versions) {
    // there are currently two cases where we load from API even if the index is downloaded
    // 1) debugNoLibrary is true 2) you're loading a non-default version
    return (!!versions && Object.keys(versions).length !== 0) || Sefaria.downloader._data.debugNoLibrary;
  },
  loadOfflineFile: function(ref, context, versions) {
    return new Promise(function(resolve, reject) {
      var fileNameStem = ref.split(":")[0];
      var bookRefStem  = Sefaria.textTitleForRef(ref);
      //if you want to open a specific version, there is no json file. force an api call instead
      const shouldLoadFromApi = Sefaria.shouldLoadFromApi(versions);
      var jsonPath     = shouldLoadFromApi ? "" : Sefaria._JSONSourcePath(fileNameStem);
      var zipPath      = shouldLoadFromApi ? "" : Sefaria._zipSourcePath(bookRefStem);
      // Pull data from in memory cache if available
      if (jsonPath in Sefaria._jsonData) {
        resolve(Sefaria._jsonData[jsonPath]);
        return;
      }

      const preResolve = data => {
        if (!(jsonPath in Sefaria._jsonData)) {
          Sefaria._jsonData[jsonPath] = data;
        }
        resolve(data);
      };

      Sefaria._loadJSON(jsonPath)
        .then(preResolve)
        .catch(() => {
          // If there was en error, check that we have the zip file downloaded
          RNFB.fs.exists(zipPath)
            .then(exists => {
              if (exists) {
                Sefaria._unzip(zipPath)
                  .then(path => {
                    Sefaria._loadJSON(jsonPath)
                      .then(preResolve)
                      .catch(() => {
                        // Now that the file is unzipped, if there was an error assume we have a depth 1 text
                        var depth1FilenameStem = fileNameStem.substr(0, fileNameStem.lastIndexOf(" "));
                        var depth1JSONPath = Sefaria._JSONSourcePath(depth1FilenameStem);
                        Sefaria._loadJSON(depth1JSONPath)
                          .then(preResolve)
                          .catch(() => {
                            console.error("Error loading JSON file: " + jsonPath + " OR " + depth1JSONPath);
                          });
                      });
                  });
              } else {
                reject(ERRORS.NOT_OFFLINE);
              }
            });
        });
    });
  },
  loadFromApi: function(ref, context, versions, bookRefStem) {
    return new Promise((resolve, reject) => {
      // The zip doesn't exist yet, so make an API call
      const cacheValue = Sefaria.api.textCache(ref, context, versions);
      if (cacheValue) {
        // Don't check the API cahce until we've checked for a local file, because the API
        // cache may be left in a state with text but without links.
        resolve(cacheValue);
      }
      Sefaria.api._text(ref, { context, versions })
        .then(data => {
          if (context) { resolve(data); }
          else         { reject({error: ERRORS.NO_CONTEXT, data}); }
        })
        .catch(function(error) {
          //console.error("Error with API: ", Sefaria.api._toURL(ref, false, 'text', true));
          reject(error);
      });
      Sefaria.downloader.prioritizeDownload(bookRefStem);
    });
  },
  _jsonData: {}, // in memory cache for JSON data
  _apiData: {},  // in memory cache for API data
  textTitleForRef: function(ref) {
    // Returns the book title named in `ref` by examining the list of known book titles.
    for (let i = ref.length; i >= 0; i--) {
      book = ref.slice(0, i);
      if (book in Sefaria.booksDict) {
        return book;
      }
    }
    return null;
  },
  refToUrl: ref => {
    const url = `https://www.sefaria.org/${ref.replace(/ /g, '_').replace(/_(?=[0-9:]+$)/,'.').replace(/:/g,'.')}`
    return url;
  },
  urlToRef: url => {
    // url: tref as it would appear in a url
    url = url.replace(/_/g, ' ');
    const title = Sefaria.textTitleForRef(url);
    if (!title) { return { ref: url, title }; }
    // regexp to replace the dot immediately following the title
    const spaceReplacer = new RegExp("^" + Sefaria.util.regexEscape(`${title}.`));
    const ref = url.replace(spaceReplacer, `${title} `).replace(/\./g, ':');
    return { ref, title };
  },
  categoryForTitle: function(title, isSheet) {
    const cats = Sefaria.categoriesForTitle(title, isSheet);
    if (!cats) { return null; }
    let cat = cats[0];
    if (cats.includes("Commentary")) {
      cat = "Commentary";
    } else if (cats.includes("Targum")) {
      cat = "Targum";
    }
    // Kept for backwards compatibility of pre-commentary refactor downloaded data
    return cat == "Commentary2" ? "Commentary" : cat;
  },
  categoriesForTitle: function(title, isSheet) {
    if (isSheet) { return ["Sheets"]; }
    const index = Sefaria.index(title);
    if (!index) { return null;}
    return index.categories;
  },
  categoryForRef: function(ref) {
    return Sefaria.categoryForTitle(Sefaria.textTitleForRef(ref));
  },
  getTitle: function(ref, heRef, isCommentary, isHe) {
      const bookTitle = Sefaria.textTitleForRef(ref);
      const collectiveTitles = Sefaria.collectiveTitlesDict[bookTitle];
      if (collectiveTitles && isCommentary) {
        if (isHe) { return collectiveTitles.he; }
        else      { return collectiveTitles.en; }
      }
      if (isHe) {
        var engTitle = ref; //backwards compatibility for how this function was originally written
        ref = heRef;
        var engSeg = engTitle.split(":")[1];
        var engFileNameStem = engTitle.split(":")[0];
        var engSec = engFileNameStem.substring(engFileNameStem.lastIndexOf(" ")+1,engFileNameStem.length);

        var heDaf = Sefaria.hebrew.encodeHebrewDaf(engSec,"long");
        if (heDaf != null) {
          var fullHeDaf = heDaf + ":" + Sefaria.hebrew.encodeHebrewNumeral(engSeg);
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
  toHeSegmentRef: function(heSectionRef, enSegmentRef) {
    if (!heSectionRef) {
      try {
        // try to convert with some heuristics
        const enTitle = Sefaria.textTitleForRef(enSegmentRef);
        if (!enTitle) { return enSegmentRef; }
        const enSectionStr = enSegmentRef.replace(enTitle + ' ', '');
        const heTitle = Sefaria.index(enTitle).heTitle;
        if (enSectionStr.match(/(?:\d+:)*\d+(?:\-(?:\d+:)*\d)?$/)) {
          // simple text
          const heStartSections = enSectionStr.split('-')[0].split(':').map(s => Sefaria.hebrew.encodeHebrewNumeral(parseInt(s))).join(':');
          let heEndSections = '';
          if (enSectionStr.indexOf('-') !== -1) {
            heEndSections = '-' + enSectionStr.split('-')[1].split(':').map(s => Sefaria.hebrew.encodeHebrewNumeral(parseInt(s))).join(':');
          }
          return `${heTitle} ${heStartSections}${heEndSections}`;
        }
        return enSegmentRef;
      } catch (e) {
        return enSegmentRef;
      }
    }
    const enSections = enSegmentRef.substring(enSegmentRef.lastIndexOf(" ")+1).split(":");
    const heSections = heSectionRef.substring(heSectionRef.lastIndexOf(" ")+1).split(":");
    if (enSections.length === heSections.length) { return heSectionRef; }  // already segment level
    else if (heSections.length + 1 === enSections.length) {
      const segNum = parseInt(enSections[enSections.length-1]);
      if (!segNum) { return heSectionRef; }
      return `${heSectionRef}:${Sefaria.hebrew.encodeHebrewNumeral(segNum)}׳`
    } else {
      console.log("weirdness", heSectionRef, enSegmentRef);
      return heSectionRef;
    }
  },
  booksDict: {},
  collectiveTitlesDict: {},
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
    const index = Sefaria.index(text);
    if (!index) { return false; } // default to false
    // removing Talmud for now because cts mode is broken
    return [].indexOf(index.categories[0]) != -1
  },
  canHaveAliyot: function(text) {
    const index = Sefaria.index(text);
    if (!index) { return false; }
    return index.categories.length === 2 && index.categories[1] === "Torah";
  },
  _loadTOC: function() {
    return Sefaria.util.openFileInSources("toc.json").then(data => {
      console.log("loaded successfully");
      Sefaria.toc = data;
      Sefaria._cacheIndexFromToc(data, true);
    });
  },
  search_toc: null,
  _loadSearchTOC: function() {
    return Sefaria.util.openFileInSources('search_toc.json').then(data => {
      Sefaria.search_toc = data;
    });
  },
  _loadHebrewCategories: function() {
    return Sefaria.util.openFileInSources("hebrew_categories.json").then(data => {
      Sefaria.hebrewCategories = data;
      Sefaria.englishCategories = {}; // used for classifying cats in autocomplete
      Object.entries(data).forEach(([key, value]) => {
        Sefaria.englishCategories[value] = 1;
      });
    });
  },
  _loadPeople: function() {
    return Sefaria.util.openFileInSources("people.json").then(data => {
      Sefaria.people = data;
    });
  },
  //for debugging
  _removeBook: function(toc, book) {
    findCats = function(toc, book, cats) {
      for (let i = 0; i < toc.length; i++) {
        if ('title' in toc[i]) {
          if (toc[i].title == book) {
            cats.push(i);
            return cats;
          }
        } else {
          let newCats = cats.slice(0);
          newCats.push(i);
          let ret = findCats(toc[i].contents, book, newCats);
          if (ret) {
            return ret;
          }
        }
      }
    }
    var cats = findCats(toc, book, []);
    var newToc = Sefaria.util.clone(toc);
    var tempToc = newToc;
    for (var j = 0; j < cats.length-1; j++) {
      tempToc = tempToc[cats[j]].contents;
    }
    tempToc.splice(cats[cats.length-1],1);
    return newToc;
  },
  _cacheIndexFromToc: function(toc, isTopLevel=false) {
    // Unpacks contents of Sefaria.toc into index cache.
    for (var i = 0; i < toc.length; i++) {
      if ("category" in toc[i]) {
        if (isTopLevel) { Sefaria.topLevelCategories.push(toc[i].category); }
        Sefaria._cacheIndexFromToc(toc[i].contents)
      } else {
        Sefaria.index(toc[i].title, toc[i]);
        Sefaria.booksDict[toc[i].title] = 1;
        if (toc[i].collectiveTitle) {
          Sefaria.collectiveTitlesDict[toc[i].title] = {en: toc[i].collectiveTitle, he: toc[i].heCollectiveTitle};
        }
      }
    }
  },
  topLevelCategories: [],  // useful for ordering categories in linkSummary
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
  _versionInfo: {},
  cacheVersionInfo: function(data, isSection) {
    //isSection = true if data has `sectionRef`. false if data has `title`
    attrs = ['versionTitle','heVersionTitle','versionNotes','heVersionNotes','license','heLicense','versionSource','heVersionSource','versionTitleInHebrew','heVersionTitleInHebrew','versionNotesInHebrew','heVersionNotesInHebrew'];
    cacheKey = isSection ? data.sectionRef : data.title;
    Sefaria._versionInfo[cacheKey] = {};
    attrs.map((attr)=>{
      Sefaria._versionInfo[cacheKey][attr] = data[attr];
    });
    //console.log("SETTING VERSION INFO", cacheKey, isSection,Sefaria._versionInfo[cacheKey]);
  },
  versionInfo: function(ref, title, vlang) {
    let versionInfo = {};
    let sectionInfo = Sefaria._versionInfo[ref];
    if (!sectionInfo) sectionInfo = {};
    let indexInfo = Sefaria._versionInfo[title];
    if (!indexInfo) indexInfo = {};
    attrs = ['versionTitle', 'versionTitleInHebrew', 'versionNotes', 'versionNotesInHebrew', 'license', 'versionSource'];
    let allFieldsUndefined = true;
    attrs.map((attr)=>{
      //if 'he', prepend 'he' to attr
      const enAttr = attr;
      if (vlang === 'hebrew') { attr = 'he' + attr[0].toUpperCase() + attr.substring(1); }
      versionInfo[enAttr] = !!sectionInfo[attr] ? sectionInfo[attr] : indexInfo[attr];
      if (!!versionInfo[enAttr]) { allFieldsUndefined = false; }
    });
    if (allFieldsUndefined) { versionInfo = null; }

    return versionInfo;
  },
  commentaryList: function(title) {
    // Returns the list of commentaries for 'title' which are found in Sefaria.toc
    var index = this.index(title);
    if (!index) { return []; }
    var cats = [index.categories[0], "Commentary"]; //NOTE backwards compatibility
    var isCommentaryRefactor = this.isTOCCommentaryRefactor();
    if (isCommentaryRefactor) {
      cats = [index.categories[0]];
    }
    var branch = this.tocItemsByCategories(cats);


    var commentariesInBranch = function(title, branch) {
      // Recursively walk a branch of TOC, return a list of all commentaries found on `title`.
      var results = [];
      for (var i=0; i < branch.length; i++) {
        if (branch[i].title) {
          if (isCommentaryRefactor) {
            if (branch[i].dependence === "Commentary" && !!branch[i].base_text_titles && branch[i].base_text_titles.includes(title)) {
              results.push(branch[i]);
            }
          } else {
            var split = branch[i].title.split(" on ");
            if (split.length == 2 && split[1] === title) {
              results.push(branch[i]);
            }
          }

        } else {
          results = results.concat(commentariesInBranch(title, branch[i].contents));
        }
      }
      return results;
    };
    let comms = commentariesInBranch(title, branch);
    //console.log("isComms", isCommentaryRefactor, "comms",comms);
    return comms;
  },
  isTOCCommentaryRefactor: function() {
    var list = Sefaria.toc;
    var leafSeen = false; // once we see the first leaf, we can check for `dependence` field
    while (!leafSeen) {
      if (list[0].hasOwnProperty('title')) {
        leafSeen = true;
        return list[0].hasOwnProperty('dependence');
      } else {
        list = list[0].contents;
      }
    }
    return false;
  },
  _commentatorListBySection: {},
  commentatorListBySection: function(ref) {
    return Sefaria._commentatorListBySection[ref];
  },
  cacheCommentatorListBySection: function(ref, data) {
    if (ref in Sefaria._commentatorListBySection) { return; }
    const en = new Set();
    const he = new Set();
    for (let i = 0; i < data.length; i++) {
      if (!("links" in data[i])) { continue; }
      for (let j =0; j < data[i].links.length; j++) {
        const link = data[i].links[j];
        if (link.category === "Commentary") {
          const title = Sefaria.getTitle(link.sourceRef, link.sourceHeRef, true, false);
          en.add(title);
          he.add(Sefaria.getTitle(link.sourceRef, link.sourceHeRef, true, true));
        }
      }
    }
    commentators = {
      en: [...en],
      he: [...he]
    }
    Sefaria._commentatorListBySection[ref] = commentators;
  },
  _textToc: {},
  textToc: function(title) {
    return new Promise((resolve, reject) => {
      const resolver = function(data) {
        data = Sefaria._fixTalmudAltStructAddressTypes(data);
        Sefaria._textToc[title] = data;
        Sefaria.cacheVersionInfo(data,false);
        resolve(data);
      };
      if (title in Sefaria._textToc) {
        resolve(Sefaria._textToc[title]);
      } else {
        const path = Sefaria._JSONSourcePath(title + "_index");
        Sefaria
        ._loadJSON(path)
        .then(resolver)
        .catch(()=>{Sefaria.api._request(title, 'index', true, {}).then(resolver)});
      }
    });
  },
  _fixTalmudAltStructAddressTypes: function(textToc) {
    // This is a bandaid on what may or may not be bad data. For Talmud alt struct "Chapter", we want to display
    // sections with Talmud address type, but the data current lists them as Integer.
    if (textToc.categories.length == 3 &&
        textToc.categories[0] == "Talmud" &&
        textToc.categories[1] == "Bavli" &&
        textToc.categories[2] != "Guides") {

      for (var i = 0; i < textToc.alts.Chapters.nodes.length; i++) {
        textToc.alts.Chapters.nodes[i].addressTypes = ["Talmud"];
      }
    }
    return textToc;
  },
  reformatTalmudContent(segment) {
    return segment
      .replace(/<span\s+class="gemarra-regular">(.+?)<\/span>/g, '<gemarraregular>$1</gemarraregular>')
      .replace(/<span\s+class="gemarra-italic">(.+?)<\/span>/g, '<gemarraitalic>$1</gemarraitalic>')
      .replace(/<span\s+class="it-text">(.+?)<\/span>/g, '<i>$1</i>')
  },
  categoryAttribution: function(categories) {
    var attributions = [
      {
        categories: ["Talmud", "Bavli"],
        english: "The William Davidson Talmud",
        hebrew: "תלמוד מהדורת ויליאם דוידסון",
        link: "https://www.sefaria.org/william-davidson-talmud"
      }
    ];
    var attribution = null;
    for (var i = 0; i < attributions.length; i++) {
      if (categories && categories.length >= attributions[i].categories.length &&
        Sefaria.util.compareArrays(attributions[i].categories, categories.slice(0, attributions[i].categories.length))) {
        attribution = attributions[i];
        break;
      }
    }
    return attribution;
  },
  calendar: null,
  _loadCalendar: function() {
    return Sefaria.util.openFileInSources("calendar.json").then(data => {
      Sefaria.calendar = data;
    });
  },
  galusOrIsrael: null,
  getGalusStatus: function() {
    return fetch('https://www.geoip-db.com/json')
      .then(res => res.json())
      .then(data => {
        if (data.country_code == "IL") {
          Sefaria.galusOrIsrael = "israel"
        }
        else {
          Sefaria.galusOrIsrael = "diaspora"
        }
      })
        .catch(()=> {Sefaria.galusOrIsrael = "diaspora";})
  },


  getCalendars: function() {
    if (!Sefaria.calendar) {
      return {
        parasha: null,
        dafYomi: null,
        p929: null,
        rambam: null,
        mishnah: null,
      };
    }
    const dateString = Sefaria._dateString();
    return {
      parasha: Sefaria.parasha(),
      dafYomi: Sefaria.calendar.dafyomi[dateString],
      p929:  Sefaria.calendar["929"][dateString],
      rambam: Sefaria.calendar.rambam[dateString],
      mishnah: Sefaria.calendar.mishnah[dateString],
    }
  },
  parasha: function() {
    // Returns an object representing this week's Parashah
    let parasha;
    let weekOffset = 1;

    //See if there's a Parshah this week -- If not return next week's, if not return the week after that... אא"וו
    //TODO parasha currently updates on Shabbat. For users who are mchalel shabbat, they will get the wrong parasha. do we care?
    if (!Sefaria.calendar) { return null; }
    while (!parasha) {
      let date = new Date();
      date.setDate(date.getDate() + (6 - 1 - date.getDay() + 7) % 7 + weekOffset);
      dateString = Sefaria._dateString(date);
      parasha = Sefaria.calendar.parasha[dateString][Sefaria.galusOrIsrael];
      weekOffset += 1;
    }
    return Sefaria.calendar ? parasha : null;
  },
  _dateString: function(date) {
    // Returns of string in the format "DD/MM/YYYY" for either `date` or today.
    var date = typeof date === 'undefined' ? new Date() : date;
    var day = date.getDate();
    var month = date.getMonth()+1; //January is 0!
    var year = date.getFullYear();

    return month + '/' + day + '/' + year;
  },
  saveRecentQuery: function(query, type) {
    //type = ["ref", "book", "person", "toc", "query"]
    const newQuery = {query, type};
    if (Sefaria.recentQueries.length > 0 && Sefaria.recentQueries[0].query === newQuery.query && Sefaria.recentQueries[0].type === newQuery.type) {
      return;  // don't add duplicate queries in a row
    }
    Sefaria.recentQueries.unshift({query, type});
    Sefaria.recentQueries = Sefaria.recentQueries.slice(0,100);
    AsyncStorage.setItem("recentQueries", JSON.stringify(Sefaria.recentQueries)).catch(function(error) {
      console.error("AsyncStorage failed to save: " + error);
    });
  },
  _loadRecentQueries: function() {
    //return AsyncStorage.setItem("recentQueries", JSON.stringify([]));
    return AsyncStorage.getItem("recentQueries").then(function(data) {
      Sefaria.recentQueries = JSON.parse(data) || [];
    });
  },
  _deleteUnzippedFiles: function() {
    return new Promise((resolve, reject) => {
      RNFB.fs.lstat(RNFB.fs.dirs.DocumentDir).then(fileList => {
        for (let f of fileList) {
          if (f.type === 'file' && f.filename.endsWith(".json")) {
            //console.log('deleting', f.path);
            RNFB.fs.unlink(f.path);
          }
        }
        resolve();
      });
    });
  },
  _unzip: function(zipSourcePath) {
    return ZipArchive.unzip(zipSourcePath, RNFB.fs.dirs.DocumentDir);
  },
  _loadJSON: function(JSONSourcePath) {
    return new Promise((resolve, reject) => {
      RNFB.fs.readFile(JSONSourcePath).then(result => {
        try {
          resolve(JSON.parse(result));
          return;
        } catch (e) {
          resolve({}); // if file can't be parsed, fall back to empty object
        }
        resolve(JSON.parse(result));
      }).catch(e => {
        reject(e);
      });
    });
  },
  _JSONSourcePath: function(fileName) {
    return (RNFB.fs.dirs.DocumentDir + "/" + fileName + ".json");
  },
  _zipSourcePath: function(fileName) {
    return (RNFB.fs.dirs.DocumentDir + "/library/" + fileName + ".zip");
  },
  textFromRefData: function(data) {
    // Returns a dictionary of the form {en: "", he: "", sectionRef: ""} that includes a single string with
    // Hebrew and English for `data.requestedRef` found in `data` as returned from Sefaria.data.
    // sectionRef is so that we know which file / api call to make to open this text
    // `data.requestedRef` may be either section or segment level or ranged ref.
    if (data.isSectionLevel) {
      let enText = "", heText = "";
      for (let i = 0; i < data.content.length; i++) {
        let item = data.content[i];
        if (typeof item.text === "string") enText += item.text + " ";
        if (typeof item.he === "string") heText += item.he + " ";
      }
      return new LinkContent(enText, heText, data.sectionRef);
    } else {
      let segmentNumber = data.requestedRef.slice(data.ref.length+1);
      let toSegmentNumber = -1;
      let dashIndex = segmentNumber.indexOf("-");
      if (dashIndex !== -1) {
        toSegmentNumber = parseInt(segmentNumber.slice(dashIndex+1));
        segmentNumber = parseInt(segmentNumber.slice(0, dashIndex));
      } else { segmentNumber = parseInt(segmentNumber); }
      let enText = "";
      let heText = "";
      for (let i = 0; i < data.content.length; i++) {
        let item = data.content[i];
        const currSegNum = parseInt(item.segmentNumber);
        if (currSegNum >= segmentNumber && (toSegmentNumber === -1 || currSegNum <= toSegmentNumber)) {
            if (typeof item.text === "string") enText += item.text + " ";
            if (typeof item.he === "string") heText += item.he + " ";
            if (toSegmentNumber === -1) {
              break; //not a ranged ref
            }
        }
      }
      return new LinkContent(enText, heText, data.sectionRef);
    }
  },
  isGettinToBePurimTime: function() {
    const msInDay = 1000*60*60*24;
    const purimsOfTheFuture = ['Mar 10 2020', 'Feb 26 2021', 'Mar 17 2022', 'Mar 7 2023', 'Mar 24 2024', 'Mar 14 2025', 'Mar 4 2026', 'Mar 24 2027', 'Mar 12 2028', 'Mar 2 2029'];
    const now = new Date();
    for (let potnetialPurim of purimsOfTheFuture) {
      const daysLeft = ((new Date(potnetialPurim)) - now)/msInDay;
      if (daysLeft < 7 && daysLeft > -3) {
        return true;
      }
    }
    return false;
  },
  links: {
    _linkContentLoadingStack: [],
    /* when you switch segments, delete stack and hashtable */
    reset: function() {
      Sefaria.links._linkContentLoadingStack = [];
    },
    load: function(ref) {
      return new Promise((resolve, reject) => {
        Sefaria.loadOfflineFile(ref, false)
        .then(data => {
          // mimic response of links API so that addLinksToText() will work independent of data source
          const sectionData = Sefaria.getSectionFromJsonData(ref, data);
          if (!sectionData) { reject(ERRORS.CANT_GET_SECTION_FROM_DATA); }
          const linkList = (sectionData.content.reduce((accum, segment, segNum) => accum.concat(
            ("links" in segment) ? segment.links.map(link => {
              const index_title = Sefaria.textTitleForRef(link.sourceRef);
              return {
                sourceRef: link.sourceRef,
                sourceHeRef: link.sourceHeRef,
                index_title,
                category: ("category" in link) ? link.category : Sefaria.categoryForTitle(index_title),
                anchorRef: `${ref}:${segNum+1}`,
              }
            }) : []
          ), []));
          resolve(linkList);
        })
        .catch(error => {
          if (error === ERRORS.NOT_OFFLINE) {
            Sefaria.api.links(ref).then(resolve);
          } else { reject(error); }
        })
      });
    },
    addLinksToText: function(text, links) {
      let link_response = new Array(text.length);
      //filter out books not in toc
      links = links.filter((l)=>{
        return l.index_title in Sefaria.booksDict;
      });
      for (let i = 0; i < links.length; i++) {
        let link = links[i];
        let linkSegIndex = parseInt(link.anchorRef.substring(link.anchorRef.lastIndexOf(':') + 1)) - 1;
        if (!linkSegIndex && linkSegIndex !== 0) {
          // try again. assume depth-1 text
          linkSegIndex = parseInt(link.anchorRef.substring(link.anchorRef.lastIndexOf(' ') + 1).trim()) - 1;
        }
        if (!link_response[linkSegIndex]) {
          link_response[linkSegIndex] = [];
        }
        link_response[linkSegIndex].push({
          "category": link.category,
          "sourceRef": link.sourceRef, //.substring(0,link.sourceRef.lastIndexOf(':')),
          "sourceHeRef": link.sourceHeRef, //.substring(0,link.sourceHeRef.lastIndexOf(':')),
          "textTitle": link.index_title,
          "collectiveTitle": link.collectiveTitle ? link.collectiveTitle.en: null,
          "heCollectiveTitle": link.collectiveTitle ? link.collectiveTitle.he : null,
        });
      }
      return text.map((seg,i) => ({
        "segmentNumber": seg.segmentNumber,
        "he": seg.he,
        "text": seg.text,
        "links": link_response[i] ? link_response[i] : []
      }));
    },
    loadLinkData: function(ref, pos, resolveClosure, rejectClosure, runNow) {
       const parseData = function(data) {
        return new Promise(function(resolve, reject) {
          if (data.fromAPI) {
            var result = data.result;
          } else {
            var result = Sefaria.textFromRefData(data);
          }
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
            Sefaria.links.loadLinkData(next.ref, next.pos, null, null, true)
                            .then(next.resolveClosure)
                            .catch(next.rejectClosure);
          }
        });
      };

      if (!runNow) {
        //console.log("Putting in queue:",ref,"Length:",Sefaria.links._linkContentLoadingStack.length);
        Sefaria.links._linkContentLoadingStack.push({
                                                      "ref":ref,
                                                      "pos":pos,
                                                      "resolveClosure":resolveClosure,
                                                      "rejectClosure":rejectClosure
                                                    });
      }
      if (Sefaria.links._linkContentLoadingStack.length == 1 || runNow) {
        //console.log("Starting to load",ref);
        return Sefaria.data(ref, true).then(parseData);
      } else {
        //console.log("Rejecting", ref);
        return new Promise(function(resolve, reject) {
          reject('inQueue');
        })
      }

    },
    linkSummary: function(sectionRef, links=[], menuLanguage) {
      // Returns a categories and sorted summary of `links` with `sectionRef` (used to show empty commentators).
      return new Promise(function(resolve, reject) {
        // Returns an ordered array summarizing the link counts by category and text
        // Takes an array of links which are of the form { "category", "sourceHeRef", "sourceRef", "textTitle"}
        var summary = {"All": {count: 0, books: {}}, "Commentary": {count: 0, books: {}}};

        // Process tempLinks if any
        for (let link of links) {
          if (!link.category) {
            link.category = 'Other';
          }
          // Count Category
          if (link.category in summary) {
            //TODO summary[link.category].count += 1
          } else {
            summary[link.category] = {count: 1, books: {}};
          }
          //TODO summary["All"].count += 1;

          var category = summary[link.category];
          // Count Book
          if (link.textTitle in category.books) {
            category.books[link.textTitle].refSet.add(link.sourceRef);
            category.books[link.textTitle].heRefSet.add(link.sourceHeRef);
          } else {
            var isCommentary = link.category === "Commentary";
            category.books[link.textTitle] =
            {
                count:             1,
                title:             Sefaria.getTitle(link.sourceRef, link.sourceHeRef, isCommentary, false),
                heTitle:           Sefaria.getTitle(link.sourceRef, link.sourceHeRef, isCommentary, true),
                collectiveTitle:   link.collectiveTitle,
                heCollectiveTitle: link.heCollectiveTitle,
                category:          link.category,
                refSet:            new Set([link.sourceRef]), // make sure refs are unique here
                heRefSet:          new Set([link.sourceHeRef]),
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
                refSet:   new Set(),
                heRefSet: new Set(),
              }
            }
          }
        }

        // Convert object into ordered list
        var summaryList = Object.keys(summary).map(function(category) {
          var categoryData = summary[category];
          categoryData.category = category;
          categoryData.refList = [];
          categoryData.heRefList = [];
          categoryData.books = Object.keys(categoryData.books).map(function(book) {
            var bookData = categoryData.books[book];
            return bookData;
          });
          // Sort the books in the category
          categoryData.books.sort(function(a, b) {
            // First sort by predefined "top"
            var topByCategory = {
              "Commentary": ["Rashi", "Ibn Ezra", "Ramban","Tosafot"]
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
            if (menuLanguage === 'english'){
              return a.title > b.title ? 1 : -1;
            }
            // else hebrew
            return a.heTitle > b.heTitle ? 1 : -1;
          });
          return categoryData;
        });

        let allRefs = [];
        let allHeRefs = [];
        const allBooks = [];
        for (let cat of summaryList) {
          for (let book of cat.books) {
            const [bookRefList, bookHeRefList] = Sefaria.links.sortRefsBySections(Array.from(book.refSet), Array.from(book.heRefSet), book.title);
            delete book.refSet;
            delete book.heRefSet;
            book.refList = bookRefList;
            book.heRefList = bookHeRefList;
            if (book.refList.length !== book.heRefList.length) { console.log("MAJOR ISSUES!!", book.refList)}
            book.count = book.refList.length;
            cat.refList = cat.refList.concat(bookRefList);
            cat.heRefList = cat.heRefList.concat(bookHeRefList);
            allRefs = allRefs.concat(bookRefList);
            allHeRefs = allHeRefs.concat(bookHeRefList);
            allBooks.push(book);
          }
          cat.count = cat.refList.length;
        }

        // Sort the categories
        const order = ["Commentary", "Targum", "byCatOrder", "All"];
        const indexByCatOrder = order.indexOf("byCatOrder");
        summaryList.sort(function(a, b) {
          var indexA = order.indexOf(a.category) != -1 ? order.indexOf(a.category) : indexByCatOrder;
          var indexB = order.indexOf(b.category) != -1 ? order.indexOf(b.category) : indexByCatOrder;

          if (indexA === indexByCatOrder && indexB === indexByCatOrder) {
            const aOrder = Sefaria.topLevelCategories.indexOf(a.category);
            const bOrder = Sefaria.topLevelCategories.indexOf(b.category);
            if (aOrder === -1 && bOrder === -1) {
              if (a.category < b.category) { return -1; }
              if (a.category > b.category) { return  1; }
              return 0;
            }
            if (aOrder === -1) { return 1; }
            if (bOrder === -1) { return -1; }

            return aOrder - bOrder;
          }

          return indexA - indexB;

        });

        // Attach data to "All" category in last position
        summaryList[summaryList.length-1].refList = allRefs;
        summaryList[summaryList.length-1].heRefList = allHeRefs;
        summaryList[summaryList.length-1].books = allBooks;
        summaryList[summaryList.length-1].count = allRefs.length;

        // Remove "Commentary" section if it is empty or only contains greyed out items
        if (summaryList[0].books.length == 0) { summaryList = summaryList.slice(1); }

        // Remove "All" section if it's count is zero
        if (summaryList[summaryList.length-1].count == 0) { summaryList = summaryList.slice(0, -1); }
        resolve(summaryList);
      });

    },
    sortRefsBySections(enRefs, heRefs, title) {
      const zip = rows=>rows[0].map((_,c)=>rows.map(row=>row[c]));
      const biRefList = zip([enRefs, heRefs]);
      biRefList.sort((a,b) => {
        try {
          const aSections = a[0].substring(title.length+1).trim().split(':');
          const bSections = b[0].substring(title.length+1).trim().split(':');
          if (aSections.length !== bSections.length) { return 0; }  // not comparable
          for (let iSec = 0; iSec < aSections.length; iSec++) {
            const aInt = parseInt(aSections[iSec]);
            const bInt = parseInt(bSections[iSec]);
            if (aInt !== bInt) { return aInt - bInt; }
          }
          return 0;
        } catch (e) {
          console.log(e);
          return 0;
        }
      });
      return biRefList.reduce((accum, item) => [accum[0].concat([item[0]]), accum[1].concat([item[1]])], [[],[]]);
    },
  },
  track: {
      // Helper functions for event tracking (with Google Analytics and Mixpanel)
      init: function() {
        firebase.analytics().setAnalyticsCollectionEnabled(true);
      },

      setScreen: function(currentScreen, currentScreenClass) {
        firebase.analytics().setCurrentScreen(currentScreen, currentScreenClass);
      },

      event: function(event, params) {
        firebase.analytics().logEvent(event, params)
      },

      pageview: function(page, customDimensions, contentGroups) {

        // TODO: This seems to fire every time a new ref comes in or out of view and doesn't seem to give super rich data is this by design?


        /*
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

         */
      },
    }
};

Sefaria.util = {
  object_equals: function(a, b) {
    // simple object equality assuming values are primitive. see here
    // http://adripofjavascript.com/blog/drips/object-equality-in-javascript.html
    if ((typeof a) !== (typeof b))      { return false; }
    if ((a === null && b !== null) || (a !== null && b === null))
                                        { return false; }
    const aProps = Object.getOwnPropertyNames(a);
    const bProps = Object.getOwnPropertyNames(b);
    if (aProps.length != bProps.length) { return false; }
    for (let propName of aProps) {
      if (a[propName] !== b[propName])  { return false; }
    }
    return true;
  },
  timeoutPromise: function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  epoch_time() {
    // get current epoch time in UTC
    // silly but thus is JS
    // see: https://stackoverflow.com/a/6777470/4246723
    const now = new Date();
    const nowUTC =  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                             now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    return Math.round(nowUTC/1000);
  },
  cleanSheetHTML(html) {
    html = html.replace(/\u00a0/g, ' ').replace(/&nbsp;/g, ' ').replace(/(\r\n|\n|\r)/gm, "");
    const cleanAttributes = Platform.OS === 'android' ? {} : {
              a: [ 'href', 'name', 'target' ],
              img: [ 'src' ],
              p: ['style'],
              span: ['style'],
              div: ['style'],
              td: ['colspan'],
            };
    const clean = sanitizeHtml(html, {
            allowedTags: [ 'blockquote', 'p', 'a', 'ul', 'ol',
              'nl', 'li', 'b', 'i', 'strong', 'em', 'small', 'big', 'span', 'strike', 'hr', 'br', 'div',
              'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'sup' ],
            allowedAttributes: cleanAttributes,
            allowedClasses: {
             'sup': ['nechama'],
            },
            allowedStyles: {
              '*': {
                'color': [/^\#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
                'background-color': [/^\#(0x)?[0-9a-f]+$/i, /^rgb(?!\(\s*255\s*,\s*255\s*,\s*255\s*\))\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
                'text-align': [/^left$/, /^right$/, /^center$/],
              },
            },
            exclusiveFilter: function(frame) {
                return frame.tag === 'p' && !frame.text.trim();
            } //removes empty p tags  generated by ckeditor...

          });
    return clean;
  },
  filterOutItags: function(text) {
    // right now app is not displaying i-tags properly. interim solution is to not display them at all
    //NOTE need to be careful about nested i-tags
    try {
      text = text.replace(/<sup>[^<]*<\/sup>\s*<i +class=["']footnote["']>(?:[^<]*|(?:[^<]*<i>[^<]*<\/i>[^<]*|[^<]*<br>[^<]*)+)<\/i>/gm, '');
      text = text.replace(/(?:\s?<i [^<]*><\/i>\s?)+/g, ' ').trim();  // remove rest of i-tags which add unnecessary spaces
      return text;
    } catch (e) {
      //in case segment is not string (which should not happen but does)
      return text;
    }
  },
  hebrewInEnglish: function(text, whatToReturn) {
    var regEx = /(\s|^|\[|\]|\(|\)|\.|,|;|:|\*|\?|!|-|"|')((?:[\u0591-\u05c7\u05d0-\u05ea]+[()\[\]\s'"\u05f3\u05f4]{0,2})+)(?=\[|\]|\(|\)|\.|,|;|:|\*|\?|!|-|'|"|\s|$)/g
    if (whatToReturn == "string") {
      // wrap all Hebrew strings with <hediv> and &rlm;
      return text.replace(regEx, '<hediv>&#x200E;$1$2</hediv>');
    }
    else if (whatToReturn == "list") {
      return text.split(regEx)
    }
  },
  getDisplayableHTML: function(text, lang, isSheet) {
    if (isSheet) { text = Sefaria.util.cleanSheetHTML(text); }
    text = Sefaria.util.filterOutItags(text);
    if (lang === 'english') {
      return `<endiv>${Sefaria.util.hebrewInEnglish(text, 'string')}</endiv>`;
    }
    return `<hediv>${text}</hediv>`;
  },
  openFileInSources: async function(filename) {
    const isIOS = Platform.OS === 'ios';
    let fileData;
    let useLib = false;
    const libPath = `${RNFB.fs.dirs.DocumentDir}/library/${filename}`;
    const sourcePath = isIOS ? `${RNFB.fs.dirs.MainBundleDir}/sources/${filename}` : RNFB.fs.asset("sources/" + filename);
    const libExists = await RNFB.fs.exists(libPath);
    if (libExists) {
      // check date of each file and choose latest
      const libStats = await RNFB.fs.stat(libPath);
      useLib = libStats.lastModified > Sefaria.lastAppUpdateTime;
      console.log(filename, 'stats', libStats.lastModified, Sefaria.lastAppUpdateTime, useLib)
    }
    if (useLib) {
      fileData = await Sefaria._loadJSON(libPath);
    } else if (isIOS) {
      fileData = await Sefaria._loadJSON(sourcePath);
    } else {
      // android
      fileData = await RNFB.fs.readFile(sourcePath);
      fileData = JSON.parse(fileData);
    }
    return fileData;
  },
  getISOCountryCode: function() {
    return new Promise((resolve, reject) => {
      fetch('http://ip-api.com/json')
      .then(result=>result.json())
      .then(json=>resolve(json.countryCode));
    });
  },
  parseURLhost: function(url) {
    //thanks rvighne! https://stackoverflow.com/questions/736513/how-do-i-parse-a-url-into-hostname-and-path-in-javascript
    const u = new URL(url);
    return u.hostname;
  },
  _licenseMap: {
    "Public Domain": "http://en.wikipedia.org/wiki/Public_domain",
    "CC0": "http://creativecommons.org/publicdomain/zero/1.0/",
    "CC-BY": "http://creativecommons.org/licenses/by/3.0/",
    "CC-BY-SA": "http://creativecommons.org/licenses/by-sa/3.0/",
    "CC-BY-NC": "https://creativecommons.org/licenses/by-nc/4.0/"
  },
  getLicenseURL: function(license) {
      return Sefaria.util._licenseMap[license];
  },
  clone: function(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
      const copy = new Date();
      copy.setTime(obj.getTime());
      return copy;
    }
    if (typeof obj.clone === 'function') {
      return obj.clone();
    }
    // Handle Array
    if (obj instanceof Array) {
      const copy = [];
      const len = obj.length;
      for (let i = 0; i < len; ++i) {
        copy[i] = Sefaria.util.clone(obj[i]);
      }
      return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
      const copy = {};
      for (let attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = Sefaria.util.clone(obj[attr]);
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
  compareArrays: function(a, b) {
      if (a.length != b.length) return false;
      for (var i = 0; i < b.length; i++) {
          if (a[i] !== b[i]) return false;
      }
      return true;
  },
  getTextLanguageWithContent: function(lang, en, he) {
    // Returns a language that has content in it give strings `en` and `he`, with a preference for `lang`.
    let newLang = lang;
    const hasEn = (typeof en === "string") && en.trim() != "";
    const hasHe = (typeof he === "string") && he.trim() != "";
    if (newLang == "bilingual") {
      if (hasEn && !hasHe) {
        newLang = "english";
      } else if (!hasEn) newLang  = "hebrew";
    }

    if (newLang == "english")
      newLang = hasEn ? "english" : "hebrew";
    else if (newLang == "hebrew")
      newLang = hasHe || !hasEn ? "hebrew" : "english"; //make sure when there's no content it's hebrew
    return newLang;
  },
  regexEscape: function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  },
  stripHtml: function(rawHTML) {
    return rawHTML.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, ' ').replace(/&amp;/g,"&").replace(/&nbsp;/g, ' ');
  },
  lightenDarkenColor: function(col, amt) {
    var usePound = false;
    if (col[0] == "#") {
      col = col.slice(1);
      usePound = true;
    }
    var num = parseInt(col,16);
    var r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if  (r < 0) r = 0;
    var b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255;
    else if  (b < 0) b = 0;
    var g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    let colorString = (g | (b << 8) | (r << 16)).toString(16);
    while (colorString.length < 6) {
      colorString = "0" + colorString;
    }
    return (usePound?"#":"") + colorString;
  },
  removeHtml: function(str) {
    return str.replace(/<[^>]+>/g, '');
  },
  translateISOLanguageCode(code) {
    //takes two-letter ISO 639.2 code and returns full language name
    const codeMap = {
      "en": "english",
      "he": "hebrew",
      "yi": "yiddish",
      "fi": "finnish",
      "pt": "portuguese",
      "es": "spanish",
      "fr": "french",
      "de": "german",
      "ar": "arabic",
      "it": "italian",
      "pl": "polish",
      "ru": "russian",
    };
    return codeMap[code.toLowerCase()];
  }
};

Sefaria.downloader = Downloader;

Sefaria.api = Api;

Sefaria.history = History;

Sefaria.packages = Packages;

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

    if (n == 15 || n == 16) {
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

Sefaria.terms = {}; // TODO ideally we include a dump of all terms as offline JSON file. this is a placekeeper

Sefaria.hebrewCategory = function(cat) {
  // Returns a string translating `cat` into Hebrew.
  if (Sefaria.hebrewCategories) {
    // pregenerated hebrew categories from dump
    if (cat in Sefaria.hebrewCategories) {
      return Sefaria.hebrewCategories[cat];
    }
  }

  const categories = {
    "Torah": "תורה",
    "Tanakh": 'תנ"ך',
    "Prophets": "נביאים",
    "Writings": "כתובים",
    "Commentary": "מפרשים",
    "Quoting Commentary": "פרשנות מצטטת",
    "Modern Commentary": "פרשנות מודרנית",
    "Targum": "תרגומים",
    "Mishnah": "משנה",
    "Tosefta": "תוספתא",
    "Tanaitic": "ספרות תנאית",
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
    "Community": "קהילה",
    "All": "הכל",
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
    system: "#142b51",
    palegreen: "#B8D4D3"
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
  "Tanaitic":           Sefaria.palette.colors.teal,
  "Parshanut":          Sefaria.palette.colors.paleblue,
  "Chasidut":           Sefaria.palette.colors.lightgreen,
  "Musar":              Sefaria.palette.colors.raspberry,
  "Responsa":           Sefaria.palette.colors.orange,
  "Apocrypha":          Sefaria.palette.colors.lightpink,
  "Other":              Sefaria.palette.colors.darkblue,
  "Quoting Commentary": Sefaria.palette.colors.orange,
  "Commentary2":        Sefaria.palette.colors.blue,
  "Sheets":             Sefaria.palette.colors.darkblue,
  "Community":          Sefaria.palette.colors.raspberry,
  "Targum":             Sefaria.palette.colors.lavender,
  "Modern Works":       Sefaria.palette.colors.palegreen,
  "Modern Commentary":  Sefaria.palette.colors.raspberry,
  "More":               Sefaria.palette.colors.darkblue,
};
Sefaria.palette.categoryColor = function(cat) {
  if (cat in Sefaria.palette.categoryColors) {
    return Sefaria.palette.categoryColors[cat];
  }
  return Sefaria.palette.categoryColors["Other"];
};
Sefaria.search = new Search('https://www.sefaria.org', 'text', 'sheet');

Array.prototype.stableSort = function(cmp) {
  cmp = !!cmp ? cmp : (a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  };
  let stabilizedThis = this.map((el, index) => [el, index]);
  let stableCmp = (a, b) => {
    let order = cmp(a[0], b[0]);
    if (order != 0) return order;
    return a[1] - b[1];
  }
  stabilizedThis.sort(stableCmp);
  for (let i=0; i<this.length; i++) {
    this[i] = stabilizedThis[i][0];
  }
  return this;
}

//for debugging. from https://gist.github.com/zensh/4975495
Sefaria.memorySizeOf = function (obj) {
    var bytes = 0;

    function sizeOf(obj) {
        if(obj !== null && obj !== undefined) {
            switch(typeof obj) {
            case 'number':
                bytes += 8;
                break;
            case 'string':
                bytes += obj.length * 2;
                break;
            case 'boolean':
                bytes += 4;
                break;
            case 'object':
                var objClass = Object.prototype.toString.call(obj).slice(8, -1);
                if(objClass === 'Object' || objClass === 'Array') {
                    for(var key in obj) {
                        if(!obj.hasOwnProperty(key)) continue;
                        sizeOf(obj[key]);
                        sizeOf(key);
                    }
                } else bytes += obj.toString().length * 2;
                break;
            }
        }
        return bytes;
    };

    function formatByteSize(bytes) {
        if(bytes < 1024) return bytes + " bytes";
        else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
        else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
        else return(bytes / 1073741824).toFixed(3) + " GiB";
    };

    return formatByteSize(sizeOf(obj));
};
export default Sefaria;
