/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

import React, { Component } from 'react';
import {
  ActivityIndicatorIOS,
  AlertIOS,
  Animated,
  AppRegistry,
  AppState,
  Dimensions,
  Linking,
	ListView,
	Modal,
  NetInfo,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

var styles      = require('./Styles');
var strings     = require('./LocalizedStrings');
var themeWhite  = require('./ThemeWhite');
var themeBlack  = require('./ThemeBlack');
var Sefaria     = require('./sefaria');
var ReaderPanel = require('./ReaderPanel');
var LinkFilter  = require('./LinkFilter');
const ViewPort  = Dimensions.get('window');

var {
  LoadingView,
  CategoryColorLine,
} = require('./Misc.js');


class ReaderApp extends React.Component {
  constructor(props, context) {
    super(props, context);
    Sefaria.init().then(function() {
        this.setState({
          loaded: true,
          defaultSettingsLoaded: true,
        });
        this.setDefaultTheme();

        var ref =  Sefaria.recent.length ? Sefaria.recent[0].ref : "Genesis 1";
        this.openRef(ref);

    }.bind(this));
    Sefaria.track.init();
    NetInfo.isConnected.addEventListener(
      'change',
      this.networkChangeListener
    );

    this.state = {
        offsetRef: null, /* used to jump to specific ref when opening a link*/
        segmentRef: "", /* only used for highlighting right now */
        segmentIndexRef: -1,
        sectionIndexRef: -1,
        textReference: "",
        textTitle: "",
        loaded: false,
        defaultSettingsLoaded: false,
        menuOpen: "navigation",
        subMenuOpen: null, // currently only used to define subpages in search
        navigationCategories: [],
        loadingTextTail: false,
        loadingTextHead: false,
        textListVisible: false,
        textListFlex: 0.6,
        textListAnimating: false,
        data: null,
        linksLoaded: [],  // bool arrary corresponding to data indicating if links have been loaded, which occurs async with API
        interfaceLang: strings.getLanguage() === "he" ? "hebrew" : "english", // TODO check device settings for Hebrew: ### import {NativeModules} from 'react-native'; console.log(NativeModules.SettingsManager.settings.AppleLocale);
        filterIndex: null, /* index of filters in recentFilters */
        linkSummary: [],
        linkContents: [],
        linkRecentFilters: [],
        linkStaleRecentFilters: [], /*bool array indicating whether the corresponding filter in recentFilters is no longer synced up with the current segment*/
        loadingLinks: false,
        theme: themeWhite,
        themeStr: "white",
        searchQuery: '',
        searchSort: 'relevance', // relevance or chronological
        availableSearchFilters: [],
        appliedSearchFilters: [],
        orphanSearchFilters: [],
        searchFiltersValid: false,
        searchIsExact: false,
        isQueryRunning: false,
        isQueryLoadingTail: false,
        isNewSearch: false,
        currSearchPage: 0,
        initSearchScrollPos: 0,
        numSearchResults: 0,
        searchQueryResult: [],
        backStack: []
    };
  }

  componentDidMount() {
    AppState.addEventListener('change', state => {
      if (state == "active") {
        Sefaria.downloader.resumeDownload();
      }
    });
    Sefaria.downloader.promptLibraryDownload();
    Sefaria._deleteUnzippedFiles().then(function() {

       }).catch(function(error) {
        console.error('Error caught from Sefaria._deleteAllFiles', error);
      });
  }

  networkChangeListener = (isConnected) => {
    this.setState({hasInternet: isConnected});
  };

  textSegmentPressed = (section, segment, segmentRef, shouldToggle) => {
      //console.log("textSegmentPressed", section, segment, segmentRef, shouldToggle);
      Sefaria.track.event("Reader","Text Segment Click", segmentRef);

      if (shouldToggle && this.state.textListVisible) {
          this.setState({textListVisible: false});
          return; // Don't bother with other changes if we are simply closing the TextList
      }
      if (!this.state.data[section][segment]) {
        return;
      }
      let loadingLinks = false;
      if (segment !== this.state.segmentIndexRef) {

          loadingLinks = true;
          if (this.state.linksLoaded[section]) {
            this.updateLinkSummary(section, segment);
          }
      }
      let stateObj = {
          segmentRef: segmentRef,
          segmentIndexRef: segment,
          sectionIndexRef: section,
          linkStaleRecentFilters: this.state.linkRecentFilters.map(()=>true),
          loadingLinks: loadingLinks
      };
      if (shouldToggle) {
        stateObj.textListVisible = !this.state.textListVisible;
        stateObj.offsetRef = null; //offsetRef is used to highlight. once you open textlist, you should remove the highlight
      }
      this.setState(stateObj);
      this.forceUpdate();
  };

  loadNewText = (ref) => {
      this.setState({
          loaded: false,
          data: [],
          textReference: ref,
          textTitle: Sefaria.textTitleForRef(ref),
          segmentIndexRef: -1,
          sectionIndexRef: -1
      });

      if (ref.indexOf("-") != -1) {
        // Open ranged refs to their first segment (not ideal behavior, but good enough for now)
        ref = ref.split("-")[0];
      }

      Sefaria.data(ref).then(function(data) {
          var linkSummary = [];
          var loadingLinks = false;
          /*TODO these lines of code seem useless. I'll keep them here for a bit and see if it causes any issues (-Noah Nov 14, 2016) NOTE: If you are reading this (long) comment many months after this date, feel free to delete this useless code. Good luck!
          if (data.content && data.content.links) {
              console.log("HERE");
              loadingLinks = true;
              Sefaria.links.linkSummary(data.ref, data.content[this.state.segmentIndexRef].links).then(()=>
                this.setState({linkSummary: linkSummary, loadingLinks: false})
              );
          }*/
          this.setState({
              data:              [data.content],
              textTitle:         data.indexTitle,
              next:              data.next,
              prev:              data.prev,
              heTitle:           data.heTitle,
              heRef:             data.heRef,
              sectionArray:      [data.ref],
              sectionHeArray:    [data.heRef],
              linksLoaded:       [false],
              loaded:            true,
              filterIndex:       null, /*Reset link state */
              linkRecentFilters: [],
              linkSummary:       linkSummary,
              linkContents:      [],
              loadingLinks:      loadingLinks,
              textListVisible:   false,
              offsetRef:         !data.isSectionLevel ? data.requestedRef : null,
          }, ()=>{this.loadLinks(data.sectionRef)});
          Sefaria.links.reset();
          // Preload Text TOC data into memory
          Sefaria.textToc(data.indexTitle, function() {});


          Sefaria.saveRecentItem({ref: ref, heRef: data.heRef, category: Sefaria.categoryForRef(ref)});
      }.bind(this)).catch(function(error) {
        console.log(error);
        if (error == "Return to Nav") {
          this.openNav();
          return;
        }
        console.error('Error caught from ReaderApp.loadNewText', error);
      }.bind(this));

  };

  loadLinks = (ref) => {
    // Ensures that links have been loaded for `ref` and stores result in `this.state.linksLoaded` array.
    // Within Sefaria.api.links a check is made if the zip file exists. If so then no API call is made and links
    // are marked as having already been loading by previoius call to Sefaria.data.
    Sefaria.api.links(ref)
      .then((linksResponse)=>{
        //add the links into the appropriate section and reload
        this.state.sectionArray.map((secRef,iSec)=>{
          if (secRef == ref) {
            this.state.data[iSec] = Sefaria.api.addLinksToText(this.state.data[iSec],linksResponse);
            let tempLinksLoaded = this.state.linksLoaded.slice(0);
            tempLinksLoaded[iSec] = true;
            if (this.state.segmentIndexRef != -1 && this.state.sectionIndexRef != -1) {
              this.updateLinkSummary(this.state.sectionIndexRef, this.state.segmentIndexRef);
            }

            this.setState({data: this.state.data, linksLoaded: tempLinksLoaded});
          }
        });
      })
      .catch(()=>{
        this.state.sectionArray.map((secRef, iSec)=>{
          if (secRef == ref) {
            let tempLinksLoaded = this.state.linksLoaded.slice(0);
            tempLinksLoaded[iSec] = true;
            this.setState({linksLoaded: tempLinksLoaded});
          }
        });

      });
  };

  updateData = (direction, shouldCull) => {
      // direction: either "next" or "prev"
      // shouldCull: bool, if True, remove either first or last section (depending on `direction`)
      if (direction === "next" && this.state.next) {
          this.updateDataNext(shouldCull);
          Sefaria.track.event("Reader","Infinite Scroll","Down");
      } else if (direction == "prev" && this.state.prev) {
          this.updateDataPrev(shouldCull);
          Sefaria.track.event("Reader","Infinite Scroll","Up");
      }
  };

  updateDataPrev = (shouldCull) => {
      this.setState({loadingTextHead: true});
      Sefaria.data(this.state.prev).then(function(data) {

        var updatedData = [data.content].concat(this.state.data);

        var newTitleArray = this.state.sectionArray;
        var newHeTitleArray = this.state.sectionHeArray;
        var newlinksLoaded = this.state.linksLoaded;
        newTitleArray.unshift(data.sectionRef);
        newHeTitleArray.unshift(data.heRef);
        newlinksLoaded.unshift(false);
        let culledSectionRef = null;
        if (shouldCull) {
          updatedData.pop();
          culledSectionRef = newTitleArray.pop();
          newHeTitleArray.pop();
          newlinksLoaded.pop();
        }

        this.setState({
          data: updatedData,
          prev: data.prev,
          next: shouldCull ? culledSectionRef : this.state.next,
          sectionArray: newTitleArray,
          sectionHeArray: newHeTitleArray,
          linksLoaded: newlinksLoaded,
          loaded: true,
          loadingTextHead: false,
        }, ()=>{this.loadLinks(data.sectionRef)});

      }.bind(this)).catch(function(error) {
        console.log('Error caught from ReaderApp.updateDataPrev', error);
      });
  };

  updateDataNext = (shouldCull) => {
      this.setState({loadingTextTail: true});
      Sefaria.data(this.state.next).then(function(data) {

        var updatedData = this.state.data.concat([data.content]);
        var newTitleArray = this.state.sectionArray;
        var newHeTitleArray = this.state.sectionHeArray;
        var newlinksLoaded = this.state.linksLoaded;
        newTitleArray.push(data.sectionRef);
        newHeTitleArray.push(data.heRef);
        newlinksLoaded.push(false);
        let culledSectionRef = null
        if (shouldCull) {
          updatedData.shift();
          culledSectionRef = newTitleArray.shift();
          newHeTitleArray.shift();
          newlinksLoaded.shift();
        }

        this.setState({
          data: updatedData,
          prev: shouldCull ? culledSectionRef : this.state.prev,
          next: data.next,
          sectionArray: newTitleArray,
          sectionHeArray: newHeTitleArray,
          linksLoaded: newlinksLoaded,
          loaded: true,
          loadingTextTail: false,
        }, ()=>{this.loadLinks(data.sectionRef)});

      }.bind(this)).catch(function(error) {
        console.log('Error caught from ReaderApp.updateDataNext', error);
      });
  };

  updateTitle = (ref, heRef) => {
      //console.log("updateTitle");
      this.setState({
        textReference: ref,
        heRef: heRef
      });
      Sefaria.saveRecentItem({ref: ref, heRef: heRef, category: Sefaria.categoryForRef(ref)});
  };

  /*
  calledFrom parameter used for analytics and for back button
  prevScrollPos parameter used for back button
  */
  openRef = (ref, calledFrom) => {
      if (!Sefaria.textTitleForRef(ref)) {
        AlertIOS.alert(
          strings.textUnavailable,
          strings.promptOpenOnWebMessage,
          [
            {text: strings.cancel, style: 'cancel'},
            {text: strings.open, onPress: () => {
              Linking.openURL("https://www.sefaria.org/" + ref.replace(/ /g, "_"));
            }}
          ]);
        return;
      }
      this.setState({
        loaded: false,
        textReference: ref
      }, function() {
          this.closeMenu(); // Don't close until these values are in state, so we know if we need to load defualt text
      }.bind(this));

      this.loadNewText(ref);

      switch (calledFrom) {
        case "search":
          Sefaria.track.event("Search","Search Result Text Click",this.state.searchQuery + ' - ' + ref);
          //this.state.backStack=["SEARCH:"+this.state.searchQuery];
          this.addBackItem("search", this.state.searchQuery);
          break;
        case "navigation":
          Sefaria.track.event("Reader","Navigation Text Click", ref);
          break;
        case "text toc":
          break;
        case "text list":
          Sefaria.track.event("Reader","Click Text from TextList",ref);
          //this.state.backStack.push(this.state.segmentRef);
          this.addBackItem("text list", this.state.segmentRef);
          break;
        default:
          break;
      }
  };

  addBackItem = (page, state) => {
    //page - currently can be either "search", "search filter", or "text list"
    //state - state object required to rebuild previous state
    this.state.backStack.push({"page": page, "state": state});
  };

  openMenu = (menu) => {
    this.setState({menuOpen: menu});
  };

  openSubMenu = (subMenu) => {
    this.setState({subMenuOpen: subMenu});
  };

  closeMenu = () => {
      this.clearMenuState();
      this.openMenu(null);
      if (!this.state.textReference) {
          this.openDefaultText();
      }
  };

  openNav = () => {
      this.setState({loaded: true});
      this.openMenu("navigation");
  };

  goBack = () => {
    if /* last page was search page */((this.state.backStack.slice(-1)[0]).page === "search") {
      this.onQueryChange((this.state.backStack.pop()).state,true,true);
      this.openSearch();
    }
    else /*is ref*/ {
    this.openRef(this.state.backStack.pop().state);
    }
  };

  setNavigationCategories = (categories) => {
      this.setState({navigationCategories: categories});
  };

  setInitSearchScrollPos = (pos) => {
      this.setState({initSearchScrollPos: pos});
  };

  openTextToc = () => {
      this.openMenu("text toc");
  };

  openSearch = (query) => {
      this.openMenu("search");
  };

  clearMenuState = () => {
      this.setState({
          navigationCategories: []
      });
  };

  openDefaultText = () => {
      this.loadNewText("Genesis 1");
  };

  openLinkCat = (filter) => {
      var filterIndex = null;
      //check if filter is already in recentFilters
      for (let i = 0; i < this.state.linkRecentFilters.length; i++) {
          let tempFilter = this.state.linkRecentFilters[i];
          if (tempFilter.title == filter.title) {
            filterIndex = i;
            if (this.state.linkStaleRecentFilters[i]) {
              this.state.linkRecentFilters[i] = filter;
              this.state.linkStaleRecentFilters[i] = false;
            }
            break;
          }
      }

      //if it's not in recentFilters, add it
      if (filterIndex == null) {
          this.state.linkRecentFilters.unshift(filter);
          if (this.state.linkRecentFilters.length > 5)
            this.state.linkRecentFilters.pop();
          filterIndex = 0;
      }

      var linkContents = filter.refList.map((ref)=>null);
      Sefaria.links.reset();
      this.setState({
          filterIndex: filterIndex,
          recentFilters: this.state.linkRecentFilters,
          linkStaleRecentFilters: this.state.linkStaleRecentFilters,
          linkContents: linkContents
      });
  };

  closeLinkCat = () => {
    this.setState({filterIndex: null});
    Sefaria.track.event("Reader","Show All Filters Click","1");
  };

  updateLinkSummary = (section, segment) => {
    Sefaria.links.linkSummary(this.state.textReference, this.state.data[section][segment].links).then((data) => {
      this.setState({linkSummary: data, loadingLinks: false});
      this.updateLinkCat(data, null); // Set up `linkContents` in their initial state as an array of nulls
    });
  };

  updateLinkCat = (linkSummary, filterIndex) => {
      //search for the current filter in the the links object
      if (this.state.filterIndex == null) return;
      if (linkSummary == null) linkSummary = this.state.linkSummary;
      if (filterIndex == null) filterIndex = this.state.filterIndex;

      var filterStr   = this.state.linkRecentFilters[filterIndex].title;
      var filterStrHe = this.state.linkRecentFilters[filterIndex].heTitle;
      var category    = this.state.linkRecentFilters[filterIndex].category;
      var collectiveTitle = this.state.linkRecentFilters[filterIndex].collectiveTitle;
      var heCollectiveTitle = this.state.linkRecentFilters[filterIndex].heCollectiveTitle;
      var nextRefList = [];

      for (let cat of linkSummary) {
          if (cat.category == filterStr) {
            nextRefList = cat.refList;
            break;
          }
          for (let book of cat.books) {
            if (book.title == filterStr) {
              nextRefList = book.refList;
              break;
            }
          }
      }
      var nextFilter = new LinkFilter(filterStr, filterStrHe, collectiveTitle, heCollectiveTitle, nextRefList, category);

      this.state.linkRecentFilters[filterIndex] = nextFilter;

      var linkContents = nextFilter.refList.map((ref)=>null);
      Sefaria.links.reset();
      this.setState({
          filterIndex: filterIndex,
          linkRecentFilters: this.state.linkRecentFilters,
          linkContents: linkContents
      });
  };

  loadLinkContent = (ref, pos) => {
    // Loads text content for `ref` then inserts it into `this.state.linkContents[pos]`
    var isLinkCurrent = function(ref, pos) {
      // check that we haven't loaded a different link set in the mean time
      if (typeof this.state.linkRecentFilters[this.state.filterIndex] === "undefined") { return false;}
      var refList = this.state.linkRecentFilters[this.state.filterIndex].refList;
      if (pos > refList.length) { return false; }
      return (refList[pos] === ref);
    }.bind(this);
    var resolve = (data) => {
      if (isLinkCurrent(ref, pos)) {
          this.onLinkLoad(pos, data);
      }
    };
    var reject = (error) => {
      if (error != 'inQueue') {
        if (isLinkCurrent(ref, pos)) {
            this.onLinkLoad(pos, {en:JSON.stringify(error), he:JSON.stringify(error), sectionRef: ""});
        }
      }
    };

    var resolveClosure = function(ref, pos, data) {
      resolve(data);
    }.bind(this,ref,pos);

    var rejectClosure = function(ref, pos, data) {
      reject(data);
    }.bind(this,ref,pos);

    Sefaria.links.loadLinkData(ref, pos, resolveClosure, rejectClosure).then(resolve).catch(reject);
  };

  onLinkLoad = (pos, data) => {
    this.state.linkContents[pos] = data;
    this.setState({linkContents: this.state.linkContents});
  };

  clearOffsetRef = () => {
    /* used after TextList has used the offsetRef to render initially*/
    this.setState({offsetRef:null});
  };

  setTheme = (themeStr) => {
    if (themeStr === "white") { this.state.theme = themeWhite; }
    else if (themeStr === "black") { this.state.theme = themeBlack; }
    this.setState({theme: this.state.theme, themeStr: themeStr});
    Sefaria.settings.set("color", themeStr);
  };

  setDefaultTheme = () => {
    this.setTheme(Sefaria.settings.color);
  };

  onTextListDragStart = (evt) => {
    let headerHeight = 75;
    let flex = 1.0 - (evt.nativeEvent.pageY-headerHeight)/(ViewPort.height-headerHeight);
    // Save an offset which represent how high inside the header the click started
    this._textListDragOffset = this.state.textListFlex - flex;
    return !this.state.textListAnimating;
  };

  onTextListDragMove = (evt) => {
    if (this.state.textListAnimating) return;

    let headerHeight = 75;
    let flex = 1.0 - (evt.nativeEvent.pageY-headerHeight)/(ViewPort.height-headerHeight) + this._textListDragOffset;
    if (flex > 0.999) {
      flex = 0.999;
    } else if (flex < 0.001) {
      flex = 0.001;
    }
    //console.log("moving!",evt.nativeEvent.pageY,ViewPort.height,flex);
    this.setState({textListFlex:flex});
  };

  onTextListDragEnd = (evt) => {
    var onTextListAnimate = function(animVal,value) {
      //console.log("updating animation");
      this.setState({textListFlex:value.value});
      if (value.value > 0.999 || value.value < 0.001) {
        animVal.stopAnimation();
        let tempState = {textListAnimating:false, textListFlex: value.value > 0.999 ? 0.9999 : 0.3}; //important. if closing textlist, make sure to set the final flex to something visible
        if (value.value < 0.001)
          tempState.textListVisible = false;
        this.setState(tempState);
      }
    };
    let headerHeight = 75;
    let flex = 1.0 - (evt.nativeEvent.pageY-headerHeight)/(ViewPort.height-headerHeight) + this._textListDragOffset;

    if (flex > 0.9 || flex < 0.2) {
      this.setState({textListAnimating:true});
      let animVal = new Animated.Value(flex);
      animVal.addListener(onTextListAnimate.bind(this,animVal));
      Animated.timing(
        animVal,
        {toValue: flex > 0.9 ? 0.9999 : 0.0001, duration: 200}
      ).start();
      //console.log("STOPPP");
      return;
    }
  };

  onQueryChange = (query, resetQuery, fromBackButton, getFilters) => {
    // getFilters should be true if the query has changed or the exactType has changed
    var newSearchPage = 0;
    var from = 0;
    var size = 20;
    if (resetQuery && !fromBackButton) {
      this.setInitSearchScrollPos(0);
    }
    if (!resetQuery) {
      newSearchPage = this.state.currSearchPage + 1;
      from = 20 * newSearchPage;
    }
    if (fromBackButton) {
      size = 20 * (this.state.currSearchPage + 1);
      newSearchPage = size/20;
    }

    //var req = JSON.stringify(Sefaria.search.get_query_object(query,false,[],20,20*newSearchPage,"text"));
    var request_filters = this.state.searchFiltersValid && this.state.appliedSearchFilters;
    console.log("get filters", getFilters);
    var queryProps = {
      query: query,
      size: size,
      from: from,
      type: "text",
      get_filters: getFilters,
      applied_filters: request_filters,
      sort_type: this.state.searchSort,
      exact: this.state.searchIsExact
    };
    var field = this.state.searchIsExact ? "exact" : "naive_lemmatizer";
    Sefaria.search.execute_query(queryProps)
    .then((responseJson) => {
      var newResultsArray = responseJson["hits"]["hits"].map(function(r) {
        return {
          "title": r._source.ref,
          "text": r.highlight[field][0],
          "textType": r._id.includes("[he]") ? "hebrew" : "english"
        }
      });
      var resultArray = resetQuery ? newResultsArray :
        this.state.searchQueryResult.concat(newResultsArray);

      var numResults = responseJson["hits"]["total"];
      this.setState({
        isQueryLoadingTail: false,
        isQueryRunning: false,
        searchQueryResult: resultArray,
        numSearchResults: numResults,
        initSearchListSize: size
      });

      if (resetQuery) {
        Sefaria.track.event("Search","Query: text", query, numResults);
      }
      if (responseJson.aggregations) {
        if (responseJson.aggregations.category) {
          var ftree = Sefaria.search._buildFilterTree(responseJson.aggregations.category.buckets, this.state.appliedSearchFilters);
          var orphans = Sefaria.search._applyFilters(ftree, this.state.appliedSearchFilters);
          this.setAvailableSearchFilters(ftree.availableFilters, orphans);
        }
      }
    })
    .catch((error) => {
      console.log(error);
      //TODO: add hasError boolean to state
      this.setState({
        isQueryLoadingTail: false,
        isQueryRunning: false,
        searchFiltersValid: false,
        searchQueryResult:[],
        numSearchResults: 0,
        initSearchListSize: 20,
        initSearchScrollPos: 0
      });
    });

    this.setState({
      searchQuery:query,
      currSearchPage: newSearchPage,
      isQueryRunning: true,
      searchFiltersValid: !getFilters,
    });
  };

  setLoadQueryTail = (isLoading) => {
    this.setState({isQueryLoadingTail: isLoading});
    if (isLoading) {
      this.onQueryChange(this.state.searchQuery,false);
    }
  };

  setIsNewSearch = (isNewSearch) => {
    this.setState({isNewSearch: isNewSearch});
  };

  setAvailableSearchFilters = (availableFilters, orphans) => {
    this.setState({availableSearchFilters: availableFilters, orphanSearchFilters: orphans, searchFiltersValid: true});
  };

  updateSearchFilter = (filterNode) => {
    if (filterNode.isUnselected()) {
      filterNode.setSelected(true);
    } else {
      filterNode.setUnselected(true);
    }
    this.setState({appliedSearchFilters: this.getAppliedSearchFilters(this.state.availableSearchFilters)});
  };

  getAppliedSearchFilters = (availableFilters) => {
    var results = [];
    for (var i = 0; i < availableFilters.length; i++) {
        results = results.concat(availableFilters[i].getAppliedFilters());
    }
    return results;
  };

  search = (query) => {
    this.onQueryChange(query,true,false,true);
    this.openSearch();

    Sefaria.track.event("Search","Search Box Search",query);
  };

  setSearchOptions = (sort, isExact, cb) => {
    this.setState({searchSort: sort, searchIsExact: isExact}, cb);
  };

  clearAllSearchFilters = () => {
    for (let filterNode of this.state.availableSearchFilters) {
      filterNode.setUnselected(true);
    }
    this.setState({appliedSearchFilters: this.getAppliedSearchFilters(this.state.availableSearchFilters)});
  };

  render() {
      return (
          <View style={[styles.container, this.state.theme.container]} {...this.gestureResponder}>
              <StatusBar
                  barStyle="light-content" />
              <ReaderPanel
                  textReference={this.state.textReference}
                  textTitle={this.state.textTitle}
                  heTitle={this.state.heTitle}
                  heRef={this.state.heRef}
                  data={this.state.data}
                  next={this.state.next}
                  prev={this.state.prev}
                  sectionArray={this.state.sectionArray}
                  sectionHeArray={this.state.sectionHeArray}
                  offsetRef={this.state.offsetRef}
                  segmentRef={this.state.segmentRef}
                  segmentIndexRef={this.state.segmentIndexRef}
                  textList={0}
                  menuOpen={this.state.menuOpen}
                  subMenuOpen={this.state.subMenuOpen}
                  navigationCategories={this.state.navigationCategories}
                  style={styles.mainTextPanel}
                  updateData={this.updateData}
                  updateTitle={this.updateTitle}
                  textSegmentPressed={ this.textSegmentPressed }
                  openRef={ this.openRef }
                  interfaceLang={this.state.interfaceLang}
                  openMenu={this.openMenu}
                  openSubMenu={this.openSubMenu}
                  closeMenu={this.closeMenu}
                  openNav={this.openNav}
                  setNavigationCategories={this.setNavigationCategories}
                  openSettings={this.openMenu.bind(null, "settings")}
                  openTextToc={this.openTextToc}
                  openSearch={this.openSearch}
                  openRecent={this.openMenu.bind(null,"recent")}
                  loadingTextTail={this.state.loadingTextTail}
                  loadingTextHead={this.state.loadingTextHead}
                  textListVisible={this.state.textListVisible}
                  textListFlex={this.state.textListFlex}
                  onTextListDragStart={this.onTextListDragStart}
                  onTextListDragMove={this.onTextListDragMove}
                  onTextListDragEnd={this.onTextListDragEnd}
                  loading={!this.state.loaded}
                  defaultSettingsLoaded={this.state.defaultSettingsLoaded}
                  openLinkCat={this.openLinkCat}
                  closeLinkCat={this.closeLinkCat}
                  updateLinkCat={this.updateLinkCat}
                  loadLinkContent={this.loadLinkContent}
                  filterIndex={this.state.filterIndex}
                  linksLoaded={this.state.linksLoaded}
                  linkRecentFilters={this.state.linkRecentFilters}
                  linkSummary={this.state.linkSummary}
                  linkContents={this.state.linkContents}
                  loadingLinks={this.state.loadingLinks}
                  setTheme={this.setTheme}
                  theme={this.state.theme}
                  themeStr={this.state.themeStr}
                  hasInternet={this.state.hasInternet}
                  isQueryRunning={this.state.isQueryRunning}
                  searchQuery={this.state.searchQuery}
                  searchSort={this.state.searchSort}
                  searchIsExact={this.state.searchIsExact}
                  availableSearchFilters={this.state.availableSearchFilters}
                  appliedSearchFilters={this.state.appliedSearchFilters}
                  updateSearchFilter={this.updateSearchFilter}
                  searchFiltersValid={this.state.searchFiltersValid}
                  isQueryLoadingTail={this.state.isQueryLoadingTail}
                  initSearchListSize={this.state.initSearchListSize}
                  initSearchScrollPos={this.state.initSearchScrollPos}
                  setInitSearchScrollPos={this.setInitSearchScrollPos}
                  isNewSearch={this.state.isNewSearch}
                  numSearchResults={this.state.numSearchResults}
                  currSearchPage={this.state.currSearchPage}
                  searchQueryResult={this.state.searchQueryResult}
                  backStack={this.state.backStack}
                  goBack={this.goBack}
                  onQueryChange={this.onQueryChange}
                  setLoadQueryTail={this.setLoadQueryTail}
                  setIsNewSearch={this.setIsNewSearch}
                  clearAllSearchFilters={this.clearAllSearchFilters}
                  search={this.search}
                  setSearchOptions={this.setSearchOptions}
                  Sefaria={Sefaria} />
          </View>
      );
  }
}

//this warning was really annoying me. There doesn't seem to be anything wrong with the code, so I'm ignoring it for now
console.ignoredYellowBox = ['Warning: Each child in an array or iterator should have a unique "key" prop.'];
AppRegistry.registerComponent('ReaderApp', () => ReaderApp);
