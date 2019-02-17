'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  Alert,
  Animated,
  LayoutAnimation,
  AppState,
  Dimensions,
  NetInfo,
  View,
  StatusBar,
  SafeAreaView,
  Platform,
  BackHandler,
  UIManager,
  Linking,
} from 'react-native';
import { connect } from 'react-redux';
import { createResponder } from 'react-native-gesture-responder';
import SafariView from "react-native-safari-view";
import { CustomTabs } from 'react-native-custom-tabs';
import { AppInstalledChecker } from 'react-native-check-app-install';
import SplashScreen from 'react-native-splash-screen';
import nextFrame from 'next-frame';
import { Search, SearchState } from '@sefaria/search';

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
import AutocompletePage from './AutocompletePage';
import TextColumn from './TextColumn';
import ConnectionsPanel from './ConnectionsPanel';
import SettingsPage from './SettingsPage';
import InterruptingMessage from './InterruptingMessage';
import SwipeableCategoryList from './SwipeableCategoryList';
import Toast, {DURATION} from 'react-native-easy-toast';
import BackManager from './BackManager';
import ReaderNavigationSheetMenu from "./ReaderNavigationSheetMenu";
import ReaderNavigationSheetTagMenu from "./ReaderNavigationSheetTagMenu";
import Sheet from "./Sheet.js";
import SheetMetadata from "./SheetMeta.js";



import {
  LoadingView,
  CategoryColorLine,
  SefariaProgressBar,
} from './Misc.js';
const ViewPort    = Dimensions.get('window');

class ReaderApp extends React.Component {

