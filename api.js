'use strict';

import {
  Alert
} from 'react-native';
import 'abortcontroller-polyfill';
import Config from 'react-native-config';

import strings from './LocalizedStrings';
import LinkContent from './LinkContent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { getCrashlytics, recordError } from '@react-native-firebase/crashlytics';  // to setup up generic crashlytics reports
import jwt_decode from 'jwt-decode';

// Auth tokens (JWT access/refresh) are security-sensitive and are stored in
// OS-backed secure storage (iOS Keychain / Android Keystore) via
// react-native-keychain, rather than in plaintext AsyncStorage like the rest
// of the app's local data.
const AUTH_KEYCHAIN_SERVICE = 'org.sefaria.auth';
const AUTH_KEYCHAIN_USERNAME = 'sefaria_auth';
// Legacy AsyncStorage key auth tokens used to live under, before the move to
// the keychain. Kept only to support the one-time migration below.
const LEGACY_AUTH_ASYNC_STORAGE_KEY = 'auth';

var Api = {
  /*
  takes responses from text and links api and returns json in the format of iOS json
  */
  _baseHost: Config.BASE_HOST || 'https://www.sefaria.org/',
  _textCache: {}, //in memory cache for API data
  _bulkText: {},
  _bulkSheets: {},
  _parashaNextRead: {},
  _linkCache: {},
  _nameCache: {},
  _allTags: {},
  _sheetsByTag: {},
  _related: {},
  _sheets: {},
  _topic: {},
  _portal: {},
  _trendingTags: null,
  _versions: {},
  _translateVersions: {},
  _indexDetails: {},
  _tagCategory: {},
  _lexiconCache: {},
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
  _toMobileFormat: function(textResponse, ref) {
    /**
     * Convert format of API response to the format used by the mobile app.
     * This makes it conform to the same format as the offline export.
     */
      let to_pad, pad_length;
      if (textResponse.text.length < textResponse.he.length) {
        to_pad = textResponse.text;
        pad_length = textResponse.he.length;
      } else{
        to_pad = textResponse.he;
        pad_length = textResponse.text.length;
      }
      while (to_pad.length < pad_length) {
        to_pad.push("");
      }

      let offset = textResponse?.index_offsets_by_depth?.[textResponse.textDepth] || 0;
      offset = (Array.isArray(offset)) ? offset[0] : offset;
      let content = textResponse.text.map((en,i) => ({
        "segmentNumber": ""+(i+1+offset),
        "he": textResponse.he[i],
        "text": en,
      }));

      //check merged version title
      let isFirst, sourceSet;
      if (!textResponse.versionTitle && textResponse.sources) {
        textResponse.versionTitle = "Merged from ";
        sourceSet = new Set(textResponse.sources);
        isFirst = true;
        for (let source of sourceSet) {
          if (!isFirst) textResponse.versionTitle += ", ";
          textResponse.versionTitle += source;
          isFirst = false;
        }
      }
      if (!textResponse.heVersionTitle && textResponse.heSources) {
        textResponse.heVersionTitle = "Merged from ";
        sourceSet = new Set(textResponse.heSources);
        isFirst = true;
        for (let source of sourceSet) {
          if (!isFirst) textResponse.heVersionTitle += ", ";
          textResponse.heVersionTitle += source;
          isFirst = false;
        }
      }

      return {
        "versionTitle": textResponse.versionTitle,
        "heVersionTitle": textResponse.heVersionTitle,
        "versionNotes": textResponse.versionNotes,
        "heVersionNotes": textResponse.heVersionNotes,
        "license": textResponse.license,
        "heLicense": textResponse.heLicense,
        "versionSource": textResponse.versionSource,
        "heVersionSource": textResponse.heVersionSource,
        "requestedRef": ref,
        "isSectionLevel": ref === textResponse.sectionRef,
        "heTitleVariants": textResponse.heTitleVariants,
        "heTitle": textResponse.heTitle,
        "heRef": textResponse.heRef,
        "toSections": textResponse.toSections,
        "sectionRef": textResponse.sectionRef,
        "heSectionRef": textResponse.heSectionRef, // doesn't actually appear in offline files
        "lengths": textResponse.length,
        "next": textResponse.next,
        "content": content,
        "book": textResponse.book,
        "prev": textResponse.prev,
        "textDepth": textResponse.textDepth,
        "sectionNames": textResponse.sectionNames,
        "sections": textResponse.sections,
        "isComplex": textResponse.isComplex,
        "titleVariants": textResponse.titleVariants,
        "categories": textResponse.categories,
        "ref": textResponse.sectionRef,
        "type": textResponse.type,
        "addressTypes": textResponse.addressTypes,
        "length": textResponse.length,
        "indexTitle": textResponse.indexTitle,
        "heIndexTitle": textResponse.heIndexTitle,
        "alts": textResponse.alts,
        "order": textResponse.order,
        "nonExistantVersions": textResponse.nonExistantVersions,
      };
  },
  /*
  apiType: string `oneOf(["text","links","index"])`. passing undefined gets the standard Reader URL.
  context is a required param if apiType == 'text'. o/w it's ignored
  */
  _sanitizeURL: function(url) {
    return encodeURIComponent(url.replace(/ /g, "_"));
  },
  _toURL: function(ref, useHTTPS, apiType, urlify, extra_args) {
    let url = Sefaria.api._baseHost;

    let urlSuffix = '';
    if (apiType) {
      switch (apiType) {
        case "text":
          const { context, versions, stripItags } = extra_args;
          url += 'api/texts/';
          urlSuffix = `?context=${context === true ? 1 : 0}&commentary=0`;
          if (versions) {
            // Patch: We disregard the version if it's not a string to deal with the change of structure around the move to RTL
            // TODO: Add an analytics event to track when a version is an object
            if (typeof versions.en === 'string') {
              urlSuffix += `&ven=${this._sanitizeURL(versions.en)}`;
            }
            if (versions.he && typeof versions.he === 'string') {
              urlSuffix += `&vhe=${this._sanitizeURL(versions.he)}`;
            }
          }
          if (stripItags) {
            urlSuffix += `&stripItags=1`;
          }
          break;
        case 'translations':
          url += 'api/v3/texts/';
          urlSuffix = '?version=translation|all&return_format=strip_only_footnotes';
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
        case "related":
          url += "api/related/";
          break;
        case "sheets":
          const { more_data } = extra_args;
          url += "api/sheets/";
          urlSuffix = `?more_data=${more_data === true ? 1 : 1}`;
          break;
        case "name":
          url += "api/name/";
          break;
        case "bulktext":
          const { paramStr } = extra_args;
          url += "api/bulktext/";
          urlSuffix = paramStr;
          break;
        case "bulksheets":
          url += "api/v2/sheets/bulk/";
          break;
        case "parashaNextRead":
          url += "api/calendars/next-read/";
          break;
        case "tagCategory":
          url += "api/tag-category/";
          //urlSuffix = '?ref_only=0';
          break;
        case "lexicon":
          const { words } = extra_args;
          url += `api/words/${encodeURIComponent(words)}?never_split=1`;
          ref = ref ? `&lookup_ref=${ref}`:""
          break;
        case "topic":
          const { slug, with_refs, annotate_links, group_related, with_links, with_indexes } = extra_args;
          url += `api/topics/${slug}`;
          urlSuffix = `?with_links=${0+with_links}&annotate_links=${0+annotate_links}&with_refs=${0+with_refs}&group_related=${0+group_related}&with_indexes=${0+with_indexes}`;
          break;
        case "portal":
          const { portalSlug } = extra_args;
          url += `api/portals/${portalSlug}`;
          break;
        default:
          console.error("You passed invalid type: ",apiType," into _toURL()");
          break;
      }
    }
    if (urlify) {
      ref = Sefaria.refToUrl(ref);
    }
    url += ref + urlSuffix;
    return url;
  },
  _text: function(ref, extra_args, failSilently=false) {
    return new Promise((resolve, reject)=>{
      Sefaria.api._request(ref,'text', true, extra_args, failSilently)
      .then(data => {
        if (extra_args.context) {
          resolve({textContent: Sefaria.api._toMobileFormat(data, ref)});
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
  textApi: async function(ref, context, versions, failSilently=false) {
    const cacheValue = Sefaria.api.textCache(ref, context, versions);
    if (cacheValue) {
      // Don't check the API cahce until we've checked for a local file, because the API
      // cache may be left in a state with text but without links.
      return cacheValue;
    }
    return Sefaria.api._text(ref, { context, versions, stripItags: true }, failSilently);
  },
  translations: async function(ref) {
    return Sefaria.api._request(ref,'translations', true);
  },
  processTextApiData: function(ref, context, versions, data) {
    Sefaria.api.textCache(ref, context, versions, data);
    Sefaria.cacheVersionInfoOldFormat(data);
  },
  links: function(ref) {
    return new Promise((resolve, reject) => {
      if (ref in Sefaria.api._linkCache) {
        resolve(Sefaria.api._linkCache[ref]);
      } else {
        Sefaria.api._request(ref,'links', true, {}, true)
        .then((response)=>{
          Sefaria.api._linkCache[ref] = response;
          resolve(response);
        })
        .catch((error)=>{
          console.log("Links API error:",ref, error);
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
          Sefaria.cacheVersionsAvailableBySection(ref,
              response.map(v => ({versionTitle: v.versionTitle, language: v.language}))
          );
          Sefaria.api._versions[ref] = response;
          resolve(response);
        })
        .catch((error)=>{
          console.log("Versions API error:",ref, error);
          reject();
        });
    });
  },
  portal: async function(slug) {
    const cached = Sefaria.api._portal[slug];
    if (!!cached) { return cached; }
    let response = await Sefaria.api._request('', 'portal', false, { portalSlug: slug }, false);
    Sefaria.api._portal[slug] = response;
    return response;
  },
  name: function(name, failSilently) {
    Sefaria.api._abortRequestType('name');
    return new Promise((resolve, reject) => {
      const cached = Sefaria.api._nameCache[name];
      if (!!cached) { resolve(cached); return; }
      Sefaria.api._request(encodeURIComponent(name), 'name', false, {}, failSilently)
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
  lexicon: async function(words, ref) {
    // Returns Promise which resolve to a list of lexicon entries for the given words
    ref = typeof ref !== "undefined" ? ref : null;
    words = typeof words !== "undefined" ? words : "";
    if (words.length <= 0) { return Promise.resolve([]); }

    const key = ref ? words + "|" + ref : words;
    const cached = Sefaria.api._lexiconCache[key];
    if (!!cached) { return cached; }
    try{
      return await Sefaria.api._request(ref, 'lexicon', true, { words }, true);
    } catch (error) {
      console.log("Lexicon API error:", words, ref);
      throw error;
    }
  },
  trendingTags: function(failSilently) {
    Sefaria.api._abortRequestType('trendingTags');
    return new Promise((resolve, reject) => {
      const cached = Sefaria.api._trendingTags;
      if (!!cached) { resolve(cached); return; }
      Sefaria.api._request('', 'trendingTags', false, {}, failSilently)
        .then(response => {
          Sefaria.api._trendingTags = response;
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

  topic: async function(slug, with_links=true, annotate_links=true, with_refs=true, group_related=true, with_indexes=true) {
    await Sefaria.api._abortRequestType('topic');
    const cached = Sefaria.api._topic[slug];
    if (!!cached) { return cached; }
    let response = await Sefaria.api._request('', 'topic', false, {
      with_links,
      annotate_links,
      with_refs,
      group_related,
      with_indexes,
      slug,
    }, false);
    response = Sefaria.api.processTopicsData(response);
    Sefaria.api._topic[slug] = response;
    return response;
  },

  processTopicsData: function(data) {
    if (!data) { return null; }
    // Split  `refs` in `sourceRefs` and `sheetRefs`
    let refMap = {};
    for (let refObj of data.refs.filter(s => !s.is_sheet)) {
      refMap[refObj.ref] = {ref: refObj.ref, order: refObj.order, dataSources: refObj.dataSources};
      if (refObj.order) {
        refMap[refObj.ref].order = {...refObj.order, availableLangs: refObj?.order?.availableLangs || [],
          numDatasource: refObj?.order?.numDatasource || 1,
          tfidf: refObj?.order?.tfidf || 0,
          pr: refObj?.order?.pr || 0,
          curatedPrimacy: {he: refObj?.order?.curatedPrimacy?.he || 0, en: refObj?.order?.curatedPrimacy?.en || 0}}
      }
    }
    data.textRefs = Object.values(refMap);
    return data;
  },

  related: async function(ref) {
    //await Sefaria.api._abortRequestType('related');  doesn't seem necessary and causes many failed related calls when sections are small
    try {
      return await Sefaria.api._request(ref, 'related', true, {}, true);
    } catch(error) {
      console.log("related API error:", error, ref);
      throw error;
    }
  },

  getParashaNextRead: async function(parasha) {
    const cached = Sefaria.api._parashaNextRead[parasha];
    if (!!cached) { return cached; }
    try {
      const response = await Sefaria.api._request(parasha, 'parashaNextRead', false, {}, true);
      Sefaria.api._parashaNextRead[parasha] = response;
      return response;
    } catch(error) {
      console.log("parashaNextRead API error:", error, parasha);
      throw error;
    }
  },

  getBulkText: function(refs, asSizedString=false, minChar=null, maxChar=null) {
    if (refs.length === 0) { return Promise.resolve({}); }

    const MAX_URL_LENGTH = 3800;
    const hostStr = `${Sefaria.api._baseHost}/api/bulktext/`;

    let paramStr = '';
    for (let [paramKey, paramVal] of Object.entries({asSizedString, minChar, maxChar})) {
      paramStr = !!paramVal ? paramStr + `&${paramKey}=${paramVal}` : paramStr;
    }
    paramStr = paramStr.replace(/&/,'?');

    // Split into multipe requests if URL length goes above limit
    let refStrs = [""];
    refs.map(ref => {
      let last = refStrs[refStrs.length-1];
      if (encodeURI(`${hostStr}${last}|${ref}${paramStr}`).length > MAX_URL_LENGTH) {
        refStrs.push(ref)
      } else {
        refStrs[refStrs.length-1] += last.length ? `|${ref}` : ref;
      }
    });

    let promises = refStrs.map(async (refStr) => {
      const cached = Sefaria.api._bulkText[refStr+paramStr];
      if (!!cached) { return cached; }
      const response = await Sefaria.api._request(refStr, 'bulktext', false, {paramStr}, true);
      Sefaria.api._bulkText[refStr+paramStr] = response;
      return response;
    });

    return Promise.all(promises).then(results => Object.assign({}, ...results));
  },

  getBulkSheets: async function(sheetIds) {
    if (sheetIds.length === 0) { return Promise.resolve({}); }
    const idStr = sheetIds.join("|");
    const cached = Sefaria.api._bulkSheets[idStr];
    if (!!cached) { return cached; }
    try {
      const response = await Sefaria.api._request(idStr, 'bulksheets', false, {}, true);
      Sefaria.api._bulkSheets[idStr] = response;
      return response;
    } catch(error) {
      console.log("bulkSheets API error:", error, idStr);
      throw error;
    }
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

  _abortRequestType: async function(apiType) {
    const controller = Sefaria.api._currentRequests[apiType];
    if (controller) {
      controller.abort();
      Sefaria.api._currentRequests[apiType] = null;
      await Sefaria.util.timeoutPromise(100);
    }
  },
  urlFormEncode: function(data) {
    return Object.entries(data).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`).join('&');
  },
  urlFormDecode: function(data) {
    return data.split('&').reduce((obj, entry) => {
      const [key, value] = entry.split('=').map(decodeURIComponent);
      obj[key] = value;
      return obj;
    }, {});
  },
  deleteUserAccount: async function() {
    await Sefaria.api.getAuthToken();
    if (!Sefaria._auth.uid) { console.log("Not signed in"); return; }
    const url = `${Sefaria.api._baseHost}api/account/delete`;
    fetch(url, {
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${Sefaria._auth.token}`,
        "Content-Type": "application/json;charset=UTF-8",
      },
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      } else {
        console.error('Error in response code', response.text());
        throw new Error("Bad Response Code " + response.status);
      }
    })
    .then(response => response.json())
    .then(json => {
      if ("error" in json) {
        console.error('Error in response json', json.error);
        throw new Error("Bad Response " + json.error);
      }else{
        return json;
      }
    })
    .catch(e => {
      console.error('Network Error', e);
      throw new Error("Network Error " + e);
    });
  },
    
  login: function(authData) {
    const url = `${Sefaria.api._baseHost}api/login/`;
    const authBody = {
      username: authData.email,
      password: authData.password,
    };
    return fetch(url, {
      method: "POST",
      body: JSON.stringify(authBody),
      headers: {
        "Content-Type": "application/json;charset=UTF-8"
      }
    });
  },
  register: function(authData) {
    const url = `${Sefaria.api._baseHost}api/register/`;
    const authBody = {
      email: authData.email,
      first_name: authData.first_name,
      last_name: authData.last_name,
      password1: authData.password,
      password2: authData.password,
      mobile_app_key: authData.mobile_app_key,
    };
    console.log(authBody, Sefaria.api.urlFormEncode(authBody));
    return fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: Sefaria.api.urlFormEncode(authBody)
    });
  },
  socialLogin: async function(provider, idToken, userData) {
    const endpoint = provider === 'google'
      ? 'api/auth/google/mobile'
      : 'api/auth/apple/mobile';
    const body = provider === 'google'
      ? { id_token: idToken }
      : { id_token: idToken, first_name: userData?.firstName, last_name: userData?.lastName };
    const url = `${Sefaria.api._baseHost}${endpoint}`;

    // Each stage below is caught on its own. A single try/catch around the
    // whole function reported every failure as 'network_error' and threw the
    // underlying error away, so a client-side credential-storage failure was
    // indistinguishable from the server being unreachable -- and neither was
    // reported to Crashlytics, unlike authenticate() below. That made SSO
    // failures effectively undiagnosable from a device.
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      recordError(getCrashlytics(), error);
      return {
        success: false,
        code: 'network_error',
        analyticsReason: 'network_error',
        error: { non_field_errors: `Network error during sign-in: ${error?.message}` },
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      // A non-JSON body means the server failed before it could produce its
      // usual JSON error shape (e.g. an HTML 500 page). That is a server
      // problem, not a network one, and the status code is the useful part.
      recordError(getCrashlytics(), error);
      return {
        success: false,
        code: 'invalid_response',
        analyticsReason: 'invalid_response',
        error: { non_field_errors: `Server returned a non-JSON response (HTTP ${response.status})` },
      };
    }

    // response.json() guarantees valid JSON, not an object -- a body of literal
    // `null`, a number, or a string all parse successfully. Reading data.error
    // off those would throw past every catch here and out of socialLogin
    // entirely, breaking its contract of always resolving to a result object.
    if (data === null || typeof data !== 'object') {
      return {
        success: false,
        code: 'invalid_response',
        analyticsReason: 'invalid_response',
        error: { non_field_errors: `Server returned an unexpected response body (HTTP ${response.status})` },
      };
    }

    if (!response.ok) {
      return { success: false, code: data.error, error: data };
    }
    if (!data.access || !data.refresh) {
      // A 2xx response with no tokens is not a successful sign-in -- don't
      // let the caller flip isLoggedIn on with nothing stored.
      return { success: false, code: 'missing_tokens', error: data };
    }

    try {
      await Sefaria.api.storeAuthToken(data);
    } catch (error) {
      // Keychain/Keystore write failed. The sign-in itself succeeded, but we
      // have nowhere to keep the credentials, so this is still a failure --
      // just not the server's fault.
      recordError(getCrashlytics(), error);
      return {
        success: false,
        code: 'storage_error',
        analyticsReason: 'storage_error',
        error: { non_field_errors: `Could not store credentials: ${error?.message}` },
      };
    }

    // Prefer the email claim from the signed ID token over the value from the
    // provider SDK's client-side user object: the ID token is verified
    // server-side, whereas Apple in particular only returns an email/fullName
    // on the user's very first authorization -- on every later sign-in
    // userData?.email is null, so trusting it would store an undefined email.
    let tokenEmail;
    try {
      tokenEmail = jwt_decode(idToken)?.email;
    } catch (error) {
      tokenEmail = undefined;
    }
    return {
      success: true,
      email: tokenEmail || userData?.email,
      // The mobile SSO endpoints don't return this today; forward it only if
      // a future backend response includes it rather than fabricating a value.
      ...(data.is_new_account !== undefined ? { is_new_account: data.is_new_account } : {}),
    };
  },
  refreshToken: function(refreshToken) {
    const url = `${Sefaria.api._baseHost}api/login/refresh/`;
    const authBody = {
      refresh: refreshToken,
    };
    return fetch(url, {
      method: "POST",
      body: JSON.stringify(authBody),
      headers: {
        "Content-Type": "application/json;charset=UTF-8"
      }
    });
  },
  authenticate: async function(authData, authMode = "login") {
    try {
      const parsedRes = await (authMode === 'login' ? Sefaria.api.login(authData) : Sefaria.api.register(authData)).then(res => res.json());
      if (!parsedRes.access) {
        return parsedRes;  // return errors
      } else if (!parsedRes.refresh) {
        // A 2xx response with an access token but no refresh token must not be
        // treated as a successful login -- surface it as a field error instead.
        return { non_field_errors: "Missing authentication tokens" };
      } else {
        await Sefaria.api.storeAuthToken(parsedRes);
      }
    } catch (error) {
      recordError(getCrashlytics(), error);
      return {
        non_field_errors: "Unknown authentication error"
      };
    }

  },

  storeAuthToken: async function({ access, refresh }) {
    const decodedToken = jwt_decode(access);
    Sefaria._auth = {
      token: access,
      expires: decodedToken.exp,
      uid: decodedToken.user_id,
      refreshToken: refresh,
    };
    // AFTER_FIRST_UNLOCK (rather than the WHEN_UNLOCKED default) so a
    // background token refresh can still write to the keychain while the
    // device is locked -- WHEN_UNLOCKED would fail that write outright.
    await Keychain.setGenericPassword(AUTH_KEYCHAIN_USERNAME, JSON.stringify(Sefaria._auth), { service: AUTH_KEYCHAIN_SERVICE, accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK });
  },

  // One-time migration of auth tokens from the legacy, unencrypted AsyncStorage
  // location into the keychain, so users who were already logged in before
  // this change shipped aren't signed out on upgrade. Safe to call repeatedly.
  _migrateLegacyAuthToken: async function() {
    const legacyAuth = await AsyncStorage.getItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
    if (!legacyAuth) { return; }
    let parsedLegacyAuth;
    try {
      parsedLegacyAuth = JSON.parse(legacyAuth);
    } catch (error) {
      // Malformed legacy value -- nothing recoverable, drop it.
      await AsyncStorage.removeItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
      return;
    }
    if (!parsedLegacyAuth || !parsedLegacyAuth.token) {
      await AsyncStorage.removeItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
      return;
    }
    // Only drop the legacy copy once the keychain write has actually
    // succeeded. If the keychain is unavailable (e.g. device locked), keep the
    // old value so the user isn't logged out with no way to recover -- the
    // migration will simply be retried on the next read.
    try {
      await Keychain.setGenericPassword(AUTH_KEYCHAIN_USERNAME, JSON.stringify(parsedLegacyAuth), { service: AUTH_KEYCHAIN_SERVICE, accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK });
    } catch (error) {
      // Keychain write failed (e.g. device locked) -- leave the legacy copy
      // in place and retry migration on the next read.
      return;
    }
    await AsyncStorage.removeItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
  },

  // Rehydrates Sefaria._auth from the Keychain, which is the sole source of
  // truth for the signed-in session -- nothing writes an 'auth' AsyncStorage
  // key anymore. Must be called once during app init (before any caller
  // relies on Sefaria._auth / isLoggedIn) so a cold start restores the
  // session instead of silently signing the user out. Never throws: a locked
  // device, Keychain error, or corrupt stored value degrades to a logged-out
  // Sefaria._auth = {} rather than crashing app init.
  hydrateAuthFromKeychain: async function() {
    await Sefaria.api._migrateLegacyAuthToken();
    try {
      const credentials = await Keychain.getGenericPassword({ service: AUTH_KEYCHAIN_SERVICE });
      Sefaria._auth = (credentials && JSON.parse(credentials.password)) || {};
    } catch (error) {
      recordError(getCrashlytics(), error);
      Sefaria._auth = {};
    }
    if (!Sefaria._auth.uid) { return false; /* logged out */ }
    // If the token is expired (or otherwise invalid), getAuthToken() will
    // walk the refresh-token path itself, clearing auth storage if that also
    // fails.
    await Sefaria.api.getAuthToken();
    return !!Sefaria._auth.uid;
  },

  getAuthToken: async function() {
    if (!Object.keys(Sefaria._auth).length) { return; /* logged out */ }
    const currTime = Sefaria.util.epoch_time();
    if (!Sefaria._auth.token || Sefaria._auth.expires <= currTime) {
      await Sefaria.api._migrateLegacyAuthToken();
      try {
        const credentials = await Keychain.getGenericPassword({ service: AUTH_KEYCHAIN_SERVICE });
        Sefaria._auth = (credentials && JSON.parse(credentials.password)) || {};
        if (!Sefaria._auth.token) { throw new Error("no token!"); }
        if (Sefaria._auth.expires <= currTime) { throw new Error("expired token"); }
        return;  // token is valid
      } catch (error) {
        // Covers a stale/expired/missing token as well as a Keychain read
        // failure (locked device, corrupt entry) -- in every case, fall back
        // to attempting a refresh with whatever refreshToken we last had.
        const parsedRes = await Sefaria.api.refreshToken(Sefaria._auth.refreshToken).then(res => res.json());
        if (!parsedRes.access) {
          Sefaria.api.clearAuthStorage();
        } else {
          Sefaria.api.storeAuthToken(parsedRes);
        }
      }
    }
  },
  clearAuthStorage: async function() {
    await Keychain.resetGenericPassword({ service: AUTH_KEYCHAIN_SERVICE });
    await AsyncStorage.removeItem('auth');
    await AsyncStorage.removeItem('lastSyncTime');
    await AsyncStorage.removeItem('lastSettingsUpdateTime');
    await AsyncStorage.removeItem('hasDismissedSyncModal');
    await AsyncStorage.removeItem('hasSyncedOnce');
    await AsyncStorage.removeItem('hasSwipeDeleted');
    Sefaria._auth = {};
    Sefaria.history._hasSwipeDeleted = false;
    const hasSyncedOnce = Sefaria.history._hasSyncedOnce;
    Sefaria.history._hasSyncedOnce = false;
    if (!hasSyncedOnce) { return; /* dont fully delete data if not backed up */}

    Sefaria.history.deleteHistory(true);
  },

/*
failSilently - if true, dont display a message if api call fails
*/
  _request: async function(ref, apiType, urlify, extra_args, failSilently, isPrivate) {
    const controller = new AbortController();
    const signal = controller.signal;
    if (isPrivate) {
      await Sefaria.api.getAuthToken();
      if (!Sefaria._auth.uid && failSilently) { return Promise.resolve(); }
    }
    const headers = isPrivate ? {'Authorization': `Bearer ${Sefaria._auth.token}`} : {};
    Sefaria.api._currentRequests[apiType] = controller;
    const url = Sefaria.api._toURL(ref, true, apiType, urlify, extra_args);
    return new Promise(function(resolve, reject) {
      fetch(url, {method: 'GET', signal, headers })
      .then(function(response) {
        if (response.status >= 200 && response.status < 300) {
          return response;
        } else {
          console.log('response code error', response);
          reject(response.statusText);
        }
      })
      .then(response => response.json())
      .then(json => {
        if ("error" in json) {
          if (!failSilently) {
            Alert.alert(
              strings.textUnavailable,
              strings.textUnavailableFromWebMessage,
              [{text: strings.ok, onPress: () => { reject("Return to Nav"); } }]);
          } else {
            reject("Return to Nav");
          }
        } else {
          Sefaria.api._currentRequests[apiType] = null;
          resolve(json);
        }
      })
      .catch((response)=>{
        console.log("API ERROR", response, url);
        if (failSilently) {
          reject("Return to Nav");
        } else {
          Alert.alert(
            strings.noInternet,
            strings.noInternetMessage,
            [
              {text: strings.cancel, onPress: () => { reject("Return to Nav"); }, style: 'cancel' },
              {text: strings.tryAgain, onPress: () => {
                Sefaria.api._request(ref,apiType, urlify, extra_args,failSilently,isPrivate).then(resolve);
              }}
            ]
          );
        }
      });
    });
  }
};

module.exports = Api;
