import {
    Alert, Platform
} from 'react-native';

import FilterNode from './FilterNode';
import strings from './LocalizedStrings';
import RNFS from 'react-native-fs';

var Search = {
  baseUrl: "https://search.sefaria.org/merged/_search/",
  _cache: {},
  cache: function(key, result) {
    if (result !== undefined) {
      this._cache[key] = result;
    }
    return this._cache[key]
  },
  search_toc: null,
  _loadSearchTOC: function() {
    return Sefaria.util.openFileInSources('search_toc.json').then(data => {
      Sefaria.search.search_toc = data;
    });
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
    sort_type: chronological or relevance
    exact: if query is exact
    */
    return new Promise((resolve, reject)=>{
      if (!args.query) {
        reject();
      }
      var req = JSON.stringify(Sefaria.search.get_query_object(args.query, args.get_filters, args.applied_filters, args.size, args.from, args.type, args.sort_type, args.exact));
      var cache_result = this.cache(req);
      //console.log("cache",JSON.stringify(cache_result));
      if (cache_result) {
        resolve(cache_result);
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
        resolve(response.json());
      })
      .catch(()=>{
        Alert.alert(
          strings.noInternet,
          strings.noInternetMessage,
          [
            {text: strings.cancel, onPress: () => {reject("Canceled")}, style: 'cancel'},
            {text: strings.tryAgain, onPress: () => {
              Sefaria.search.execute_query(args).then(resolve);
            }}
          ]);
        });
      });
    },
    get_query_object: function (query, get_filters, applied_filters, size, from, type, sort_type, exact) {
      /*
      Only the first argument - "query" - is required.

      query: string
      get_filters: boolean
      applied_filters: null or list of applied filters (in format supplied by Filter_Tree...)
      size: int - number of results to request
      from: int - start from result # (skip from - 1 results)
      type: string - currently either "texts" or "sheets"
      field: string - which field to query. this essentially changes the exactness of the search. right now, 'exact' or 'naive_lemmatizer'
      sort_type: "relevance", "chronological"
      exact: boolean. true if query should be exact
      */

      var field = exact ? "exact" : "naive_lemmatizer";

      var core_query = {
        "match_phrase": {

        }
      };

      core_query['match_phrase'][field] = {
        "query": query.replace(/(\S)"(\S)/g, '$1\u05f4$2'), //Replace internal quotes with gershaim.
      };

      if (!exact) {
        core_query['match_phrase'][field]['slop'] = 10;
      }

      var o = {
        "from": from,
        "size": size,
        /*"_source": {
          "exclude": [ field ]
        },*/
        "highlight": {
          "pre_tags": ["<b>"],
          "post_tags": ["</b>"],
          "fields": {}
        }
      };

      o["highlight"]["fields"][field] = {"fragment_size": 200};


      if (sort_type == "chronological") {
        o["sort"] = [
          {"comp_date": {}},
          {"order": {}}                 // the sort field name is "order"
        ];
      } else if (sort_type == "relevance") {

        o["query"] = {
          "function_score": {
            "field_value_factor": {
              "field": "pagesheetrank",
              "missing": 0.04     // this default value comes from the equation used to calculate pagesheetrank. see search.py where this field is created
            }
          }
        }
      }
      const has_filters = !!applied_filters && applied_filters.length > 0;
      var inner_query = {};
      if (get_filters && !has_filters) {
        //Initial, unfiltered query.  Get potential filters.
        if (type) {
          inner_query = {
            filtered: {
              query: core_query,
              filter: {type: {value: type}}
            }
          };
        } else {
          inner_query = core_query;
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
          inner_query = {
            filtered: {
              query: core_query,
              filter: {type: {value: type}}
            }
          };
        } else {
          inner_query = core_query;
        }
      } else {
        //Filtered query.  Add clauses.  Don't re-request potential filters.
        var clauses = [];
        for (var i = 0; i < applied_filters.length; i++) {

          var filterSuffix = applied_filters[i].indexOf("/") != -1 ? ".*" : "/.*"; //filters with '/' might be leading to books. also, very unlikely they'll match an false positives
          clauses.push({
            "regexp": {
              "path": Sefaria.util.regexEscape(applied_filters[i]) + filterSuffix
            }
          });
          /* Test for Commentary2 as well as Commentary */
        }
        if (type) {
          inner_query = {
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
          inner_query = {
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
        if (get_filters) {
          o['aggs']['category'] = {
            "terms": {
              "field": "path",
              "size": 0
            }
          };
        }
      }

      //after that confusing logic, hopefully inner_query is defined properly
      if (sort_type == "chronological") {
        o['query'] = inner_query;
      } else if (sort_type == "relevance") {
        o['query']['function_score']['query'] = inner_query;
      }
      console.log(JSON.stringify(o));
      return o;
    },
    _buildFilterTree(aggregation_buckets, appliedFilters) {
      //returns object w/ keys 'availableFilters', 'registry'
      //Add already applied filters w/ empty doc count?
      var rawTree = {};

      appliedFilters.forEach(
        fkey => this._addAvailableFilter(rawTree, fkey, {"docCount":0})
      );

      aggregation_buckets.forEach(
        f => this._addAvailableFilter(rawTree, f["key"], {"docCount":f["doc_count"]})
      );
      this._aggregate(rawTree);
      return this._build(rawTree);
    },
    _addAvailableFilter(rawTree, key, data) {
      //key is a '/' separated key list, data is an arbitrary object
      //Based on http://stackoverflow.com/a/11433067/213042
      var keys = key.split("/");
      var base = rawTree;

      // If a value is given, remove the last name and keep it for later:
      var lastName = arguments.length === 3 ? keys.pop() : false;

      // Walk the hierarchy, creating new objects where needed.
      // If the lastName was removed, then the last object is not set yet:
      var i;
      for(i = 0; i < keys.length; i++ ) {
        base = base[ keys[i] ] = base[ keys[i] ] || {};
      }

      // If a value was given, set it to the last name:
      if( lastName ) {
        base = base[ lastName ] = data;
      }

      // Could return the last object in the hierarchy.
      // return base;
    },
    _aggregate(rawTree) {
      //Iterates the raw tree to aggregate doc_counts from the bottom up
      //Nod to http://stackoverflow.com/a/17546800/213042
      walker("", rawTree);
      function walker(key, branch) {
        if (branch !== null && typeof branch === "object") {
          // Recurse into children
          Object.keys(branch).forEach((key) => {
            walker(key, branch[key]);
          });
          // Do the summation with a hacked object 'reduce'
          if ((!("docCount" in branch)) || (branch["docCount"] === 0)) {
            branch["docCount"] = Object.keys(branch).reduce(function (previous, key) {
              if (typeof branch[key] === "object" && "docCount" in branch[key]) {
                previous += branch[key].docCount;
              }
              return previous;
            }, 0);
          }
        }
      }
    },
    _build(rawTree) {
      //returns dict w/ keys 'availableFilters', 'registry'
      //Aggregate counts, then sort rawTree into filter objects and add Hebrew using Sefaria.toc as reference
      //Nod to http://stackoverflow.com/a/17546800/213042
      var path = [];
      var filters = [];
      var registry = {};

      var commentaryNode = new FilterNode();


      for(var j = 0; j < Sefaria.search.search_toc.length; j++) {
        var b = walk.call(this, Sefaria.search.search_toc[j]);
        if (b && b.children.length > 0) filters.push(b); // added check for children length to weed out categories without any children that appear in current toc

        // If there is commentary on this node, add it as a sibling
        if (commentaryNode.hasChildren()) {
          var toc_branch = Sefaria.toc[j];
          var cat = toc_branch["category"];
          // Append commentary node to result filters, add a fresh one for the next round
          var docCount = 0;
          if (rawTree.Commentary && rawTree.Commentary[cat]) { docCount += rawTree.Commentary[cat].docCount; }
          if (rawTree.Commentary2 && rawTree.Commentary2[cat]) { docCount += rawTree.Commentary2[cat].docCount; }
          Object.assign(commentaryNode, {
            "title": cat + " Commentary",
            "path": "Commentary/" + cat,
            "heTitle": "מפרשי" + " " + toc_branch["heCategory"],
            "docCount": docCount
          });
          registry[commentaryNode.path] = commentaryNode;
          filters.push(commentaryNode);
          commentaryNode = new FilterNode();
        }
      }

      return {availableFilters: filters, registry: registry};

      function walk(branch, parentNode) {
        var node = new FilterNode();

        node["docCount"] = 0;

        if("category" in branch) { // Category node
          //if (branch['category'] === "Philosophy Commentaries") {
          //  debugger;
          //}
          path.push(branch["category"]);  // Place this category at the *end* of the path
          Object.assign(node, {
            "title": path.slice(-1)[0],
            "path": path.join("/"),
            "heTitle": branch["heCategory"]
          });

          for(var j = 0; j < branch["contents"].length; j++) {
            var b = walk.call(this, branch["contents"][j], node);
            if (b) node.append(b);
          }
        }
        else if ("title" in branch) { // Text Node
          path.push(branch["title"]);
          Object.assign(node, {
            "title": path.slice(-1)[0],
            "path": path.join("/"),
            "heTitle": branch["heTitle"]
          });
        }

        try {
          var rawNode = rawTree;
          var i;

          for (i = 0; i < path.length; i++) {
            //For TOC nodes that we don't have results for, we catch the exception below.
            rawNode = rawNode[path[i]];
          }
          node["docCount"] += rawNode.docCount;


          // Do we need both of these in the registry?
          //registry[node.getId()] = node;
          registry[node.path] = node;

          path.pop();
          return node;
        }
        catch (e) {
          path.pop();
          return false;
        }
      }
    },
    _applyFilters(ftree, appliedFilters) {
      var orphans = [];  // todo: confirm behavior
      appliedFilters.forEach(path => {
        var node = ftree.registry[path];
        if (node) { node.setSelected(true); }
        else { orphans.push(path); }
      });
      return orphans;
    },
  };

export default Search;
