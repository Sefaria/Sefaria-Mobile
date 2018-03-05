'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  AlertIOS,
  Animated,
  AppState,
  Dimensions,
  Linking,
  NetInfo,
  View,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { connect } from 'react-redux';
import { createResponder } from 'react-native-gesture-responder';
import { ACTION_CREATORS } from './ReduxStore';
import ReaderControls from './ReaderControls';
import styles from './Styles';
import strings from './LocalizedStrings';
import Sefaria from './sefaria';
import { LinkFilter } from './Filter';
import ReaderDisplayOptionsMenu from './ReaderDisplayOptionsMenu';
import ReaderNavigationMenu from './ReaderNavigationMenu';
import ReaderTextTableOfContents from './ReaderTextTableOfContents';
import SearchPage from './SearchPage';
import TextColumn from './TextColumn';
import ConnectionsPanel from './ConnectionsPanel';
import SettingsPage from './SettingsPage';
import RecentPage from './RecentPage';
import {
  LoadingView,
  CategoryColorLine,
} from './Misc.js';
const ViewPort    = Dimensions.get('window');


class ReaderApp extends React.Component {

  static propTypes = {
    theme:        PropTypes.object.isRequired,
    themeStr:     PropTypes.string.isRequired,
    setTheme:     PropTypes.func.isRequired,
    textLanguage: PropTypes.string.isRequired,
    overwriteVersions: PropTypes.bool.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    Sefaria.init().then(() => {
        this.setState({
          loaded: true,
          defaultSettingsLoaded: true,
        });
        const mostRecent =  Sefaria.recent.length ? Sefaria.recent[0] : {ref: "Genesis 1"};
        this.openRef(mostRecent.ref, null, mostRecent.versions);
    });
    Sefaria.track.init();
    NetInfo.isConnected.addEventListener(
      'connectionChange',
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
        textFlow: "segmented",
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
        connectionsMode: null, // null means connections summary
        filterIndex: null, /* index of filters in recentFilters */
        linkSummary: [],
        linkContents: [],
        linkRecentFilters: [],
        linkStaleRecentFilters: [], /*bool array indicating whether the corresponding filter in recentFilters is no longer synced up with the current segment*/
        loadingLinks: false,
        versionRecentFilters: [],
        versionFilterIndex: null,
        currVersions: {en: null, he: null}, /* actual current versions you're reading */
        selectedVersions: {en: null, he: null}, /* custom versions you've selected. not necessarily available for the current section */
        versions: [],
        versionsApiError: false,
        versionStaleRecentFilters: [],
        versionContents: [],
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
        backStack: [],
        ReaderDisplayOptionsMenuVisible: false,
        overwriteVersions: true, // false when you navigate to a text but dont want the current version to overwrite your sticky version
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

  componentWillMount() {
    this.gestureResponder = createResponder({
      onStartShouldSetResponder: (evt, gestureState) => { return gestureState.pinch; },
      onStartShouldSetResponderCapture: (evt, gestureState) => { return gestureState.pinch; },
      onMoveShouldSetResponder: (evt, gestureState) => { return gestureState.pinch; },
      onMoveShouldSetResponderCapture: (evt, gestureState) => { return gestureState.pinch; },

      onResponderGrant: (evt, gestureState) => {},
      onResponderMove: (evt, gestureState) => {
        if (gestureState.pinch && gestureState.previousPinch) {
          this.pendingIncrement *= gestureState.pinch / gestureState.previousPinch
          if (!this.incrementTimer) {
            const numSegments = this.state.data.reduce((prevVal, elem) => prevVal + elem.length, 0);
            const timeout = Math.min(50 + Math.floor(numSegments/50)*25, 200); // range of timeout is [50,200] or in FPS [20,5]
            this.incrementTimer = setTimeout(() => {
              this.incrementFont(this.pendingIncrement);
              this.pendingIncrement = 1;
              this.incrementTimer = null;
            }, timeout);
          }
        }
      },
      onResponderTerminationRequest: (evt, gestureState) => true,
      onResponderRelease: (evt, gestureState) => {},
      onResponderTerminate: (evt, gestureState) => {},
      onResponderSingleTapConfirmed: (evt, gestureState) => {},
    });
  }

  pendingIncrement = 1;

  componentWillUpdate(nextProps, nextState) {
    if (nextState.defaultSettingsLoaded && this.state.textTitle !== nextState.textTitle) {
      this.setTextLanguage(this.getTextByLanguage(nextState.textTitle), nextState.textTitle, nextState.textFlow, true);
    }

    // Should track pageview? TODO account for infinite
    if (this.state.menuOpen          !== nextState.menuOpen          ||
        this.state.textTitle         !== nextState.textTitle         ||
        this.state.textFlow          !== nextState.textFlow          ||
        this.props.textLanguage      !== nextProps.textLanguage      || // note this var is coming from props
        this.state.textListVisible   !== nextState.textListVisible   ||
        this.state.segmentIndexRef   !== nextState.segmentIndexRef   ||
        this.state.segmentRef        !== nextState.segmentRef        ||
        this.state.linkRecentFilters !== nextState.linkRecentFilters ||
        this.props.themeStr          !== nextState.themeStr) {
          this.trackPageview();
    }
  }

  toggleReaderDisplayOptionsMenu = () => {
    if (this.state.ReaderDisplayOptionsMenuVisible == false) {
  	 this.setState({ReaderDisplayOptionsMenuVisible:  true})
  	} else {
  	 this.setState({ReaderDisplayOptionsMenuVisible:  false})}

     //console.log(this.state.ReaderDisplayOptionsMenuVisible);
    this.trackPageview();
  };

  toggleMenuLanguage = () => {
    // Toggle current menu language between english/hebrew only
    const newMenuLanguage = this.props.menuLanguage !== "hebrew" ? "hebrew" : "english";
    Sefaria.track.event("Reader","Change Language", newMenuLanguage);
    this.props.setMenuLanguage(newMenuLanguage);
  };

  setTextFlow = textFlow => {
    this.setState({textFlow: textFlow});

    if (textFlow == "continuous" && this.props.textLanguage == "bilingual") {
      this.setTextLanguage("hebrew");
    }
    this.toggleReaderDisplayOptionsMenu();
    Sefaria.track.event("Reader","Display Option Click","layout - " + textFlow);
  };

  getTextByLanguage = title => {
    console.log("in textLanguageByTitle", this.props.textLanguageByTitle[title]);
    return this.props.textLanguageByTitle[title] || this.props.defaultTextLanguage;
  };

  setTextLanguage = (textLanguage, textTitle, textFlow, dontToggle) => {
    // try to be less dependent on state in this func because it is called in componentWillUpdate
    textTitle = textTitle || this.state.textTitle;
    textFlow = textFlow || this.state.textFlow;
    this.props.setTextLanguageByTitle(textTitle, textLanguage);
    this.setCurrVersions(); // update curr versions based on language
    if (textLanguage == "bilingual" && textFlow == "continuous") {
      this.setTextFlow("segmented");
    }
    if (!dontToggle) { this.toggleReaderDisplayOptionsMenu(); }
    Sefaria.track.event("Reader", "Display Option Click", "language - " + textLanguage);
  };

  setTheme = themeStr => {
    this.props.setTheme(themeStr);
    this.toggleReaderDisplayOptionsMenu();
  }

  incrementFont = (increment) => {
    if (increment == "larger") {
      var x = 1.1;
    } else if (increment == "smaller") {
      var x = .9;
    } else {
      var x = increment;
    }
    let newFontSize = this.props.fontSize;
    newFontSize *= x;
    newFontSize = newFontSize > 60 ? 60 : newFontSize; // Max size
    newFontSize = newFontSize < 18 ? 18 : newFontSize; // Min size
    newFontSize = parseFloat(newFontSize.toFixed(2));
    this.props.setFontSize(newFontSize);
    Sefaria.track.event("Reader","Display Option Click","fontSize - " + increment);
  };

  /*
  send current page stats to analytics
  */
  trackPageview = () => {
    let pageType  = this.state.menuOpen || (this.state.textListVisible ? "TextAndConnections" : "Text");
    let numPanels = this.state.textListVisible ? '1.1' : '1';
    let ref       = this.state.segmentRef !== '' ? this.state.segmentRef : this.state.textReference;
    let bookName  = this.state.textTitle;
    let index     = Sefaria.index(this.state.textTitle);
    let cats      = index ? index.categories : undefined;
    let primCat   = cats && cats.length > 0 ? ((cats[0] === "Commentary") ?
        cats[1] + " Commentary" : cats[0]) : "";
    let secoCat   = cats ? ((cats[0] === "Commentary")?
        ((cats.length > 2) ? cats[2] : ""):
        ((cats.length > 1) ? cats[1] : "")) : "";
    let contLang  = this.props.menuLanguage; // TODO why is this var called contLang? is this accessing the wrong variable?
    let sideBar   = this.state.linkRecentFilters.length > 0 ? this.state.linkRecentFilters.map(filt => filt.title).join('+') : 'all';
    let versTit   = ''; //we don't support this yet

    Sefaria.track.pageview(pageType,
      {'Panels Open': numPanels, 'Book Name': bookName, 'Ref': ref, 'Version Title': versTit, 'Page Type': pageType, 'Sidebars': sideBar},
      {1: primCat, 2: secoCat, 3: bookName, 5: contLang}
    );

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
          this.updateVersionCat(null, segmentRef);
      }
      if (this.state.connectionsMode === "versions") {
        //update versions
      }
      let stateObj = {
          segmentRef: segmentRef,
          segmentIndexRef: segment,
          sectionIndexRef: section,
          linkStaleRecentFilters: this.state.linkRecentFilters.map(()=>true),
          versionStaleRecentFilters: this.state.versionRecentFilters.map(()=>true),
          loadingLinks: loadingLinks
      };
      if (shouldToggle) {
        stateObj.textListVisible = !this.state.textListVisible;
        stateObj.offsetRef = null; //offsetRef is used to highlight. once you open textlist, you should remove the highlight
      }
      this.setState(stateObj);
      this.forceUpdate();
  };
  /*
    isLoadingVersion - true when you are replacing an already loaded text with a specific version
    overwriteVersions - false when you want to switch versions but not overwrite sticky version (e.g. search)
  */
  loadNewText = (ref, versions, isLoadingVersion, overwriteVersions=true) => {
      if (!this.state.hasInternet) {
        overwriteVersions = false;
        versions = undefined; // change to default version in case they have offline library they'll still be able to read
      }
      this.props.setOverwriteVersions(overwriteVersions);
      versions = this.removeDefaultVersions(ref, versions);
      this.setState({
          loaded: false,
          data: [],
          textReference: ref,
          textTitle: Sefaria.textTitleForRef(ref),
          segmentIndexRef: -1,
          sectionIndexRef: -1,
          selectedVersions: versions, /* if loadVersion, merge with current this.state.selectedVersions */
          currVersions: {en: null, he: null},
      });

      if (ref.indexOf("-") != -1) {
        // Open ranged refs to their first segment (not ideal behavior, but good enough for now)
        ref = ref.split("-")[0];
      }
      // if loadVersion, replace versions here
      Sefaria.data(ref, true, versions).then(function(data) {
          let nextState = {
            data:              [data.content],
            textTitle:         data.indexTitle,
            next:              data.next,
            prev:              data.prev,
            heTitle:           data.heTitle,
            heRef:             data.heRef,
            sectionArray:      [data.ref],
            sectionHeArray:    [data.heRef],
            loaded:            true,
            offsetRef:         !data.isSectionLevel ? data.requestedRef : null, // keep
          };
          if (!isLoadingVersion) {
            // also overwrite sidebar state
            nextState = {
              ...nextState,
              linksLoaded:       [false],
              connectionsMode:   null, //Reset link state
              filterIndex:       null,
              linkRecentFilters: [],
              versionFilterIndex: null,
              versionRecentFilters: [],
              linkSummary:       [],
              linkContents:      [],
              loadingLinks:      false,
              textListVisible:   false,
            };
            Sefaria.links.reset();
          }
          this.setState(nextState, ()=>{
            this.loadSecondaryData(data.sectionRef);
          });

          // Preload Text TOC data into memory
          Sefaria.textToc(data.indexTitle).then(() => {
            // at this point, both book and section level version info is available
            this.setCurrVersions(data.sectionRef, data.indexTitle); // not positive if this will combine versions well
          });
          Sefaria.saveRecentItem({ref: ref, heRef: data.heRef, category: Sefaria.categoryForRef(ref), versions: this.state.selectedVersions}, this.props.overwriteVersions);
      }.bind(this)).catch(function(error) {
        console.log(error);
        if (error == "Return to Nav") {
          this.openNav();
          return;
        }
        console.error('Error caught from ReaderApp.loadNewText', error);
      }.bind(this));

  };

  removeDefaultVersions = (ref, versions) => {
    if (!versions) return versions;
    const cachedVersionList = Sefaria.api.getCachedVersions(ref);
    if (!cachedVersionList) return versions;

    const newVersions = {};
    for (let [lang, versionTitle] of Object.entries(versions)) {
      const versionObject = cachedVersionList.find(v => v.versionTitle === versionTitle && v.language === lang);
      if (!versionObject || !versionObject.default) {
        newVersions[lang] = versionTitle;
      } // else you're switching to a default version. dont list this in `versions` so that it can be loaded offline (assuming you have it downloaded)
    }
    return newVersions;
  };

  loadNewVersion = (ref, versions) => {
    // consider moving this logic to loadNewText()
    const newVersions = {
      ...this.state.selectedVersions,
      ...versions,
    }

    // make sure loaded text will show the versions you selected
    let newTextLang = this.props.textLanguage;
    if (!!newVersions['en'] && !!newVersions['he']) { newTextLang = "bilingual"; }
    else if (!!newVersions['en']) { newTextLang = "english"; }
    else { newTextLang = "hebrew"; }
    this.setTextLanguage(newTextLang, null, null, true);
    this.loadNewText(ref, newVersions, true);
  };

  setCurrVersions = (sectionRef, title) => {
    let enVInfo = !sectionRef ? this.state.currVersions.en : Sefaria.versionInfo(sectionRef, title, 'english');
    let heVInfo = !sectionRef ? this.state.currVersions.he : Sefaria.versionInfo(sectionRef, title, 'hebrew');
    if (enVInfo) { enVInfo.disabled = this.props.textLanguage ===  'hebrew'; } // not currently viewing this version
    if (heVInfo) { heVInfo.disabled = this.props.textLanguage === 'english'; }
    this.setState({ currVersions: { en: enVInfo, he: heVInfo } });
  };

  loadSecondaryData = (ref) => {
    //loads secondary data every time a section is loaded
    //this data is not required for initial renderring of the section
    this.loadLinks(ref);
    this.loadVersions(ref);
  };

  loadLinks = (ref) => {
    // Ensures that links have been loaded for `ref` and stores result in `this.state.linksLoaded` array.
    // Links are not loaded yet in case you're in API mode, or you are reading a non-default version
    const iSec = this.state.sectionArray.findIndex(secRef=>secRef===ref);
    if (!iSec && iSec !== 0) { console.log("could not find section ref in sectionArray", ref); return; }
    Sefaria.links.load(ref)
      .then(linksResponse => {
        //add the links into the appropriate section and reload
        this.state.data[iSec] = Sefaria.links.addLinksToText(this.state.data[iSec], linksResponse);
        Sefaria.cacheCommentatorListBySection(ref, this.state.data[iSec]);
        let tempLinksLoaded = this.state.linksLoaded.slice(0);
        tempLinksLoaded[iSec] = true;
        if (this.state.segmentIndexRef != -1 && this.state.sectionIndexRef != -1) {
          this.updateLinkSummary(this.state.sectionIndexRef, this.state.segmentIndexRef);
        }

        this.setState({data: this.state.data, linksLoaded: tempLinksLoaded});
      })
      .catch(error=>{
        console.log("FAILED", error);
        let tempLinksLoaded = this.state.linksLoaded.slice(0);
        tempLinksLoaded[iSec] = true;
        this.setState({linksLoaded: tempLinksLoaded});
      });
  };

  loadVersions = (ref) => {
    Sefaria.api.versions(ref, true).then(data=> {
      this.setState({ versions: data, versionsApiError: false });
    }).catch(error=>{
      this.setState({ versionsApiError: true });
    });
  };

  updateData = (direction) => {
      // direction: either "next" or "prev"
      // shouldCull: bool, if True, remove either first or last section (depending on `direction`)
      if (direction === "next" && this.state.next) {
          this.updateDataNext();
          Sefaria.track.event("Reader","Infinite Scroll","Down");
      } else if (direction == "prev" && this.state.prev) {
          this.updateDataPrev();
          Sefaria.track.event("Reader","Infinite Scroll","Up");
      }
  };

  updateDataPrev = () => {
      this.setState({loadingTextHead: true});
      Sefaria.data(this.state.prev, true, this.state.selectedVersions).then(function(data) {

        var updatedData = [data.content].concat(this.state.data);

        var newTitleArray = this.state.sectionArray;
        var newHeTitleArray = this.state.sectionHeArray;
        var newlinksLoaded = this.state.linksLoaded;
        newTitleArray.unshift(data.sectionRef);
        newHeTitleArray.unshift(data.heRef);
        newlinksLoaded.unshift(false);

        this.setState({
          data: updatedData,
          prev: data.prev,
          next: this.state.next,
          sectionArray: newTitleArray,
          sectionHeArray: newHeTitleArray,
          linksLoaded: newlinksLoaded,
          loaded: true,
          loadingTextHead: false,
        }, ()=>{
          this.loadSecondaryData(data.sectionRef);
          this.setCurrVersions(data.sectionRef, data.indexTitle);
        });

      }.bind(this)).catch(function(error) {
        console.log('Error caught from ReaderApp.updateDataPrev', error);
      });
  };

  updateDataNext = () => {
      this.setState({loadingTextTail: true});
      Sefaria.data(this.state.next, true, this.state.selectedVersions).then(function(data) {

        var updatedData = this.state.data.concat([data.content]);
        var newTitleArray = this.state.sectionArray;
        var newHeTitleArray = this.state.sectionHeArray;
        var newlinksLoaded = this.state.linksLoaded;
        newTitleArray.push(data.sectionRef);
        newHeTitleArray.push(data.heRef);
        newlinksLoaded.push(false);

        this.setState({
          data: updatedData,
          prev: this.state.prev,
          next: data.next,
          sectionArray: newTitleArray,
          sectionHeArray: newHeTitleArray,
          linksLoaded: newlinksLoaded,
          loaded: true,
          loadingTextTail: false,
        }, ()=>{
          this.loadSecondaryData(data.sectionRef);
          this.setCurrVersions(data.sectionRef, data.indexTitle);
        });

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
      Sefaria.saveRecentItem({ref: ref, heRef: heRef, category: Sefaria.categoryForRef(ref), versions: this.state.selectedVersions}, this.props.overwriteVersions);
  };

  /*
  calledFrom parameter used for analytics and for back button
  prevScrollPos parameter used for back button
  */
  openRef = (ref, calledFrom, versions) => {
    const title = Sefaria.textTitleForRef(ref);
    const overwriteVersions = calledFrom !== 'search'; // if called from search, use version specified by search (or default if none specified)
    if (!title) {
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
    if (!versions && overwriteVersions) {
      //pull up default versions
      const recentItem = Sefaria.getRecentRefForTitle(title);
      if (!!recentItem) { versions = recentItem.versions; }
    }
    this.setState({
      loaded: false,
      textListVisible: false,
      textReference: ref
    }, function() {
        this.closeMenu(); // Don't close until these values are in state, so we know if we need to load defualt text
    }.bind(this));
    this.loadNewText(ref, versions, false, overwriteVersions);

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
        this.addBackItem("text list", {ref: this.state.segmentRef, versions: this.state.selectedVersions});
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
      this.clearAllSearchFilters();
      this.setState({loaded: true, appliedSearchFilters: [], searchFiltersValid: false, textListVisible: false});
      this.openMenu("navigation");
  };

  goBack = () => {
    if /* last page was search page */((this.state.backStack.slice(-1)[0]).page === "search") {
      this.onQueryChange((this.state.backStack.pop()).state,true,true);
      this.openSearch();
    }
    else /*is ref*/ {
      const { state } = this.state.backStack.pop();
      this.openRef(state.ref, null, state.versions);
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
          navigationCategories: [],
      });
  };

  openDefaultText = () => {
      this.loadNewText("Genesis 1");
  };

  setConnectionsMode = (cat) => {
    this.setState({ connectionsMode: cat });
  };

  openFilter = (filter, type) => {
      // type is either "link" or "version"
      let recentFilters, staleRecentFilters;
      switch (type) {
        case "link":
          recentFilters = this.state.linkRecentFilters;
          staleRecentFilters = this.state.linkStaleRecentFilters;
          break;
        case "version":
          recentFilters = this.state.versionRecentFilters;
          staleRecentFilters = this.state.versionStaleRecentFilters;
      }
      var filterIndex = null;
      //check if filter is already in recentFilters
      for (let i = 0; i < recentFilters.length; i++) {
          let tempFilter = recentFilters[i];
          if (tempFilter.equals(filter)) {
            filterIndex = i;
            if (staleRecentFilters[i]) {
              recentFilters[i] = filter;
              staleRecentFilters[i] = false;
            }
            break;
          }
      }

      //if it's not in recentFilters, add it
      if (filterIndex == null) {
          recentFilters.unshift(filter);
          if (recentFilters.length > 5)
            recentFilters.pop();
          filterIndex = 0;
      }

      let newState;
      switch (type) {
        case "link":
          const linkContents = filter.refList.map(ref=>null);
          Sefaria.links.reset();
          newState = {
            connectionsMode: "filter",
            filterIndex: filterIndex,
            recentFilters: recentFilters,
            linkStaleRecentFilters: staleRecentFilters,
            linkContents: linkContents,
          };
          break;
        case "version":
          const versionContents = [null]; //hard-coded to one segment for now
          newState = {
            connectionsMode: "version open",
            versionFilterIndex: filterIndex,
            versionRecentFilters: recentFilters,
            versionStaleRecentFilters: staleRecentFilters,
            versionContents: versionContents,
          }
          break;
      }

      this.setState(newState);
  };

  closeLinkCat = () => {
    this.setState({connectionsMode: null});
    Sefaria.track.event("Reader","Show All Filters Click","1");
  };

  updateLinkSummary = (section, segment) => {
    Sefaria.links.linkSummary(this.state.textReference, this.state.data[section][segment].links).then((data) => {
      this.setState({linkSummary: data, loadingLinks: false});
      this.updateLinkCat(null, data); // Set up `linkContents` in their initial state as an array of nulls
    });
  };
  updateLinkCat = (filterIndex, linkSummary) => {
      //search for the current filter in the the links object
      if (this.state.filterIndex === filterIndex) return;
      if (this.state.filterIndex == null) return;
      if (linkSummary == null) linkSummary = this.state.linkSummary;
      if (filterIndex == null) filterIndex = this.state.filterIndex;
      const { name, heName, category, collectiveTitle, heCollectiveTitle } = this.state.linkRecentFilters[filterIndex];
      let nextRefList = [];
      let nextHeRefList = [];
      for (let cat of linkSummary) {
          if (cat.category == name) {
            nextRefList = cat.refList;
            nextHeRefList = cat.heRefList;
            break;
          }
          for (let book of cat.books) {
            if (book.title == name) {
              nextRefList = book.refList;
              nextHeRefList = book.heRefList;
              break;
            }
          }
      }
      const nextFilter = new LinkFilter(name, heName, collectiveTitle, heCollectiveTitle, nextRefList, nextHeRefList, category);

      this.state.linkRecentFilters[filterIndex] = nextFilter;

      const linkContents = nextFilter.refList.map((ref)=>null);
      Sefaria.links.reset();
      this.setState({
          filterIndex,
          linkRecentFilters: this.state.linkRecentFilters,
          linkContents,
      });
  };

  loadLinkContent = (ref, pos) => {
    // Loads link content for `ref` then inserts it into `this.state.linkContents[pos]`
    let isLinkCurrent = function(ref, pos) {
      // check that we haven't loaded a different link set in the mean time
      if (typeof this.state.linkRecentFilters[this.state.filterIndex] === "undefined") { return false;}
      const refList = this.state.linkRecentFilters[this.state.filterIndex].refList;
      if (pos > refList.length) { return false; }
      return (refList[pos] === ref);
    }.bind(this);
    let resolve = (data) => {
      if (isLinkCurrent(ref, pos)) {
          this.onLinkLoad(pos, data);
      }
    };
    let reject = (error) => {
      if (error != 'inQueue') {
        if (isLinkCurrent(ref, pos)) {
            this.onLinkLoad(pos, {en:JSON.stringify(error), he:JSON.stringify(error), sectionRef: ""});
        }
      }
    };

    let resolveClosure = function(ref, pos, data) {
      resolve(data);
    }.bind(this, ref, pos);

    let rejectClosure = function(ref, pos, data) {
      reject(data);
    }.bind(this, ref, pos);

    Sefaria.links.loadLinkData(ref, pos, resolveClosure, rejectClosure).then(resolveClosure).catch(rejectClosure);
  };

  onLinkLoad = (pos, data) => {
    // truncate data if it's crazy long (e.g. Smag)
    if (data.en.length > 1000) {
      data.en = data.en.slice(0, 1000) + "...";
    }
    if (data.he.length > 1000) {
      data.he = data.he.slice(0, 1000) + "...";
    }

    this.state.linkContents[pos] = data;
    this.setState({linkContents: this.state.linkContents.slice(0)});
  };

  updateVersionCat = (filterIndex, segmentRef) => {
    if (this.state.versionFilterIndex === filterIndex) return;
    if (!filterIndex && filterIndex !== 0) {
      if (this.state.versionFilterIndex == null) return;
      filterIndex = this.state.versionFilterIndex;
    }
    if (!segmentRef) { segmentRef = this.state.segmentRef; }
    this.state.versionRecentFilters[filterIndex].refList = [segmentRef];
    const versionContents = [null];
    //TODO make a parallel func for versions? Sefaria.links.reset();
    this.setState({
        versionFilterIndex: filterIndex,
        versionRecentFilters: this.state.versionRecentFilters,
        versionContents,
    });
  };

  loadVersionContent = (ref, pos, versionTitle, versionLanguage) => {
    Sefaria.data(ref, false, {[versionLanguage]: versionTitle }).then((data) => {
      // only want to show versionLanguage in results
      const removeLang = versionLanguage === "he" ? "en" : "he";
      data.result[removeLang] = "";
      this.state.versionContents[pos] = data.result;
      this.setState({versionContents: this.state.versionContents.slice(0)});
    })
  };

  clearOffsetRef = () => {
    /* used after TextList has used the offsetRef to render initially*/
    this.setState({offsetRef:null});
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
          title: r._source.ref,
          heTitle: r._source.heRef,
          text: r.highlight[field].join(" ... "),
          id: r._id,
          textType: r._id.includes("[he]") ? "hebrew" : "english",
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
  renderContent() {
    const loading = !this.state.loaded;
    switch(this.state.menuOpen) {
      case (null):
        break;
      case ("navigation"):
        return (
          loading ?
          <LoadingView theme={this.props.theme} /> :
          <ReaderNavigationMenu
            categories={this.state.navigationCategories}
            setCategories={this.setNavigationCategories}
            openRef={(ref, versions)=>this.openRef(ref,"navigation", versions)}
            goBack={this.goBack}
            openNav={this.openNav}
            closeNav={this.closeMenu}
            openSearch={this.search}
            setIsNewSearch={this.setIsNewSearch}
            toggleLanguage={this.toggleMenuLanguage}
            menuLanguage={this.props.menuLanguage}
            openSettings={this.openMenu.bind(null, "settings")}
            openRecent={this.openMenu.bind(null, "recent")}
            interfaceLang={this.state.interfaceLang}
            theme={this.props.theme}
            themeStr={this.props.themeStr}/>);
        break;
      case ("text toc"):
        return (
          <ReaderTextTableOfContents
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            title={this.state.textTitle}
            currentRef={this.state.textReference}
            currentHeRef={this.state.heRef}
            textLang={this.props.textLanguage == "hebrew" ? "hebrew" : "english"}
            contentLang={this.props.menuLanguage}
            interfaceLang={this.state.interfaceLang}
            close={this.closeMenu}
            openRef={(ref)=>this.openRef(ref,"text toc")}
            toggleLanguage={this.toggleMenuLanguage}/>);
        break;
      case ("search"):
        return(
          <SearchPage
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            menuLanguage={this.props.menuLanguage}
            interfaceLang={this.state.interfaceLang}
            subMenuOpen={this.state.subMenuOpen}
            openSubMenu={this.openSubMenu}
            hasInternet={this.state.hasInternet}
            openNav={this.openNav}
            closeNav={this.closeMenu}
            onQueryChange={this.onQueryChange}
            openRef={(ref)=> this.openRef(ref,"search")}
            setLoadTail={this.setLoadQueryTail}
            setIsNewSearch={this.setIsNewSearch}
            setSearchOptions={this.setSearchOptions}
            query={this.state.searchQuery}
            sort={this.state.searchSort}
            isExact={this.state.searchIsExact}
            availableFilters={this.state.availableSearchFilters}
            appliedFilters={this.state.appliedSearchFilters}
            updateFilter={this.updateSearchFilter}
            filtersValid={this.state.searchFiltersValid}
            loadingQuery={this.state.isQueryRunning}
            isNewSearch={this.state.isNewSearch}
            loadingTail={this.state.isQueryLoadingTail}
            initSearchListSize={this.state.initSearchListSize}
            initSearchScrollPos={this.state.initSearchScrollPos}
            setInitSearchScrollPos={this.setInitSearchScrollPos}
            clearAllFilters={this.clearAllSearchFilters}
            queryResult={this.state.searchQueryResult}
            numResults={this.state.numSearchResults} />);
        break;
      case ("settings"):
        return(
          <SettingsPage
            {...this.props}
            close={this.openNav}
          />);
        break;
      case ("recent"):
        return(
          <RecentPage
            close={this.openNav}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            toggleLanguage={this.toggleMenuLanguage}
            openRef={this.openRef}
            language={this.props.menuLanguage}/>
        );
        break;
    }
    let textColumnFlex = this.state.textListVisible ? 1.0 - this.state.textListFlex : 1.0;
    return (
  		<View style={[styles.container, this.props.theme.container]} {...this.gestureResponder}>
          <CategoryColorLine category={Sefaria.categoryForTitle(this.state.textTitle)} />
          <ReaderControls
            theme={this.props.theme}
            title={this.props.menuLanguage == "hebrew" ? this.state.heRef : this.state.textReference}
            language={this.props.menuLanguage}
            categories={Sefaria.categoriesForTitle(this.state.textTitle)}
            openNav={this.openNav}
            themeStr={this.props.themeStr}
            goBack={this.goBack}
            openTextToc={this.openTextToc}
            backStack={this.state.backStack}
            toggleReaderDisplayOptionsMenu={this.toggleReaderDisplayOptionsMenu} />

          { loading ?
          <LoadingView theme={this.props.theme} style={{flex: textColumnFlex}}/> :
          <View style={[{flex: textColumnFlex}, styles.mainTextPanel, this.props.theme.mainTextPanel]}
                onStartShouldSetResponderCapture={() => {
                  if (this.state.ReaderDisplayOptionsMenuVisible == true) {
                     this.toggleReaderDisplayOptionsMenu();
                     return true;
                  }
                }}
          >
            <TextColumn
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              fontSize={this.props.fontSize}
              data={this.state.data}
              textReference={this.state.textReference}
              sectionArray={this.state.sectionArray}
              sectionHeArray={this.state.sectionHeArray}
              offsetRef={this.state.offsetRef}
              segmentRef={this.state.segmentRef}
              segmentIndexRef={this.state.segmentIndexRef}
              textFlow={this.state.textFlow}
              textLanguage={this.props.textLanguage}
              updateData={this.updateData}
              updateTitle={this.updateTitle}
              textTitle={this.state.textTitle}
              heTitle={this.state.heTitle}
              heRef={this.state.heRef}
              textSegmentPressed={ this.textSegmentPressed }
              textListVisible={this.state.textListVisible}
              next={this.state.next}
              prev={this.state.prev}
              linksLoaded={this.state.linksLoaded}
              loadingTextTail={this.state.loadingTextTail}
              loadingTextHead={this.state.loadingTextHead} />
          </View> }

          {this.state.textListVisible ?
            <View style={[{flex:this.state.textListFlex}, styles.mainTextPanel, this.props.theme.commentaryTextPanel]}
                onStartShouldSetResponderCapture={() => {
                  if (this.state.ReaderDisplayOptionsMenuVisible == true) {
                     this.toggleReaderDisplayOptionsMenu();
                     return true;
                  }
                }}
            >
              <ConnectionsPanel
                menuLanguage={this.props.menuLanguage}
                fontSize={this.props.fontSize}
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                interfaceLang={this.state.interfaceLang}
                segmentRef={this.state.segmentRef}
                textFlow={this.state.textFlow}
                textLanguage={this.props.textLanguage}
                openRef={(ref, versions)=>this.openRef(ref,"text list", versions)}
                setConnectionsMode={this.setConnectionsMode}
                openFilter={this.openFilter}
                closeCat={this.closeLinkCat}
                updateLinkCat={this.updateLinkCat}
                updateVersionCat={this.updateVersionCat}
                loadLinkContent={this.loadLinkContent}
                loadVersionContent={this.loadVersionContent}
                linkSummary={this.state.linkSummary}
                linkContents={this.state.linkContents}
                versionContents={this.state.versionContents}
                loadNewVersion={this.loadNewVersion}
                loading={this.state.loadingLinks}
                connectionsMode={this.state.connectionsMode}
                filterIndex={this.state.filterIndex}
                recentFilters={this.state.linkRecentFilters}
                versionRecentFilters={this.state.versionRecentFilters}
                versionFilterIndex={this.state.versionFilterIndex}
                currVersions={this.state.currVersions}
                versions={this.state.versions}
                versionsApiError={this.state.versionsApiError}
                onDragStart={this.onTextListDragStart}
                onDragMove={this.onTextListDragMove}
                onDragEnd={this.onTextListDragEnd}
                textTitle={this.state.textTitle} />
            </View> : null}

            {this.state.ReaderDisplayOptionsMenuVisible ?
            (<ReaderDisplayOptionsMenu
              theme={this.props.theme}
              textFlow={this.state.textFlow}
              textReference={this.state.textReference}
              textLanguage={this.props.textLanguage}
              setTextFlow={this.setTextFlow}
              setTextLanguage={this.setTextLanguage}
              incrementFont={this.incrementFont}
              setTheme={this.setTheme}
              canBeContinuous={Sefaria.canBeContinuous(this.state.textTitle)}
              themeStr={this.props.themeStr}/>) : null }
      </View>);
  }

  render() {
    /*
    // make the SafeAreaView background based on the category color
    const cat = this.state.menuOpen ? (this.state.navigationCategories.length ? this.state.navigationCategories[0] : "Other") : Sefaria.categoryForTitle(this.state.textTitle);
    let style = {};
    if (cat) {
      style = {backgroundColor: Sefaria.util.lightenDarkenColor(Sefaria.palette.categoryColor(cat), -25)};
    }*/
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, this.props.theme.container]} {...this.gestureResponder}>
            <StatusBar
              barStyle="light-content"
            />
            { this.renderContent() }
        </View>
      </SafeAreaView>
    );
  }
}

const mapStateToProps = (
  { theme,
    themeStr,
    textLanguageByTitle,
    defaultTextLanguage,
    menuLanguage,
    fontSize,
    textLanguage,
    overwriteVersions,
  }) => ({
  theme,
  themeStr,
  defaultTextLanguage,
  menuLanguage,
  fontSize,
  textLanguageByTitle,
  textLanguage,
  overwriteVersions,
});

const mapDispatchToProps = dispatch => ({
  setTheme: themeStr => { dispatch(ACTION_CREATORS.setTheme(themeStr)); },
  setMenuLanguage: language => { dispatch(ACTION_CREATORS.setMenuLanguage(language)); },
  setTextLanguageByTitle: (title, language) => { dispatch(ACTION_CREATORS.setTextLanguageByTitle(title, language)); },
  setFontSize: fontSize => { dispatch(ACTION_CREATORS.setFontSize(fontSize)); },
  setDefaultTextLanguage: language => { dispatch(ACTION_CREATORS.setDefaultTextLanguage(language)); },
  setOverwriteVersions: overwrite => { dispatch(ACTION_CREATORS.setOverwriteVersions(overwrite)); },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReaderApp);
