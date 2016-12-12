import {
  AlertIOS
} from 'react-native';

const RNFS    = require('react-native-fs'); //for access to file system -- (https://github.com/johanneslumpe/react-native-fs)
const strings = require('./LocalizedStrings');

var Api = {
  /*
  takes responses from text and links api and returns json in the format of iOS json
  */
  _textCache: {}, //in memory cache for API data
  _linkCache: {},
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

      return {
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
  _toURL: function(ref, useHTTPS, apiType, context) {
    var url = '';
    if (useHTTPS) {
      url += 'https://www.sefaria.org/';
    } else {
      url += 'http://www.sefaria.org/';
    }

    var urlSuffix = '';
    if (apiType) {
      switch (apiType) {
        case "text":
          url += 'api/texts/';
          urlSuffix = `?context=${context === true ? 1 : 0}&commentary=0`;
          break;
        case "links":
          url += 'api/links/';
          urlSuffix = '?with_text=0';
          break;
        case "index":
          url += 'api/v2/index/';
          urlSuffix = '?with_content_counts=1';
          break;
        default:
          console.error("You passed invalid type: ",apiType," into _urlForRef()");
          break;
      }
    }

    ref = ref.replace(/:/g,'.').replace(/ /g,'_');
    url += ref + urlSuffix;
    console.log("URL",url);
    return url;
  },
  _text: function(ref) {
    return new Promise((resolve, reject)=>{
      Sefaria.api._request(ref,'text',true)
      .then((response)=>{
        resolve({"text": response, "links": [], "ref": ref});
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
            Sefaria.api._request(ref,'links')
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
        "textTitle": link.index_title
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
      Sefaria.api._request(ref,'text',true)
      .then((response)=>{
        numResponses += 1;
        textResponse = response;
        checkResolve(resolve);
      });
      Sefaria.api._request(ref,'links')
      .then((response)=>{
        numResponses += 1;
        linksResponse = response;
        checkResolve(resolve);
      });

    });
  },
  /*
  context is a required param if apiType == 'text'. o/w it's ignored
  */
  _request: function(ref, apiType, context) {
    var url = Sefaria.api._toURL(ref, false, apiType, context);
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
      .catch(()=>{
        AlertIOS.alert(
          strings.noInternet,
          strings.noInternetMessage,
          [
            {text: strings.tryAgain, onPress: () => {
              Sefaria.api._request(ref,apiType,context).then(resolve);
            }}
          ]);
      });
    });
  }
}

module.exports = Api;