  static propTypes = {
    theme:        PropTypes.object.isRequired,
    themeStr:     PropTypes.string.isRequired,
    setTheme:     PropTypes.func.isRequired,
    setBiLayout:  PropTypes.func.isRequired,
    biLayout:     PropTypes.string.isRequired,
    textLanguage: PropTypes.string.isRequired,
    overwriteVersions: PropTypes.bool.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    Sefaria._deleteUnzippedFiles()
    .then(Sefaria.init).then(() => {
        setTimeout(SplashScreen.hide, 300);
        this.setState({
          loaded: true,
          defaultSettingsLoaded: true,
        });
        // wait to check for interrupting message until after asyncstorage is loaded
        this._interruptingMessageRef && this._interruptingMessageRef.checkForMessage();
        const mostRecent =  Sefaria.history.length ? Sefaria.history[0] : {ref: "Genesis 1"};
        this.openRef(mostRecent.ref, null, mostRecent.versions, false)  // first call to openRef should not add to backStack
        .then(Sefaria.postInit)
        .then(Sefaria.downloader.promptLibraryDownload);
    });
    Sefaria.track.init();

    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
      if (strings.getInterfaceLanguage() === 'iw-IL') {
        // there seems to be a discrepancy b/w interfaceLanguage and language for LocalizedStrings
        strings.setLanguage('he');
      }
    }
    this.state = {
        offsetRef: null, /* used to jump to specific ref when opening a link*/
        segmentRef: "",
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
        textListFlex: 0.0001,
        textListFlexPreference: 0.6,
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
        textSearchState: new SearchState({
          type: 'text'
        }),
        sheetSearchState: new SearchState({
          type: 'sheet'
        }),
        searchType: 'text',
        searchQuery: '',
        sheetTag: '',
        sheet: null,
        sheetMeta: null,
        activeSheetNode: null,
        isNewSearch: false,
        ReaderDisplayOptionsMenuVisible: false,
        overwriteVersions: true, // false when you navigate to a text but dont want the current version to overwrite your sticky version
    };
  }

  componentDidMount() {
    NetInfo.isConnected.addEventListener(
      'connectionChange',
      this.networkChangeListener
    );
    BackHandler.addEventListener('hardwareBackPress', this.manageBack);
    AppState.addEventListener('change', this.appStateChangeListener);
    Sefaria.downloader.onChange = this.onDownloaderChange;
  }

  networkChangeListener = isConnected => {
    this.setState({hasInternet: isConnected});
  };

  appStateChangeListener = state => {
    if (state == "active") {
      Sefaria.downloader.resumeDownload();
    }
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

  componentWillUnmount() {
    Sefaria.downloader.onChange = null;
    BackHandler.removeEventListener('hardwareBackPress', this.manageBack);
    NetInfo.isConnected.removeEventListener(
      'connectionChange',
      this.networkChangeListener
    );
    AppState.removeEventListener('change', this.appStateChangeListener);
  }

  manageBackMain = () => {
    this.manageBack("main");
  }

  manageBack = type => {
    const oldState = BackManager.back({ type });
    if (!!oldState) {
      if (!oldState.menuOpen) {
        // you're going back to textcolumn. make sure to jump
        oldState.textColumnKey = oldState.segmentRef;  // manually add a key to TextColumn to make sure it gets regenerated
        oldState.offsetRef = oldState.segmentRef;
      }
      this.setState(oldState);
      return true;
    } else {
      // close app
      return false;
    }
  };

  onDownloaderChange = (openSettings) => {
    if (openSettings) {
      this.openMenu("settings");
    }
    this.forceUpdate();
  };

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

  showToast = (text, duration, callback) => {
    this.refs.toast.show(text, duration, callback);
  }

  toggleReaderDisplayOptionsMenu = () => {
    if (this.state.ReaderDisplayOptionsMenuVisible == false) {
      this.setState({ReaderDisplayOptionsMenuVisible:  true}, () => {
        // wait for ref to be defined
        this._readerDisplayOptionsMenuRef && this._readerDisplayOptionsMenuRef.show();
      });
    } else {
      this._readerDisplayOptionsMenuRef && this._readerDisplayOptionsMenuRef.hide(() => {
        this.setState({ReaderDisplayOptionsMenuVisible:  false});
      });
      this.trackPageview();
    }
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

  setBiLayout = layout => {
    this.props.setBiLayout(layout);
    this.toggleReaderDisplayOptionsMenu();
    Sefaria.track.event("Reader","Display Option Click","layout - " + layout);
  };

  getTextByLanguage = title => {
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

  setAliyot = show => {
    this.props.setAliyot(show);
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

  sheetSegmentPressed = (textRef, sheetRef, toggle) => {
    this.textSegmentPressed(sheetRef[0], sheetRef[1], textRef, toggle)
  }

  textSegmentPressed = (section, segment, segmentRef, shouldToggle) => {
      Sefaria.track.event("Reader","Text Segment Click", segmentRef);

      if (shouldToggle && this.state.textListVisible) {
          this.animateTextList(this.state.textListFlex, 0.0001, 200);
          BackManager.back({ type: "secondary" });
          return; // Don't bother with other changes if we are simply closing the TextList
      }
      if (!this.state.data[section][segment] && !this.state.sheet) {
        return;
      }
      let loadingLinks = false;
      const justOpened = shouldToggle && !this.state.textListVisible;
      const justScrolling = !shouldToggle && !this.state.textListVisible;  // true when called while scrolling with text list closed
      if (((segment !== this.state.segmentIndexRef || section !== this.state.sectionIndexRef) && !justScrolling) || justOpened) {
          loadingLinks = true;
          if (this.state.linksLoaded[section]) {
            this.updateLinkSummary(section, segment);
          }
          this.updateVersionCat(null, segmentRef);
      }
      if (this.state.connectionsMode === "versions") {
        //update versions
        //TODO not sure what this if statement was supposed to do...
      }
      let stateObj = {
          segmentRef,
          segmentIndexRef: segment,
          sectionIndexRef: section,
          linkStaleRecentFilters: this.state.linkRecentFilters.map(()=>true),
          versionStaleRecentFilters: this.state.versionRecentFilters.map(()=>true),
          loadingLinks,
      };
      if (shouldToggle) {
        BackManager.forward({ state: {textListVisible: this.state.textListVisible}, type: "secondary" });
        stateObj.textListVisible = !this.state.textListVisible;
        stateObj.offsetRef = null; //offsetRef is used to highlight. once you open textlist, you should remove the highlight
        this.setState(stateObj, () => {
          // make sure textlist renders once before using layoutanimation
          nextFrame().then(() => {
            this.animateTextList(0.0001, this.state.textListFlexPreference, 200);
          });
        });
      } else {
        this.setState(stateObj);
      }
      Sefaria.saveHistoryItem({ref: segmentRef, heRef: this.state.heRef, category: Sefaria.categoryForRef(segmentRef), versions: this.state.selectedVersions}, this.props.overwriteVersions);
      this.forceUpdate();
  };
  /*
    isLoadingVersion - true when you are replacing an already loaded text with a specific version (not currently used)
    overwriteVersions - false when you want to switch versions but not overwrite sticky version (e.g. search)
  */
  loadNewText = ({ ref, versions, isLoadingVersion = false, overwriteVersions = true }) => {
    if (!this.state.hasInternet) {
      overwriteVersions = false;
      versions = undefined; // change to default version in case they have offline library they'll still be able to read
    }
    this.props.setOverwriteVersions(overwriteVersions);
    versions = this.removeDefaultVersions(ref, versions);
    // Open ranged refs to their first segment (not ideal behavior, but good enough for now)
    ref = ref.indexOf("-") != -1 ? ref.split("-")[0] : ref;
    return new Promise((resolve, reject) => {
      this.setState({
          loaded: false,
          data: [],
          textReference: ref,
          textTitle: Sefaria.textTitleForRef(ref),
          heTitle: "",
          heRef: "",
          segmentIndexRef: -1,
          sectionIndexRef: -1,
          selectedVersions: versions,
          currVersions: {en: null, he: null},
          textToc: null,
      },
      () => {
        Sefaria.data(ref, true, versions).then(data => {
            let nextState = {
              data:              [data.content],
              textTitle:         data.indexTitle,
              next:              data.next,
              prev:              data.prev,
              heTitle:           data.heTitle,
              heRef:             data.heSectionRef || data.heRef,
              sectionArray:      [data.sectionRef],
              sectionHeArray:    [data.heSectionRef || data.heRef], // backwards compatible because offline files are missing `heSectionRef`. we specifically want heSectionRef in case you load a segment ref with context
              loaded:            true,
              offsetRef:         !data.isSectionLevel ? data.requestedRef : null,
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
            this.loadTextTocData(data.indexTitle, data.sectionRef);
            Sefaria.saveHistoryItem({ref: ref, heRef: data.heRef, category: Sefaria.categoryForRef(ref), versions: this.state.selectedVersions}, this.props.overwriteVersions);
            resolve();
        }).catch(error => {
          console.log(error);
          if (error == "Return to Nav") {
            this.openNav();
            return;
          }
          console.error('Error caught from ReaderApp.loadNewText', error);
          reject();
        });
      });
    });
  };

  loadTextTocData = (title, sectionRef) => {
    this.setState({textToc: null}, () => {
      Sefaria.textToc(title).then(textToc => {
        this.setState({textToc});
        // at this point, both book and section level version info is available
        this.setCurrVersions(sectionRef, title); // not positive if this will combine versions well
      });
    });
  }

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
        const tempLinksLoaded = this.state.linksLoaded.slice(0);
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
      console.log("error", error);
      this.setState({ versions: [], versionsApiError: true });
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
      if (!this.state.textListVisible) {
        // otherwise saveHistoryItem is called in textListPressed
        Sefaria.saveHistoryItem({ref: ref, heRef: heRef, category: Sefaria.categoryForRef(ref)});
      }
  };

  openRefSearch = ref => {
    this.openRef(ref, "search");
  };

  openRefTOC = (ref, enableAliyot) => {
    this.openRef(ref, "text toc", null, false, enableAliyot);
  };

  openRefSheet = (ref, sheetMeta) => {
      console.log(ref)
      this.setState({
          loaded: false,
      }, () => {
          this.loadSheet(ref, sheetMeta);
      })
  };

  updateActiveSheetNode = (node) => {
    this.setState ({
      activeSheetNode: node,
    })

}

  loadSheet = (ref, sheetMeta) => {
      Sefaria.api.sheets(ref)
      .then(result => {
          this.setState ({
              sheet: result,
              sheetMeta: sheetMeta,
              data: [],
              sectionArray: [],
          }, () => {
          this.closeMenu(); // Don't close until these values are in state, so sheet can load
          var sources = result["sources"].filter(source => "ref" in source || "comment" in source || "outsideText" in source || "outsideBiText" in source || "media" in source)
          var sourceRefs = sources.map(source => source.ref || "Sheet " + result.id + ":" + source.node );
          var updatedData = [];
          var updatedSectionArray = [];
          var getTextPromises = [];


          sourceRefs.forEach(function(source, index) {
              if (source.startsWith("Sheet")) {
                  //create an empty element in the state.data array so that connections panel still works
                  updatedData[index] = [{links: []}]
                  updatedSectionArray[index] = source
              }

              else {
                  getTextPromises.push(
                      Sefaria.data(source, true).then(function (data) {
                          updatedData[index] = data.content;
                          updatedSectionArray[index] = data.sectionRef;

                      }.bind(this)).catch(function (error) {
                          console.log('Error caught from ReaderApp.openRefSheet', error);
                      })
                  );
              }
          });


        Promise.all(getTextPromises).then( ()=> {
            this.setState({
                data: updatedData,
                sectionArray: updatedSectionArray,
            }, () => {
                var promises = []

                updatedSectionArray.forEach(function(section, index) {
                    promises.push(this.loadLinks(section))

                    Promise.all(promises).then(() => {
                            this.setState({
                                loaded: true,
                            })
                        }
                    );

                }.bind(this))
            })
        })
    })
      .catch(error => {
        console.log(error)
      });
      })


  };

  openRefConnectionsPanel = (ref, versions) => {
    this.openRef(ref,"text list", versions);
  };

  textUnavailableAlert = ref => {
    Alert.alert(
      strings.textUnavailable,
      strings.promptOpenOnWebMessage,
      [
        {text: strings.cancel, style: 'cancel'},
        {text: strings.open, onPress: () => {
          this.openUri(Sefaria.refToUrl(ref));
        }}
      ]
    );
  };

  /*
  calledFrom parameter used for analytics and for back button
  prevScrollPos parameter used for back button
  enableAliyot - true when you click on an aliya form ReaderTextTableOfContents
  */
  openRef = (ref, calledFrom, versions, addToBackStack=true, enableAliyot=false) => {
    return new Promise((resolve, reject) => {
      if (enableAliyot) {
        this.props.setAliyot(true);
      }
      const title = Sefaria.textTitleForRef(ref);
      const overwriteVersions = calledFrom !== 'search'; // if called from search, use version specified by search (or default if none specified)
      if (!title) {
        if (ref.startsWith("Sheet")) { //TODO: Load Sheet data via sheet ref
            resolve();
            return;
        }
        this.textUnavailableAlert(ref);
        resolve();
        return;
      }
      if (!versions && overwriteVersions) {
        //pull up default versions
        const historyItem = Sefaria.getHistoryRefForTitle(title);
        if (!!historyItem) { versions = historyItem.versions; }
      }

      const selectedVersions = !!this.state.selectedVersions ? this.state.selectedVersions : {};
      const newVersions = !!versions && {
        ...selectedVersions,
        ...versions,
      };

      // make sure loaded text will show the versions you selected
      let newTextLang = this.props.textLanguage;
      if (newTextLang !== 'bilingual') {
        // if you're in bilingual, assume you want to stay in that
        if (!!newVersions['en'] && !!newVersions['he']) { newTextLang = "bilingual"; }
        else if (!!newVersions['en']) { newTextLang = "english"; }
        else { newTextLang = "hebrew"; }
        this.setTextLanguage(newTextLang, null, null, true);
      }

      switch (calledFrom) {
        case "search":
          Sefaria.track.event("Search","Search Result Text Click",this.state.searchQuery + ' - ' + ref);
          break;
        case "navigation":
          Sefaria.track.event("Reader","Navigation Text Click", ref);
          break;
        case "text toc":
          break;
        case "text list":
          Sefaria.track.event("Reader","Click Text from TextList",ref);
          break;
        default:
          break;
      }

      if (addToBackStack) {
        BackManager.forward({ state: this.state, calledFrom });
      }

      this.setState({
        loaded: false,
        textListVisible: false,
        textReference: ref,
        sheet: null,
        sheetMeta: null,
      }, () => {
          this.closeMenu(); // Don't close until these values are in state, so we know if we need to load defualt text
          this.loadNewText({ ref, versions: newVersions, overwriteVersions }).then(resolve);
      });
    })
  };

  openMenu = (menu) => {
    const SKIP_MENUS = {autocomplete: true};  // set of `menuOpen` states which you shouldn't be able to go back to
    if (!SKIP_MENUS[this.state.menuOpen] && !!menu) {
      BackManager.forward({ state: this.state });
    }
    this.setState({menuOpen: menu});
  };

  openSubMenu = (subMenu, isBack) => {
    if (isBack) {
      this.manageBackMain();
    } else {
      BackManager.forward({ state: this.state });
      this.setState({subMenuOpen: subMenu});
    }
  };

  closeMenu = () => {
      this.clearMenuState();
      this.openMenu(null);
      if (!this.state.textReference) {
          this.openDefaultText();
      }
  };

  openNav = () => {
      this.clearAllSearchFilters('text');
      this.clearAllSearchFilters('sheet');
      this.setState({
        loaded: true,
        searchQuery: "",
        textSearchState: new SearchState({type: 'text'}),
        sheetSearchState: new SearchState({type: 'sheet'}),
        textListVisible: false,
      });
      this.openMenu("navigation");
  };

  openUri = uri => {
    uri = encodeURI(uri);
    if (Platform.OS == "ios") {
      SafariView.isAvailable()
      .then(SafariView.show({
        url: uri,
      }))
      .catch(error => this.openInDefaultBrowser(uri));
    } else if (Platform.OS == "android") {
      AppInstalledChecker.isAppInstalled('chrome')
      .then(installed => {
        if (installed) {
          CustomTabs.openURL(uri, {
            toolbarColor: Sefaria.palette.system,
            enableUrlBarHiding: true,
            showPageTitle: true,
            enableDefaultShare: true,
          })
          .catch (error => this.openInDefaultBrowser(uri));
        } else {
          this.openInDefaultBrowser(uri);
        }
      });
    } else {
      this.openInDefaultBrowser(uri);
    }
  };

  openInDefaultBrowser = uri => {
    Linking.openURL(uri);
  }

  goBack = () => {
    const { stateFunc } = this.state.backStack.pop();
    stateFunc();
  };

  setNavigationCategories = (categories) => {
    if (categories.length) {
      BackManager.forward({ state: this.state, calledFrom: "toc" });
    } else {
      // you're navigating home, make sure to delete previous toc entries in the backStack
      BackManager.back({ calledFrom: "toc" });
    }
    this.setState({navigationCategories: categories});
  };

  setInitSearchScrollPos = (type, initScrollPos) => {
    const searchState = this._getSearchState(type);
    const searchStateName = this._getSearchStateName(type);
    this.setState({
      [searchStateName]:
        searchState.update({
          initScrollPos,
        })
    });
  };

  openTextTocDirectly = (title) => {

    // used to open text toc witout going throught the reader
    if (!Sefaria.booksDict[title]) {
      this.textUnavailableAlert(title);
      return;
    }
    this.loadTextTocData(title);
    this.setState({textTitle: title}, () => {  // openTextToc assumes that title is set correctly
      this.openTextToc();
    });
  };

  openTextToc = () => {
      this.openMenu("text toc");
  };

  openSheetMeta = () => {
      this.openMenu("sheet meta");
  };

  openSearch = (type, query) => {
    this.onQueryChange(type, query,true,false,true);
    this.openMenu("search");

    Sefaria.track.event("Search","Search Box Search",query);
  };

  openAutocomplete = () => {
    this.openMenu("autocomplete");
  }

  openSheetTag = (tag) => {
    this.setState({sheetTag: tag});
    this.openMenu("sheetTag");
  };

  clearMenuState = () => {
      this.setState({
          navigationCategories: [],
      });
  };

  openDefaultText = () => {
      this.openRef("Genesis 1");
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
    Sefaria.links.linkSummary(this.state.textReference, this.state.data[section][segment].links, this.props.menuLanguage).then((data) => {
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
    const cutoffLen = 3500;
    if (data.en.length > cutoffLen) {
      const spaceInd = data.en.indexOf(' ', cutoffLen);
      if (spaceInd === -1) { spaceInd = cutoffLen; }
      data.en = data.en.slice(0, spaceInd) + "... <b>(Tap to read more)</b>";
    }
    if (data.he.length > cutoffLen) {
      const spaceInd = data.he.indexOf(' ', cutoffLen);
      if (spaceInd === -1) { spaceInd = cutoffLen; }
      data.he = data.he.slice(0, spaceInd) + "... <b>(לחץ לקרוא עוד)</b>";
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
    console.log('loadVersionContent', ref, pos, versionTitle, versionLanguage);
    Sefaria.data(ref, false, {[versionLanguage]: versionTitle }).then(data => {
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
    this.setState({ textListFlex: flex });
  };

  onTextListAnimateFinish = () => {
    const { textListFlex } = this.state;
    const tempState = { textListAnimating: false };
    if (textListFlex < 0.001) {
      tempState.textListFlex = 0.0001;
      tempState.textListVisible = false;
    }
    this.setState(tempState);
  };

  animateTextList = (fromValue, toValue, duration) => {
    this.setState({ textListAnimating: true, textListFlex: fromValue}, () => {
      const CustomLayoutLinear = {
        duration,
        create: {
          type: LayoutAnimation.Types.linear,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.linear,
        }
      }
      const isIOS = Platform.OS === 'ios';
      LayoutAnimation.configureNext(CustomLayoutLinear, isIOS ? this.onTextListAnimateFinish : undefined);
      this.setState({ textListFlex: toValue });
      if (!isIOS) {
        setTimeout(this.onTextListAnimateFinish, duration + 100);
      }
    })
  };

  onTextListDragEnd = evt => {
    const headerHeight = 75;
    const flex = 1.0 - (evt.nativeEvent.pageY-headerHeight)/(ViewPort.height-headerHeight) + this._textListDragOffset;
    if (flex > 0.9 || flex < 0.2) {
      this.animateTextList(flex, flex > 0.9 ? 0.9999 : 0.0001, 200);
    } else {
      this.setState({ textListFlexPreference: flex });
    }
  };
  _getSearchStateName = type => ( `${type}SearchState` );
  _getSearchState = type => ( this.state[this._getSearchStateName(type)] );
  onQueryChange = (type, query, resetQuery, fromBackButton, getFilters) => {
    // getFilters should be true if the query has changed or the exactType has changed
    const searchState = this._getSearchState(type);
    const searchStateName = this._getSearchStateName(type);
    const { field, fieldExact, sortType, filtersValid, appliedFilters, appliedFilterAggTypes } = searchState;
    const { aggregation_field_array, build_and_apply_filters } = SearchState.metadataByType[type];
    let newSearchPage = 0;
    let start = 0;
    let size = 20;
    if (resetQuery && !fromBackButton) {
      this.setInitSearchScrollPos(type, 0);
      Sefaria.saveRecentQuery(query, "query");
    }
    if (!resetQuery) {
      newSearchPage = searchState.currPage + 1;
      start = 20 * newSearchPage;
    }
    if (fromBackButton) {
      size = 20 * (searchState.currPage + 1);
      newSearchPage = size/20;
    }

    const justUnapplied = false; //TODO: placeholder
    const aggregationsToUpdate = filtersValid && aggregation_field_array.length === 1 ? [] : aggregation_field_array.filter( a => justUnapplied || a !== 'this.lastAppliedAggType[type]'); //TODO: placeholder
    var queryProps = {
      query,
      size,
      start,
      type,
      field,
      exact: fieldExact === field,
      applied_filters: appliedFilters,
      appliedFilterAggTypes,
      aggregationsToUpdate,
      sort_type: sortType,
    };
    this.setState({
      searchQuery:query,
      [searchStateName]: searchState.update({
        currPage: newSearchPage,
        isLoading: true,
        filtersValid: !getFilters,
      }),
    }, () => {
      // for some reason `searchState` pointed to out of date object here so reset it
      const searchState = this._getSearchState(type);
      const searchStateName = this._getSearchStateName(type);
      Sefaria.search.execute_query(queryProps)
      .then(data => {
        const newResultsArray = data.hits.hits.map(r => ({
            title: r._source.ref,
            heTitle: r._source.heRef,
            text: r.highlight[field].join(" ... "),
            id: r._id,
            textType: r._id.includes("[he]") ? "hebrew" : "english",
          })
        );
        const results = resetQuery ? newResultsArray :
          searchState.results.concat(newResultsArray);

        var numResults = data.hits.total;
        this.setState({
          [searchStateName]: searchState.update({
            isLoadingTail: false,
            isLoading: false,
            results,
            numResults,
          }),
        }, () => {
          if (resetQuery) {
            Sefaria.track.event("Search","Query: text", query, numResults);
          }
          if (data.aggregations) {
            let availableFilters = [];
            let registry = {};
            let orphans = [];
            for (let aggregation of aggregation_field_array) {
              if (!!data.aggregations[aggregation]) {
                const { buckets } = data.aggregations[aggregation];
                const { availableFilters: tempAvailable, registry: tempRegistry, orphans: tempOrphans } = Sefaria.search[build_and_apply_filters](buckets, appliedFilters, appliedFilterAggTypes, aggregation, Sefaria);
                availableFilters.push(...tempAvailable);  // array concat
                registry = {...registry, ...tempRegistry};
                orphans.push(...tempOrphans);
                this.setAvailableSearchFilters(type, availableFilters, orphans);
              }
            }
          }
        });
      })
      .catch((error) => {
        //TODO: add hasError boolean to state
        console.log(error);
        this.setState({
          [searchStateName]: searchState.update({
            isLoadingTail: false,
            isLoading: false,
            filtersValid: false,
            results: [],
            numResults: 0,
            initScrollPos: 0,
          }),
        });
      });
    });
  };

  setLoadQueryTail = (type, isLoading) => {
    const searchState = this._getSearchState(type);
    const searchStateName = this._getSearchStateName(type);
    this.setState({
      [searchStateName]:
        searchState.update({
          isLoading,
        }),
    });
    if (isLoading) {
      this.onQueryChange(type, this.state.searchQuery, false);
    }
  };

  setIsNewSearch = (isNewSearch) => {
    this.setState({isNewSearch: isNewSearch});
  };

  setAvailableSearchFilters = (type, availableFilters, orphanFilters) => {
    const searchState = this._getSearchState(type);
    const searchStateName = this._getSearchStateName(type);
    this.setState({
      [searchStateName]:
        searchState.update({
          availableFilters,
          orphanFilters,
          filtersValid: true,
          //aggregationsToUpdate, TODO: placeholder
        })
    });
  };

  toggleSearchFilter = (type, filterNode) => {
    if (filterNode.isUnselected()) {
      filterNode.setSelected(true);
    } else {
      filterNode.setUnselected(true);
    }
    this.reapplySearchFilters(type);
  };

  clearAllSearchFilters = type => {
    const searchState = this._getSearchState(type);
    for (let filterNode of searchState.availableFilters) {
      filterNode.setUnselected(true);
    }
    this.reapplySearchFilters(type);
  };

  reapplySearchFilters = type => {
    const searchState = this._getSearchState(type);
    const searchStateName = this._getSearchStateName(type);
    this.setState({
      [searchStateName]: searchState.update(
        Sefaria.search.getAppliedSearchFilters(searchState.availableFilters)
      )
    });
  }

  setSearchOptions = (type, sortType, field, cb) => {
    const searchState = this._getSearchState(type);
    const searchStateName = this._getSearchStateName(type);
    const metaState = SearchState.metadataByType[type];
    if (!field) { field = metaState.field; }
    console.log('setSearchOptions', type, sortType, field, searchState.field);
    const filtersValid = field === searchState.field;
    this.setState({
      [searchStateName]: searchState.update({
        sortType,
        field,
        filtersValid,
      })
    }, cb);
  };

  onChangeSearchQuery = query => {
    this.setState({searchQuery: query});
  }

  _getReaderDisplayOptionsMenuRef = ref => {
    this._readerDisplayOptionsMenuRef = ref;
  };

  _getInterruptingMessageRef = ref => {
    this._interruptingMessageRef = ref;
  };

  _onStartShouldSetResponderCapture = () => {
    if (this.state.ReaderDisplayOptionsMenuVisible === true) {
       this.toggleReaderDisplayOptionsMenu();
       return true;
    }
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
          (<View style={{flex:1, flexDirection: 'row'}}>
            <ReaderNavigationMenu
              searchQuery={this.state.searchQuery}
              categories={this.state.navigationCategories}
              setCategories={this.setNavigationCategories}
              openRef={(ref, versions)=>this.openRef(ref,"navigation", versions)}
              openAutocomplete={this.openAutocomplete}
              onBack={this.manageBackMain}
              openSearch={this.openSearch}
              setIsNewSearch={this.setIsNewSearch}
              toggleLanguage={this.toggleMenuLanguage}
              menuLanguage={this.props.menuLanguage}
              openSettings={this.openMenu.bind(null, "settings")}
              openHistory={this.openMenu.bind(null, "history")}
              openSaved={this.openMenu.bind(null, "saved")}
              openSheets={this.openMenu.bind(null, "sheets")}
              interfaceLang={this.state.interfaceLang}
              onChangeSearchQuery={this.onChangeSearchQuery}
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              openUri={this.openUri}
              searchType={this.state.searchType}
              toggleDebugInterruptingMessage={this.props.toggleDebugInterruptingMessage}
              debugInterruptingMessage={this.props.debugInterruptingMessage}/>
          </View>)
        );
      case ("text toc"):
        return (
          <ReaderTextTableOfContents
            textToc={this.state.textToc}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            title={this.state.textTitle}
            currentRef={this.state.textReference}
            currentHeRef={this.state.heRef}
            textLang={this.props.textLanguage == "hebrew" ? "hebrew" : "english"}
            contentLang={this.props.menuLanguage}
            interfaceLang={this.state.interfaceLang}
            close={this.manageBackMain}
            openRef={this.openRefTOC}
            toggleLanguage={this.toggleMenuLanguage}
            openUri={this.openUri}/>);
        break;
      case ("sheet meta"):
        return (
          <SheetMetadata
            sheet={this.state.sheet}
            sheetMeta={this.state.sheetMeta}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            textLang={this.props.textLanguage == "hebrew" ? "hebrew" : "english"}
            contentLang={this.props.menuLanguage}
            interfaceLang={this.state.interfaceLang}
            close={this.manageBackMain}
            openSheetTagMenu={this.openSheetTag}
            toggleLanguage={this.toggleMenuLanguage}
          />);
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
            onBack={this.manageBackMain}
            search={this.onQueryChange}
            openRef={this.openRefSearch}
            setLoadTail={this.setLoadQueryTail}
            setIsNewSearch={this.setIsNewSearch}
            setSearchOptions={this.setSearchOptions}
            query={this.state.searchQuery}
            searchState={this._getSearchState(this.state.searchType)}
            toggleFilter={this.toggleSearchFilter}
            isNewSearch={this.state.isNewSearch}
            setInitSearchScrollPos={this.setInitSearchScrollPos}
            clearAllFilters={this.clearAllSearchFilters}
            openAutocomplete={this.openAutocomplete}
            onChangeSearchQuery={this.onChangeSearchQuery}
          />);
        break;
      case ("autocomplete"):
        return (
          <AutocompletePage
            interfaceLang={this.state.interfaceLang}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            onBack={this.manageBackMain}
            openSearch={this.openSearch}
            setIsNewSearch={this.setIsNewSearch}
            onChange={this.onChangeSearchQuery}
            query={this.state.searchQuery}
            openRef={this.openRef}
            openTextTocDirectly={this.openTextTocDirectly}
            setCategories={cats => { /* first need to go to nav page */ this.openNav(); this.setNavigationCategories(cats);} }
            searchType={this.state.searchType}
            openUri={this.openUri}
          />);
        break;
      case ("settings"):
        return(
          <SettingsPage
            {...this.props}
            close={this.manageBackMain}
            interfaceLang={this.state.interfaceLang}
          />);
        break;
      case ("history"):
        return(
          <SwipeableCategoryList
            close={this.manageBackMain}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            toggleLanguage={this.toggleMenuLanguage}
            openRef={this.openRef}
            language={this.props.menuLanguage}
            interfaceLang={this.state.interfaceLang}
            data={Sefaria.history}
            onRemove={Sefaria.removeHistoryItem}
            title={strings.history}
            menuOpen={this.state.menuOpen}
            icon={this.props.themeStr === "white" ? require('./img/clock.png') : require('./img/clock-light.png')}
          />
        );
        break;
      case ("saved"):
        return(
          <SwipeableCategoryList
            close={this.manageBackMain}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            toggleLanguage={this.toggleMenuLanguage}
            openRef={this.openRef}
            language={this.props.menuLanguage}
            data={Sefaria.saved}
            onRemove={Sefaria.removeSavedItem}
            title={strings.saved}
            menuOpen={this.state.menuOpen}
            icon={this.props.themeStr === "white" ? require('./img/starUnfilled.png') : require('./img/starUnfilled-light.png')}
          />
        );
        break;
      case ("sheets"):
        return(
           <ReaderNavigationSheetMenu
            close={this.manageBackMain}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            toggleLanguage={this.toggleMenuLanguage}
            hasInternet={this.state.hasInternet}
            language={this.props.menuLanguage}
            menuOpen={this.state.menuOpen}
            icon={require('./img/sheet.png')}
            menuLanguage={this.props.menuLanguage}
            interfaceLang={this.state.interfaceLang}
            openSheetTagMenu={this.openSheetTag}
           />
        );
        break;
      case ("sheetTag"):
        return(
          loading ?
          <LoadingView theme={this.props.theme} /> :
           <ReaderNavigationSheetTagMenu
            icon={require('./img/sheet.png')}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            menuLanguage={this.props.menuLanguage}
            interfaceLang={this.state.interfaceLang}
            toggleLanguage={this.toggleMenuLanguage}
            hasInternet={this.state.hasInternet}
            tag={this.state.sheetTag}
            onBack={this.manageBackMain}
            openRef={this.openRefSheet}
           />
        );


    }

    if (this.state.sheet) {
        let sheetColumnFlex = this.state.textListVisible ? 1.0 - this.state.textListFlex : 1.0;
        return (
            <View style={[styles.container, this.props.theme.container]} {...this.gestureResponder}>
            <CategoryColorLine category="Sheets" />
                      <ReaderControls
            theme={this.props.theme}
            enRef={this.state.textReference}
            heRef={this.state.heRef}
            language={this.props.menuLanguage}
            categories={["Sheets"]}
            openNav={this.openNav}
            themeStr={this.props.themeStr}
            goBack={this.manageBackMain}
            openTextToc={this.openTextToc}
            openSheetMeta={this.openSheetMeta}
            sheet={this.state.sheet}
            sheetMeta={this.state.sheetMeta}
            backStack={BackManager.getStack({ type: "main" })}
            toggleReaderDisplayOptionsMenu={this.toggleReaderDisplayOptionsMenu}
            openUri={this.openUri}/>
          <View style={[{flex: sheetColumnFlex}, styles.mainTextPanel, this.props.theme.mainTextPanel]}
                onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}>

          { loading ?
          <LoadingView theme={this.props.theme} style={{flex: sheetColumnFlex}}/> :

          <Sheet
            sheet={this.state.sheet}
            activeSheetNode={this.state.activeSheetNode}
            updateActiveSheetNode={this.updateActiveSheetNode}
            sheetMeta={this.state.sheetMeta}
            textData={this.state.data}
            sectionArray={this.state.sectionArray}
            menuLanguage={this.props.menuLanguage}
            textSegmentPressed={ this.sheetSegmentPressed }
            theme={this.props.theme}
            textListVisible={this.state.textListVisible}
            textLanguage={this.props.textLanguage}
            biLayout={this.props.biLayout}
            fontSize={this.props.fontSize}

          />

          }
              </View>

          {this.state.textListVisible ?
            <ConnectionsPanel
              sheet={this.state.sheet}
              sheetMeta={this.state.sheetMeta}
              textListFlex={this.state.textListFlex}
              textListFlexAnimated={this.state.textListFlexAnimated}
              animating={this.state.textListAnimating}
              onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}
              textToc={this.state.textToc}
              menuLanguage={this.props.menuLanguage}
              fontSize={this.props.fontSize}
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              interfaceLang={this.state.interfaceLang}
              segmentRef={this.state.segmentRef}
              heSegmentRef={Sefaria.toHeSegmentRef(this.state.heRef, this.state.segmentRef)}
              categories={Sefaria.categoriesForTitle(this.state.textTitle)}
              textFlow={this.state.textFlow}
              textLanguage={this.props.textLanguage}
              openRef={this.openRefConnectionsPanel}
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
              textTitle={this.state.textTitle}
              openUri={this.openUri} />
             : null
          }



          {this.state.ReaderDisplayOptionsMenuVisible ?
            (<ReaderDisplayOptionsMenu
              ref={this._getReaderDisplayOptionsMenuRef}
              theme={this.props.theme}
              textFlow={this.state.textFlow}
              biLayout={this.props.biLayout}
              textReference={this.state.textReference}
              interfaceLang={this.state.interfaceLang}
              textLanguage={this.props.textLanguage}
              showAliyot={false}
              setTextFlow={this.setTextFlow}
              setBiLayout={this.setBiLayout}
              setAliyot={this.setAliyot}
              setTextLanguage={this.setTextLanguage}
              incrementFont={this.incrementFont}
              setTheme={this.setTheme}
              canBeContinuous={false}
              canHaveAliyot={false}
              themeStr={this.props.themeStr}/>) : null
          }


        </View>
    )
    }

    let textColumnFlex = this.state.textListVisible ? 1.0 - this.state.textListFlex : 1.0;
    return (
      <View style={[styles.container, this.props.theme.container]} {...this.gestureResponder}>
          <CategoryColorLine category={Sefaria.categoryForTitle(this.state.textTitle)} />
          <ReaderControls
            theme={this.props.theme}
            enRef={this.state.textReference}
            heRef={this.state.heRef}
            language={this.props.menuLanguage}
            categories={Sefaria.categoriesForTitle(this.state.textTitle)}
            openNav={this.openNav}
            themeStr={this.props.themeStr}
            goBack={this.manageBackMain}
            openTextToc={this.openTextToc}
            backStack={BackManager.getStack({ type: "main" })}
            toggleReaderDisplayOptionsMenu={this.toggleReaderDisplayOptionsMenu}
            openUri={this.openUri}/>

          { loading ?
          <LoadingView theme={this.props.theme} style={{flex: textColumnFlex}} category={Sefaria.categoryForTitle(this.state.textTitle)}/> :
          <View style={[{flex: textColumnFlex}, styles.mainTextPanel, this.props.theme.mainTextPanel]}
                onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}>
            <TextColumn
              key={this.state.textColumnKey}
              showToast={this.showToast}
              textToc={this.state.textToc}
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
              menuLanguage={this.props.menuLanguage}
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
              loadingTextHead={this.state.loadingTextHead}
              showAliyot={this.props.showAliyot}
              openUri={this.openUri}
              biLayout={this.props.biLayout} />
          </View> }

          {this.state.textListVisible ?
            <ConnectionsPanel
              textListFlex={this.state.textListFlex}
              textListFlexAnimated={this.state.textListFlexAnimated}
              animating={this.state.textListAnimating}
              onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}
              textToc={this.state.textToc}
              menuLanguage={this.props.menuLanguage}
              fontSize={this.props.fontSize}
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              interfaceLang={this.state.interfaceLang}
              segmentRef={this.state.segmentRef}
              heSegmentRef={Sefaria.toHeSegmentRef(this.state.heRef, this.state.segmentRef)}
              categories={Sefaria.categoriesForTitle(this.state.textTitle)}
              textFlow={this.state.textFlow}
              textLanguage={this.props.textLanguage}
              openRef={this.openRefConnectionsPanel}
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
              textTitle={this.state.textTitle}
              openUri={this.openUri} />
             : null
          }
          {this.state.ReaderDisplayOptionsMenuVisible ?
            (<ReaderDisplayOptionsMenu
              ref={this._getReaderDisplayOptionsMenuRef}
              theme={this.props.theme}
              textFlow={this.state.textFlow}
              biLayout={this.props.biLayout}
              textReference={this.state.textReference}
              interfaceLang={this.state.interfaceLang}
              textLanguage={this.props.textLanguage}
              showAliyot={this.props.showAliyot}
              setTextFlow={this.setTextFlow}
              setBiLayout={this.setBiLayout}
              setAliyot={this.setAliyot}
              setTextLanguage={this.setTextLanguage}
              incrementFont={this.incrementFont}
              setTheme={this.setTheme}
              canBeContinuous={Sefaria.canBeContinuous(this.state.textTitle)}
              canHaveAliyot={Sefaria.canHaveAliyot(this.state.textTitle)}
              themeStr={this.props.themeStr}/>) : null
          }
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
    const isD = Sefaria.downloader.downloading;
    const nAvailable = isD ? Sefaria.downloader.titlesAvailable().filter(t => Sefaria.packages.titleIsSelected(t)).length : 0;
    const nUpdates = isD ? Sefaria.downloader.updatesAvailable().filter(t => Sefaria.packages.titleIsSelected(t)).length : 0;
    return (
      <View style={{flex:1}}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.container, this.props.theme.container]} {...this.gestureResponder}>
              <StatusBar
                barStyle="light-content"
              />
              {
                Sefaria.downloader.downloading && nUpdates > 0 && this.state.menuOpen !== 'settings' ?
                <SefariaProgressBar
                  theme={this.props.theme}
                  themeStr={this.props.themeStr}
                  progress={(nAvailable - nUpdates) / nAvailable}
                  onPress={()=>{ this.openMenu("settings")}}
                  onClose={Sefaria.packages.deleteActiveDownloads}
                  interfaceLang={this.state.interfaceLang}
                /> : null
              }
              { this.renderContent() }
          </View>
          <Toast ref="toast"/>
        </SafeAreaView>
        <InterruptingMessage
          ref={this._getInterruptingMessageRef}
          interfaceLang={this.state.interfaceLang}
          openInDefaultBrowser={this.openInDefaultBrowser}
          debugInterruptingMessage={this.props.debugInterruptingMessage} />
      </View>

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
    showAliyot,
    debugInterruptingMessage,
    biLayout,
  }) => ({
  theme,
  themeStr,
  defaultTextLanguage,
  menuLanguage,
  fontSize,
  textLanguageByTitle,
  textLanguage,
  overwriteVersions,
  showAliyot,
  debugInterruptingMessage,
  biLayout,
});

const mapDispatchToProps = dispatch => ({
  setTheme: themeStr => { dispatch(ACTION_CREATORS.setTheme(themeStr)); },
  setMenuLanguage: language => { dispatch(ACTION_CREATORS.setMenuLanguage(language)); },
  setTextLanguageByTitle: (title, language) => { dispatch(ACTION_CREATORS.setTextLanguageByTitle(title, language)); },
  setFontSize: fontSize => { dispatch(ACTION_CREATORS.setFontSize(fontSize)); },
  setDefaultTextLanguage: language => { dispatch(ACTION_CREATORS.setDefaultTextLanguage(language)); },
  setOverwriteVersions: overwrite => { dispatch(ACTION_CREATORS.setOverwriteVersions(overwrite)); },
  setAliyot: show => { dispatch(ACTION_CREATORS.setAliyot(show)); },
  toggleDebugInterruptingMessage: () => { dispatch(ACTION_CREATORS.toggleDebugInterruptingMessage()); },
  setBiLayout: layout => { dispatch(ACTION_CREATORS.setBiLayout(layout)); },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReaderApp);
