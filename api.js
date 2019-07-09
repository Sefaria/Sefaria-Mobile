import {
  Alert
} from 'react-native';
import 'abortcontroller-polyfill';

import strings from './LocalizedStrings';
import LinkContent from './LinkContent';
import AsyncStorage from '@react-native-community/async-storage';
import jwt_decode from 'jwt-decode';

var Api = {
  /*
  takes responses from text and links api and returns json in the format of iOS json
  */
  _baseHost: 'http://localhost:8000/', //'http://jwt.sandbox.sefaria.org/',
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
  _toURL: function(ref, useHTTPS, apiType, urlify, { context, versions, more_data, uid }) {
    let url = Sefaria.api._baseHost;

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
          urlSuffix = `?more_data=${more_data === true ? 1 : 1}`;
          break;
        case "name":
          url += "api/name/";
          //urlSuffix = '?ref_only=0';
          break;
        case "userSheets":
          url += `api/sheets/user/${uid}`;
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

  mySheets: async function() {
    await Sefaria.api.getAuthToken();
    if (!Sefaria._auth.uid) { alert("Not signed in"); return; }
    const response = await Sefaria.api.userSheets(Sefaria._auth.uid);
    return response.sheets;
  },

  userSheets: async function(uid) {
    const response = await Sefaria.api._request('', 'userSheets', false, { uid }, false, true);
    return response;
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
  urlFormEncode: function(data) {
    return Object.entries(data).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`).join('&');
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
      'g-recaptcha-response': authData.g_recaptcha_response,
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
    const parsedRes = await (authMode === 'login' ? Sefaria.api.login(authData) : Sefaria.api.register(authData)).then(res => res.json());
    console.log(parsedRes);
    if (!parsedRes.access) {
      return parsedRes;  // return errors
    } else {
      await Sefaria.api.storeAuthToken(parsedRes);
    }
  },

  storeAuthToken: async function({ access, refresh }) {
    const decodedToken = jwt_decode(access);
    console.log('decoded', decodedToken);
    Sefaria._auth = {
      token: access,
      expires: decodedToken.exp,
      uid: decodedToken.user_id,
      refreshToken: refresh,
    };
    await AsyncStorage.setItem("auth", JSON.stringify(Sefaria._auth));
  },

  getAuthToken: async function() {
    const currTime = Sefaria.util.epoch_time();
    if (!Sefaria._auth.token || Sefaria._auth.expires <= currTime) {
      const tempAuth = await AsyncStorage.getItem("auth");
      Sefaria._auth = JSON.parse(tempAuth);
      try {
        if (Sefaria._auth.expires <= currTime) { throw new Error("expired token"); }
        return;  // token is valid
      } catch (error) {
        // use refreshToken to get new authToken
        const parsedRes = await Sefaria.api.refreshToken(Sefaria._auth.refreshToken).then(res => res.json());
        if (!parsedRes.access) {
          Sefaria.api.clearAuthStorage();
          throw new Error("expired refresh token");
        }
        console.log("successfully refreshed token");
        Sefaria.api.storeAuthToken(parsedRes);
      }
    }
  },
  clearAuthStorage: function() {
    AsyncStorage.removeItem('auth');
  },

/*
context is a required param if apiType == 'text'. o/w it's ignored
versions is object with keys { en, he } specifying version titles
failSilently - if true, dont display a message if api call fails
*/
  _request: async function(ref, apiType, urlify, { context, versions, more_data, uid }, failSilently, isPrivate) {
    const controller = new AbortController();
    const signal = controller.signal;
    if (isPrivate) { await Sefaria.api.getAuthToken(); }
    const headers = isPrivate ? {'Authorization': `Bearer ${Sefaria._auth.token}`} : {};
    Sefaria.api._currentRequests[apiType] = controller;
    const url = Sefaria.api._toURL(ref, true, apiType, urlify, { context, versions, more_data, uid });
    return new Promise(function(resolve, reject) {
      fetch(url, {method: 'GET', signal, headers })
      .then(function(response) {
        //console.log('checking response',response.status);
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
};

module.exports = Api;
