import {
  AlertIOS
} from 'react-native';

const RNFS    = require('react-native-fs'); //for access to file system -- (https://github.com/johanneslumpe/react-native-fs)
import strings from './LocalizedStrings';
import LinkContent from './LinkContent';

var Api = {
  /*
  takes responses from text and links api and returns json in the format of iOS json
  */
  _textCache: {}, //in memory cache for API data
  _linkCache: {},
  _versions: {},
  _translateVersions: {},
  _indexDetails: {},
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
  _toURL: function(ref, useHTTPS, apiType, { context, versions }) {
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
        default:
          console.error("You passed invalid type: ",apiType," into _toURL()");
          break;
      }
    }

    ref = ref.replace(/:/g,'.').replace(/ /g,'_');
    url += ref + urlSuffix;
    //console.log("URL",url);
    return url;
  },
  _text: function(ref, { context, versions }) {
    return new Promise((resolve, reject)=>{
      Sefaria.api._request(ref,'text', { context, versions })
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
    var bookRefStem  = Sefaria.textTitleForRef(ref);
    var zipPath      = Sefaria._zipSourcePath(bookRefStem);
    return new Promise((resolve,reject)=>{
      RNFS.exists(zipPath)
      .then((exists)=>{
        if (exists && !Sefaria.downloader._data.debugNoLibrary) {
          reject(); //you already opened these links from the file
        } else {
          if (ref in Sefaria.api._linkCache) {
            resolve(Sefaria.api._linkCache[ref]);
          } else {
            Sefaria.api._request(ref,'links', {})
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
        }
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
      if (!link_response[linkSegIndex]) {
        link_response[linkSegIndex] = [];
      }
      link_response[linkSegIndex].push({
        "category": link.category,
        "sourceRef": link.sourceRef, //.substring(0,link.sourceRef.lastIndexOf(':')),
        "sourceHeRef": link.sourceHeRef, //.substring(0,link.sourceHeRef.lastIndexOf(':')),
        "textTitle": link.index_title,
        "collectiveTitle": link.collectiveTitle.en,
        "heCollectiveTitle": link.collectiveTitle.he
      });
    }
    return text.map((seg,i) => ({
      "segmentNumber": seg.segmentNumber,
      "he": seg.he,
      "text": seg.text,
      "links": link_response[i] ? link_response[i] : []
    }));
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
      Sefaria.api._request(ref,'text', {context: true})
      .then((response)=>{
        numResponses += 1;
        textResponse = response;
        checkResolve(resolve);
      });
      Sefaria.api._request(ref,'links', {})
      .then((response)=>{
        numResponses += 1;
        linksResponse = response;
        checkResolve(resolve);
      });

    });
  },
  versions: function(ref, failSilently) {
    return new Promise((resolve, reject) => {
      if (ref in Sefaria.api._versions) {
        resolve(Sefaria.api._versions[ref]);
        return;
      }
      Sefaria.api._request(ref, 'versions', {}, failSilently)
        .then((response)=>{
          for (let v of response) {
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
        });
    });
  },
  versionLanguage: function(versionTitle) {
    // given a versionTitle, return the language of the version
    return Sefaria.api._translateVersions[versionTitle]["lang"]
  },
  /*
  context is a required param if apiType == 'text'. o/w it's ignored
  versions is object with keys { en, he } specifying version titles
  failSilently - if true, dont display a message if api call fails
  */
  _request: function(ref, apiType, { context, versions }, failSilently) {
    var url = Sefaria.api._toURL(ref, true, apiType, { context, versions });
    return new Promise(function(resolve, reject) {
      fetch(url)
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
          AlertIOS.alert(
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
          AlertIOS.alert(
            strings.noInternet,
            strings.noInternetMessage,
            [
              {text: strings.cancel, onPress: () => { reject("Return to Nav"); }, style: 'cancel' },
              {text: strings.tryAgain, onPress: () => {
                Sefaria.api._request(ref,apiType, { context, versions },failSilently).then(resolve);
              }}
            ]
          );
        }
      });
    });
  }
}

module.exports = Api;
