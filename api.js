import {
  Alert
} from 'react-native';
import 'abortcontroller-polyfill';

import strings from './LocalizedStrings';
import LinkContent from './LinkContent';

var Api = {
  /*
  takes responses from text and links api and returns json in the format of iOS json
  */
  _textCache: {}, //in memory cache for API data
  _linkCache: {},
  _nameCache: {},
  _allTags: {},
  _sheetsByTag: {},
  _sheets: {},
  _trendingTags: {},
  _versions: {},
  _translateVersions: {},
  _indexDetails: {},
  _tagCategory: {},
  _currentRequests: {}, // object to remember current request in order to abort. keyed by apiType
  _textCacheKey: function(ref, context, versions) {
    return `${ref}|${context}${(!!versions ? (!!versions.en ? `|en:${versions.en}` : "") + (!!versions.he ? `|he:${versions.he}` : "")  : "")}`;
  },
  textCache: function(ref, context, versions, value) {
    const key = Sefaria.api._textCacheKey(ref, context, versions);
    if (value) {
      //setting
      if (!(key in Sefaria.api._textCache)) { Sefaria.api._textCache[key] = value; }
    } else {
      //getting
      return Sefaria.api._textCache[key];
    }
  },
  _toIOS: function(responses) {
      //console.log(responses);
      if (!responses) { return responses; }
      let text_response = responses.text;
      let to_pad, pad_length;
      if (text_response.text.length < text_response.he.length) {
        to_pad = text_response.text;
        pad_length = text_response.he.length;
      } else{
        to_pad = text_response.he;
        pad_length = text_response.text.length;
      }
      while (to_pad.length < pad_length) {
        to_pad.push("");
      }

      let link_response = new Array(text_response.text.length);
      let baseRef = responses.ref;

      for (let i = 0; i < responses.links.length; i++) {
        let link = responses.links[i];
        let linkSegIndex = parseInt(link.anchorRef.substring(link.anchorRef.lastIndexOf(':') + 1)) - 1;
        if (!link_response[linkSegIndex]) {
          link_response[linkSegIndex] = [];
        }
        link_response[linkSegIndex].push({
          "category": link.category,
          "sourceRef": link.sourceRef, //.substring(0,link.sourceRef.lastIndexOf(':')),
          "sourceHeRef": link.sourceHeRef, //.substring(0,link.sourceHeRef.lastIndexOf(':')),
          "textTitle": link.index_title
        });
      }

      let content = text_response.text.map((en,i) => ({
        "segmentNumber": ""+(i+1),
        "he": text_response.he[i],
        "text": en,
        "links": link_response[i] ? link_response[i] : []
      }));

      //check merged version title
      if (!text_response.versionTitle && text_response.sources) {
        text_response.versionTitle = "Merged from ";
        sourceSet = new Set(text_response.sources);
        isFirst = true;
        for (let source of sourceSet) {
          if (!isFirst) text_response.versionTitle += ", ";
          text_response.versionTitle += source;
          isFirst = false;
        }
      }
      if (!text_response.heVersionTitle && text_response.heSources) {
        text_response.heVersionTitle = "Merged from ";
        sourceSet = new Set(text_response.heSources);
        isFirst = true;
        for (let source of sourceSet) {
          if (!isFirst) text_response.heVersionTitle += ", ";
          text_response.heVersionTitle += source;
          isFirst = false;
        }
      }

      return {
        "versionTitle": text_response.versionTitle,
        "heVersionTitle": text_response.heVersionTitle,
        "versionNotes": text_response.versionNotes,
        "heVersionNotes": text_response.heVersionNotes,
        "license": text_response.license,
        "heLicense": text_response.heLicense,
        "versionSource": text_response.versionSource,
        "heVersionSource": text_response.heVersionSource,
        "requestedRef": responses.ref,
        "isSectionLevel": responses.ref === text_response.sectionRef,
        "heTitleVariants": text_response.heTitleVariants,
        "heTitle": text_response.heTitle,
        "heRef": text_response.heRef,
        "toSections": text_response.toSections,
        "sectionRef": text_response.sectionRef,
        "heSectionRef": text_response.heSectionRef, // doesn't actually appear in offline files
        "lengths": text_response.length,
        "next": text_response.next,
        "content": content,
        "book": text_response.book,
        "prev": text_response.prev,
        "textDepth": text_response.textDepth,
        "sectionNames": text_response.sectionNames,
        "sections": text_response.sections,
        "isComplex": text_response.isComplex,
        "titleVariants": text_response.titleVariants,
        "categories": text_response.categories,
        "ref": text_response.sectionRef,
        "type": text_response.type,
        "addressTypes": text_response.addressTypes,
        "length": text_response.length,
        "indexTitle": text_response.indexTitle,
        "heIndexTitle": text_response.heIndexTitle,
        "alts": text_response.alts,
        "order": text_response.order
      };
  },
  /*
  apiType: string `oneOf(["text","links","index"])`. passing undefined gets the standard Reader URL.
  context is a required param if apiType == 'text'. o/w it's ignored
  */
  _toURL: function(ref, useHTTPS, apiType, urlify, { context, versions, more_data }) {
    let url = '';
    if (useHTTPS) {
      url += 'https://www.sefaria.org/';
    } else {
      url += 'http://www.sefaria.org/';
    }

    let urlSuffix = '';
    if (apiType) {
      switch (apiType) {
        case "text":
          url += 'api/texts/';
          urlSuffix = `?context=${context === true ? 1 : 0}&commentary=0`;
          if (versions) {
            if (versions.en) { urlSuffix += `&ven=${versions.en.replace(/ /g, "_")}`; }
            if (versions.he) { urlSuffix += `&vhe=${versions.he.replace(/ /g, "_")}`; }
          }
          break;
        case "links":
          url += 'api/links/';
          urlSuffix = '?with_text=0';
          break;
        case "index":
          url += 'api/v2/index/';
          urlSuffix = '?with_content_counts=1';
          break;
        case "versions":
          url += "api/texts/versions/";
          break;
        case "trendingTags":
          url += "api/sheets/trending-tags/";
          break;
        case "allTags":
          url += "api/sheets/tag-list/";
          break;
        case "sheetsByTag":
          url += "api/sheets/tag/";
          break;
        case "sheets":
          url += "api/sheets/";
          urlSuffix = `?more_data=${more_data === true ? 1 : 0}`;
          break;
        case "name":
          url += "api/name/";
          //urlSuffix = '?ref_only=0';
          break;
        case "tagCategory":
          url += "api/tag-category/";
          //urlSuffix = '?ref_only=0';
          break;
        default:
          console.error("You passed invalid type: ",apiType," into _toURL()");
          break;
      }
    }
    if (urlify) {
      ref = ref.replace(/:/g,'.').replace(/ /g,'_');
    }
    url += ref + urlSuffix;
    return url;
  },
  _text: function(ref, { context, versions }) {
    return new Promise((resolve, reject)=>{
      Sefaria.api._request(ref,'text', true, { context, versions })
      .then(data => {
        if (context) {
          resolve(Sefaria.api._toIOS({"text": data, "links": [], "ref": ref}));
        } else {
          const en_text = (data.text instanceof Array) ? data.text.join(' ') : data.text;
          const he_text = (data.he   instanceof Array) ? data.he.join(' ')   : data.he;
          resolve({
            "fromAPI": true,
            "result": new LinkContent(en_text, he_text, data.sectionRef)
          });
        }
      }).catch(error => reject(error));
    });
  },
  links: function(ref) {
    return new Promise((resolve, reject) => {
      if (ref in Sefaria.api._linkCache) {
        resolve(Sefaria.api._linkCache[ref]);
      } else {
        Sefaria.api._request(ref,'links', true, {})
        .then((response)=>{
          //console.log("Setting API Link Cache for ",ref)
          //console.log(response)
          Sefaria.api._linkCache[ref] = response;
          resolve(response);
        })
        .catch(()=>{
          console.error("Links API error:",ref);
        });
      }
    });
  },
  _textandlinks: function(ref) {
    var checkResolve = function(resolve) {
      if (numResponses == 2) {
        //console.log("ALL Done ");
        resolve({"text": textResponse, "links": linksResponse, "ref": ref});
      }
    }

    var numResponses = 0;
    var textResponse = null;
    var linksResponse = null;
    return new Promise(function(resolve,reject) {
      Sefaria.api._request(ref,'text', true, {context: true})
      .then((response)=>{
        numResponses += 1;
        textResponse = response;
        checkResolve(resolve);
      });
      Sefaria.api._request(ref,'links', true, {})
      .then((response)=>{
        numResponses += 1;
        linksResponse = response;
        checkResolve(resolve);
      });

    });
  },
  getCachedVersions: function(ref) {
    const refUpOne = Sefaria.refUpOne(ref);
    const cached = Sefaria.api._versions[ref] || Sefaria.api._versions[refUpOne];
    if (!!cached) {
      return cached;
    }
  },
  versions: function(ref, failSilently) {
    return new Promise((resolve, reject) => {
      const cached = Sefaria.api.getCachedVersions(ref);
      if (!!cached) { resolve(cached); return; }
      Sefaria.api._request(ref, 'versions', true, {}, failSilently)
        .then(response => {
          const defaultLangsFound = {};
          for (let v of response) {
            // mark the first version in every language as default for that language
            if (!defaultLangsFound[v.language]) {
              defaultLangsFound[v.language] = true;
              v.default = true;
            }
            Sefaria.api._translateVersions[v.versionTitle] = {
              en: v.versionTitle,
              he: !!v.versionTitleInHebrew ? v.versionTitleInHebrew : v.versionTitle,
              lang: v.language,
            };
          }
          Sefaria.api._versions[ref] = response;
          resolve(response);
        })
        .catch((error)=>{
          console.log("Versions API error:",ref, error);
          reject();
        });
    });
  },

  name: function(name, failSilently) {
    Sefaria.api._abortRequestType('name');
    return new Promise((resolve, reject) => {
      const cached = Sefaria.api._nameCache[name];
      if (!!cached) { console.log("cached"); resolve(cached); return; }
      Sefaria.api._request(name, 'name', false, {}, failSilently)
        .then(response => {
          Sefaria.api._nameCache[name] = response;
          resolve(response);
        })
        .catch(error=>{
          console.log("Name API error:", name, error);
          reject();
        });
    });
  },
  trendingTags: function(failSilently) {
    Sefaria.api._abortRequestType('trendingTags');
    return new Promise((resolve, reject) => {
      //const cached = Sefaria.api._trendingTags;
      //if (!!cached) { console.log("cached"); resolve(cached); return; }
      Sefaria.api._request('', 'trendingTags', false, {}, failSilently)
        .then(response => {
          //Sefaria.api._trendingTags = response;
          resolve(response);
        })
        .catch(error=>{
          console.log("TrendingTags API error:", error);
          reject();
        });
    });
  },

  allTags: function(sortBy, failSilently) {
    Sefaria.api._abortRequestType('allTags-'+sortBy);
    return new Promise((resolve, reject) => {
      const cached = Sefaria.api._allTags[sortBy];
      //if (!!cached) { console.log("cached"); resolve(cached); return; }
      Sefaria.api._request(sortBy, 'allTags', false, {}, failSilently)
        .then(response => {
          Sefaria.api._allTags[sortBy] = response;
          resolve(response);
        })
        .catch(error=>{
          console.log("allTags API error:", error);
          reject();
        });
    });
  },


  tagCategory: function(category, failSilently) {
    tag = encodeURIComponent(category);
    Sefaria.api._abortRequestType('tagCategory');
    return new Promise((resolve, reject) => {
      const cached = Sefaria.api._tagCategory[category];
      //if (!!cached) { console.log("cached"); resolve(cached); return; }
      Sefaria.api._request(category, 'tagCategory', false, {}, failSilently)
        .then(response => {
          Sefaria.api._sheetsByTag[category] = response;
          resolve(response);
        })
        .catch(error=>{
          console.log("sheetsByTag API error:", error);
          reject();
        });
    });
  },


  sheetsByTag: function(tag, failSilently) {
    tag = encodeURIComponent(tag);
    Sefaria.api._abortRequestType('sheetsByTag');
    return new Promise((resolve, reject) => {
      const cached = Sefaria.api._sheetsByTag[tag];
      //if (!!cached) { console.log("cached"); resolve(cached); return; }
      Sefaria.api._request(tag, 'sheetsByTag', false, {}, failSilently)
        .then(response => {
          Sefaria.api._sheetsByTag[tag] = response;
          resolve(response);
        })
        .catch(error=>{
          console.log("sheetsByTag API error:", error);
          reject();
        });
    });
  },

  sheets: function(sheetID, more_data) {
    Sefaria.api._abortRequestType('sheets');
    return new Promise((resolve, reject) => {
      const cached = Sefaria.api._sheets[sheetID];
      //if (!!cached) { console.log("cached"); resolve(cached); return; }
      Sefaria.api._request(sheetID, 'sheets', false, { more_data })
        .then(response => {
          Sefaria.api._sheets[sheetID] = response;
          resolve(response);
        })
        .catch(error=>{
          console.log("Sheets API error:", error);
          reject();
        });
    });
  },

  isACaseVariant: function(query, data) {
    // Check if query is just an improper capitalization of something that otherwise would be a ref
    // query: string
    // data: dictionary, as returned by /api/name
    return (!(data["is_ref"]) &&
          data["completions"] &&
          data["completions"].length &&
          data["completions"][0] != query &&
          data["completions"][0].toLowerCase().replace('״','"') == query.slice(0, data["completions"][0].length).toLowerCase().replace('״','"') &&
          data["completions"][0] != query.slice(0, data["completions"][0].length))
  },
  repairCaseVariant: function(query, data) {
    // Used when isACaseVariant() is true to prepare the alternative
    return data["completions"][0] + query.slice(data["completions"][0].length);
  },

  versionLanguage: function(versionTitle) {
    // given a versionTitle, return the language of the version
    return Sefaria.api._translateVersions[versionTitle]["lang"]
  },

  _abortRequestType: function(apiType) {
    const controller = Sefaria.api._currentRequests[apiType];
    if (controller) {
      controller.abort();
      Sefaria.api._currentRequests[apiType] = null;
    }
  },
  /*
  context is a required param if apiType == 'text'. o/w it's ignored
  versions is object with keys { en, he } specifying version titles
  failSilently - if true, dont display a message if api call fails
  */
  _request: function(ref, apiType, urlify, { context, versions, more_data }, failSilently) {
    const controller = new AbortController();
    const signal = controller.signal;
    Sefaria.api._currentRequests[apiType] = controller;
    var url = Sefaria.api._toURL(ref, true, apiType, urlify, { context, versions, more_data });
    return new Promise(function(resolve, reject) {
      fetch(url, {method: 'GET', signal})
      .then(function(response) {
        //console.log('checking response',response.status);
        if (response.status >= 200 && response.status < 300) {
          return response;
        } else {
          reject(response.statusText);
        }
      })
      .then(response => response.json())
      .then(json => {
        if ("error" in json) {
          Alert.alert(
            strings.textUnavailable,
            strings.textUnavailableMessage,
            [{text: strings.ok, onPress: () => { reject("Return to Nav"); } }]);
        } else {
          resolve(json);
        }
      })
      .catch((response)=>{
        if (failSilently) {
          reject("Return to Nav");
        } else {
          Alert.alert(
            strings.noInternet,
            strings.noInternetMessage,
            [
              {text: strings.cancel, onPress: () => { reject("Return to Nav"); }, style: 'cancel' },
              {text: strings.tryAgain, onPress: () => {
                Sefaria.api._request(ref,apiType, urlify, { context, versions, more_data },failSilently).then(resolve);
              }}
            ]
          );
        }
      });
    });
  }
}

module.exports = Api;
