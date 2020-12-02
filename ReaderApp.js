'use strict';

import PropTypes from 'prop-types';
import crashlytics from '@react-native-firebase/crashlytics';  // to setup up generic crashlytics reports

import React from 'react';
import {
  Animated,
  Alert,
  LayoutAnimation,
  AppState,
  Dimensions,
  View,
  StatusBar,
  SafeAreaView,
  Platform,
  BackHandler,
  UIManager,
  Linking,
  Share,
} from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from '@react-native-community/async-storage';
import { connect } from 'react-redux';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
//import --- from 'react-native-gesture-handler';
import BackgroundFetch from "react-native-background-fetch";
import { InAppBrowser } from "@matt-block/react-native-in-app-browser";
import SplashScreen from 'react-native-splash-screen';
import nextFrame from 'next-frame';
import RNShake from 'react-native-shake';
import SoundPlayer from 'react-native-sound-player'
import { Search, SearchState } from '@sefaria/search';

import { STATE_ACTIONS } from './StateManager';
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
import Toast from 'react-native-root-toast';
import BackManager from './BackManager';
import ReaderNavigationSheetMenu from "./ReaderNavigationSheetMenu";
import ReaderNavigationSheetList from "./ReaderNavigationSheetList";
import ReaderNavigationSheetCategoryMenu from "./ReaderNavigationSheetCategoryMenu";
import SheetMetadata from "./SheetMeta.js";
import DeepLinkRouter from "./DeepLinkRouter.js";
import { AuthPage } from "./AuthPage";
import Dedication from  "./Dedication"
import {
  Tracker as DownloadTracker,
  promptLibraryUpdate
} from "./DownloadControl.js"



import {
  LoadingView,
  CategoryColorLine,
  SefariaProgressBar,
  ConditionalProgressWrapper,
} from './Misc.js';
const ViewPort    = Dimensions.get('window');

class ReaderApp extends React.PureComponent {
  static whyDidYouRender = true;
  static propTypes = {
    theme:            PropTypes.object.isRequired,
    themeStr:         PropTypes.string.isRequired,
    biLayout:         PropTypes.string.isRequired,
    textLanguage:     PropTypes.string.isRequired,
    overwriteVersions:PropTypes.bool.isRequired,
    isLoggedIn:       PropTypes.bool.isRequired,
    dispatch:         PropTypes.func.isRequired,
  };

  constructor(props, context) {
    console.log('ReaderApp Props', props,);
    super(props, context);
    this._initDeepLinkURL = null;  // if you init the app thru a deep link, need to make sure the URL is applied during componentDidMount()
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
      if (strings.getInterfaceLanguage() === 'iw-IL') {
        // there seems to be a discrepancy b/w interfaceLanguage and language for LocalizedStrings
        strings.setLanguage('he');
      }
    }
    this.state = {
        _completedInit: false,
        offsetRef: null, /* used to jump to specific ref when opening a link*/
        segmentRef: "",
        segmentIndexRef: -1,
        sectionIndexRef: 0,
        textReference: "",
        textTitle: "",
        loaded: false,
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
        sheetCategory: '',
        sheet: null,
        sheetMeta: null,
        activeSheetNode: null,
        isNewSearch: false,
        ReaderDisplayOptionsMenuVisible: false,
        dictLookup: null,
        overwriteVersions: true, // false when you navigate to a text but dont want the current version to overwrite your sticky version
    };
    this.NetInfoEventListener = () => {};  // calling the event listener unsubcribes, initialize to a null method
  }

  componentDidMount() {
    // add handleOpenURL listener before running initFiles so that _initDeepLinkURL will be set in time
    Linking.getInitialURL().then(url => { this.handleOpenURL({ url }); }).catch(err => {
        console.warn('An error occurred', err);
    });
    Linking.addEventListener('url', this.handleOpenURL);
    BackgroundFetch.configure({
      minimumFetchInterval: 15,
      stopOnTerminate: false,
      startOnBoot: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    }, this.onBackgroundSync, error => console.log('error starting BackgroundFetch'));
    this.initFiles();
    Sefaria.track.init();
    this.NetInfoEventListener = NetInfo.addEventListener(
      this.networkChangeListener
    );
    BackHandler.addEventListener('hardwareBackPress', this.manageBack);
    RNShake.addEventListener('ShakeEvent', () => {
      if (Sefaria.isGettinToBePurimTime()) {
        SoundPlayer.playSoundFile('grogger', 'mp3');
      }
    });
    if (Platform.OS === 'android') {
      const { PlayInstallReferrer } = require('react-native-play-install-referrer');
      PlayInstallReferrer.getInstallReferrerInfo((installReferrerInfo, error) => {
        if (!error) {
          Sefaria.track.event("Install", {
            installReferrer: installReferrerInfo.installReferrer,
            referrerClickTimestampSeconds: installReferrerInfo.referrerClickTimestampSeconds,
            installBeginTimestampSeconds: installReferrerInfo.installBeginTimestampSeconds,
            referrerClickTimestampServerSeconds: installReferrerInfo.referrerClickTimestampServerSeconds,
            installBeginTimestampServerSeconds: installReferrerInfo.installBeginTimestampServerSeconds,
            installVersion: installReferrerInfo.installVersion
          });
        } else {
          crashlytics().recordError(new Error(`Install Referrer Track Failed. Response code: ${error.responseCode}. Message: ${error.message}`));
        }
      });
    }
  }

  logout = async () => {
    await Sefaria.api.clearAuthStorage();
    this.props.dispatch({
      type: STATE_ACTIONS.setIsLoggedIn,
      value: false,
    });
  };

  networkChangeListener = netState => {
    this.setState({hasInternet: netState.isConnected});
  };
  setSearchTypeState = type => {
    this.setState({searchType: type});
    console.log(type)
  };

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.manageBack);
    this.NetInfoEventListener();  // calling the event listener unsubcribes
    Linking.removeEventListener('url', this.handleOpenURL);
    RNShake.removeEventListener('ShakeEvent');
    DownloadTracker.unsubscribe('ReaderApp')
  }

  promptLibraryDownload() {
    AsyncStorage.getItem("libraryDownloadPrompted").
    then(async (prompted) => {
      prompted = JSON.parse(prompted); // todo: if (prompted) return and move the Asynctorage down
      await AsyncStorage.setItem("libraryDownloadPrompted", "true");
      if (!prompted) {
        const onDownload = () => {


          this.openMenu("settings")
        };
        const onCancel = () => {
          Alert.alert(
            strings.usingOnlineLibrary,
            strings.howToDownloadLibraryMessage,
            [
              {text: strings.ok}
            ]);
        };
        const showWelcomeAlert = () => {
          Alert.alert(
            strings.welcome,
            strings.downloadLibraryRecommendedMessage,
            [
              {text: strings.openSettings, onPress: onDownload},
              {text: strings.notNow, onPress: onCancel}
            ]
          );
        };
        showWelcomeAlert();
      }
    });
  }

  initFiles = () => {
    Sefaria._deleteUnzippedFiles()
    .then(() => Sefaria.init(this.props.dispatch)).then(() => {
        setTimeout(SplashScreen.hide, 300);
        this.setState({
          loaded: true,
        });
        // wait to check for interrupting message until after asyncstorage is loaded
        this._interruptingMessageRef && this._interruptingMessageRef.checkForMessage();
        if (!this._initDeepLinkURL) {
          const mostRecent =  Sefaria.history.lastPlace.length ? Sefaria.history.lastPlace[0] : {ref: "Genesis 1"};
          this.openRef(mostRecent.ref, null, mostRecent.versions, false)  // first call to openRef should not add to backStack
          .then(Sefaria.postInitSearch)
          .then(() => Sefaria.postInit(this.props.downloadNetworkSetting))
          .then(() => { this.setState({_completedInit: true}); })
          .then(this.promptLibraryDownload.bind(this));
        } else {
          // apply deep link here to make sure it applies correctly
          // load search files before deep link incase deep link is to search
          Sefaria.postInitSearch()
          .then(() => {
            this._deepLinkRouterRef.route(this._initDeepLinkURL);
          })
          .then(() => Sefaria.postInit(this.props.downloadNetworkSetting))
          .then(() => { this.setState({_completedInit: true}); })
          .then(this.promptLibraryDownload.bind(this));
        }
    });
  }

  manageBackMain = () => {
    this.manageBack("main");
  }

  manageBack = type => {
    const oldState = BackManager.back({ type });
    if (!!oldState) {
      const isTextColumn = !oldState.menuOpen;
      if (isTextColumn) {
        // you're going back to textcolumn. make sure to jump
        oldState.textColumnKey = oldState.segmentRef;  // manually add a key to TextColumn to make sure it gets regenerated
        oldState.offsetRef = oldState.segmentRef;
        if (!!oldState.linksLoaded) {
          oldState.linksLoaded = oldState.linksLoaded.map(() => false);  // manually set linksLoaded to false because links are not stored in oldState
        }
      } else if (oldState.menuOpen === 'search') {
        this.onQueryChange('sheet', oldState.searchQuery, true, true, true);
        this.onQueryChange('text', oldState.searchQuery, true, true, true);
      }
      this.setState(oldState, () => {
        if (isTextColumn && (!!oldState.sectionArray || !!oldState.sheet)) {
          Sefaria.history.saveHistoryItem(this.getHistoryObject, true);
          if (!oldState.sheet) {
            for (let sectionRef of oldState.sectionArray) {
              this.loadRelated(sectionRef);
            }
          }
          else { this.loadRelatedSheet(oldState.sheet); }
        }
      });
      return true;
    } else {
      // close app
      return false;
    }
  };

  syncHistoryBound = async () => Sefaria.history.syncHistory(this.props.dispatch, await this.getSettingsObject());
  getSettingsObject = async () => {
    let time_stamp = parseInt(await AsyncStorage.getItem('lastSettingsUpdateTime'));
    if (!time_stamp) { time_stamp = 0; }
    return ({
      email_notifications: this.props.emailFrequency,
      interface_language: this.props.interfaceLanguage,
      textual_custom: this.props.preferredCustom,
      time_stamp,
    });
  };

  onBackgroundSync = async (taskId) => {
    await this.syncHistoryBound();
    BackgroundFetch.finish(taskId);
  };

  handleOpenURL = ({ url } = {}) => {
    if (url) {
      if (this.state._completedInit) {
        this._deepLinkRouterRef.route(url);
      } else {
        // save URL. it will be applied when componentDidMount finishes
        this._initDeepLinkURL = url;
      }
    }
  };

  onDownloaderChange = (openSettings) => {
    if (openSettings) {
      this.openMenu("settings");
    }
    this.forceUpdate();
  };

  pendingIncrement = 1;

  componentDidUpdate(prevProps, prevState) {
    // Should track pageview? TODO account for infinite
    if (this.state.menuOpen          !== prevState.menuOpen          ||
        this.state.textTitle         !== prevState.textTitle         ||
        this.state.textFlow          !== prevState.textFlow          ||
        this.props.textLanguage      !== prevProps.textLanguage      || // note this var is coming from props
        this.state.textListVisible   !== prevState.textListVisible   ||
        this.state.segmentIndexRef   !== prevState.segmentIndexRef   ||
        this.state.segmentRef        !== prevState.segmentRef        ||
        this.state.linkRecentFilters !== prevState.linkRecentFilters ||
        this.props.themeStr          !== prevProps.themeStr) {
          this.trackPageview();
    }
  }

  showToast = (text, duration, onHidden) => {
    Toast.show(text, {duration, onHidden});
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

  setTextFlow = textFlow => {
    this.setState({ textFlow });
    if (textFlow == "continuous" && this.props.textLanguage == "bilingual") {
      this.setTextLanguage("hebrew");
    }
    this.toggleReaderDisplayOptionsMenu();
  };

  setBiLayout = layout => {
    this.props.dispatch({
      type: STATE_ACTIONS.setBiLayout,
      value: layout,
    });
    this.toggleReaderDisplayOptionsMenu();
  };

  setTextLanguage = (textLanguage, textFlow, dontToggle) => {
    // try to be less dependent on state in this func because it is called in componentWillUpdate
    textFlow = textFlow || this.state.textFlow;
    console.log("SET TEXT LANG", textLanguage, textFlow, dontToggle);
    this.props.dispatch({
      type: STATE_ACTIONS.setTextLanguage,
      value: textLanguage,
    });
    this.setCurrVersions(); // update curr versions based on language
    if (textLanguage == "bilingual" && textFlow == "continuous") {
      this.setTextFlow("segmented");
    }
    if (!dontToggle) { this.toggleReaderDisplayOptionsMenu(); }
  };

  setTheme = themeStr => {
    this.props.dispatch({
      type: STATE_ACTIONS.setTheme,
      value: themeStr,
    });
    this.toggleReaderDisplayOptionsMenu();
  }

  setAliyot = show => {
    this.props.dispatch({
      type: STATE_ACTIONS.setAliyot,
      value: show,
    })
    this.toggleReaderDisplayOptionsMenu();
  }

  _baseFontScale = new Animated.Value(1);
  _pinchFontScale = new Animated.Value(1);
  _fontScale = Animated.multiply(this._baseFontScale, this._pinchFontScale);
  _lastFontScale = 1;

  _onPinchGestureEvent = event => {
    let newFontSize = this.props.fontSize * (event.nativeEvent.scale*0.9) * this._lastFontScale;
    newFontSize = newFontSize > 60 ? 60 : newFontSize; // Max size
    newFontSize = newFontSize < 18 ? 18 : newFontSize; // Min size
    if (!this.incrementTimer) {
      this.pendingIncrement = newFontSize/this.props.fontSize/this._lastFontScale;
      //const numSegments = this.state.data.reduce((prevVal, elem) => prevVal + elem.length, 0);
      //const timeout = Math.min(50 + Math.floor(numSegments/50)*25, 200); // range of timeout is [50,200] or in FPS [20,5]
      this.incrementTimer = setTimeout(() => {
        this._pinchFontScale.setValue(this.pendingIncrement);
        this.incrementTimer = null;
      }, 10);
    }
  };

  _onPinchHandlerStateChange = event => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      this._lastFontScale *= (event.nativeEvent.scale*0.9);
      let newFontSize = this.props.fontSize * this._lastFontScale;
      newFontSize = newFontSize > 60 ? 30 : newFontSize; // Max size
      newFontSize = newFontSize < 18 ? 18 : newFontSize; // Min size
      newFontSize = parseFloat(newFontSize.toFixed(2));
      this.props.dispatch({
        type: STATE_ACTIONS.setFontSize,
        value: newFontSize,
      });
      this._lastFontScale = newFontSize/this.props.fontSize;
      this._baseFontScale.setValue(newFontSize/this.props.fontSize);
      this._pinchFontScale.setValue(1);
    }
  };

  _shouldPinchHandlerCapture = event => {
    return event.nativeEvent.touches.length === 2;
  };

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
    this.props.dispatch({
      type: STATE_ACTIONS.setFontSize,
      value: newFontSize,
    });
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
    let contLang  = this.props.textLanguage;
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
  getHistoryObject = () => {
    // get ref to send to /api/profile/user_history
    try {
      const {
        sheet,
        activeSheetNode,
        segmentRef,
        heSegmentRef,
        sectionIndexRef,
        sectionArray,
        sectionHeArray,
        selectedVersions,
        textListVisible,
      } = this.state;
      const { textLanguage } = this.props;
      let ref, he_ref, sheet_owner, sheet_title;
      if (!!sheet) {
        ref = `Sheet ${sheet.id}${activeSheetNode && textListVisible ? `:${activeSheetNode}`: ''}`;
        sheet_owner = sheet.ownerName;
        sheet_title = sheet.title;
      } else {
        ref = (textListVisible && segmentRef) ? segmentRef : sectionArray[sectionIndexRef];
        he_ref = (textListVisible && segmentRef) ? (heSegmentRef || Sefaria.toHeSegmentRef(sectionHeArray[sectionIndexRef], segmentRef)) : sectionHeArray[sectionIndexRef];
      }
      if (!ref) {
        crashlytics().recordError(new Error(`Ref is null. textListVisible: '${String(textListVisible)}'. segmentRef: '${String(segmentRef)}. sectionArray: '${String(sectionArray)}'. sectionIndexRef: '${String(sectionIndexRef)}'`));
      }
      const versions = this.removeDefaultVersions(ref, selectedVersions);
      return {
        ref,
        he_ref,
        versions,
        book: Sefaria.textTitleForRef(ref),
        language: textLanguage,
        sheet_owner,
        sheet_title,
        is_sheet: !!sheet,
      };
    } catch (e) {
      return {};
    }
  };

  textSegmentPressed = (section, segment, segmentRef, shouldToggle, onlyOpen) => {
      const isSheet = !!this.state.sheet;
      if (shouldToggle && this.state.textListVisible) {
          if (!onlyOpen) {
            this.animateTextList(this.state.textListFlex, 0.0001, 200);
            BackManager.back({ type: "secondary" });
          }
          return; // Don't bother with other changes if we are simply closing the TextList
      }
      if ((isSheet && !this.state.sheet) || (!isSheet && (!this.state.data || !this.state.data[section] || !this.state.data[section][segment]))) {
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
      if (isSheet) {
        // sometimes the quoted segment ref is the data we care about (e.g. for lexicon lookup)
        stateObj.segmentRefOnSheet = this.state.data[section][segment].sourceRef;
      }
      if (shouldToggle) {
        BackManager.forward({ state: {textListVisible: this.state.textListVisible}, type: "secondary" });
        stateObj.textListVisible = !this.state.textListVisible;
        stateObj.offsetRef = null; //offsetRef is used to highlight. once you open textlist, you should remove the highlight
        this.setState(stateObj, () => {
          // make sure textlist renders once before using layoutanimation
          nextFrame().then(() => {
            this.animateTextList(0.0001, this.state.textListFlexPreference, 200);
          });
          Sefaria.history.saveHistoryItem(this.getHistoryObject, true);
        });
      } else {
        this.setState(stateObj, () => {
          Sefaria.history.saveHistoryItem(this.getHistoryObject, true);
        });
      }
      this.forceUpdate();
  };
  /*
    isLoadingVersion - true when you are replacing an already loaded text with a specific version
    overwriteVersions - false when you want to switch versions but not overwrite sticky version (e.g. search)
  */
  loadNewText = ({ ref, versions, isLoadingVersion = false, overwriteVersions = true, numTries = 0 }) => {
    if (!this.state.hasInternet) {
      overwriteVersions = false;
      versions = undefined; // change to default version in case they have offline library they'll still be able to read
    }
    this.props.dispatch({
      type: STATE_ACTIONS.setOverwriteVersions,
      value: overwriteVersions,
    });
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
          sectionIndexRef: 0,
          selectedVersions: versions,
          currVersions: {en: null, he: null},
          textToc: null,
      },
      () => {
        Sefaria.data(ref, true, versions).then(data => {
            // debugger;
            if (Sefaria.util.objectHasNonNullValues(data.nonExistantVersions) ||
                // if specific versions were requested, but no content exists for those versions, try again with default versions
                (data.content.length === 0 && !!versions)) {
              if (numTries >= 4) { throw "Return to Nav"; }
              this.loadNewText({ ref, isLoadingVersion, overwriteVersions, numTries: numTries + 1 }).then(resolve);
              return;
            }
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
                dictLookup:        null,
              };
              Sefaria.links.reset();
            }
            this.setState(nextState, ()=>{
              this.loadSecondaryData(data.sectionRef);

              // Preload Text TOC data into memory
              this.loadTextTocData(data.indexTitle, data.sectionRef).then(() => {
                // dependent on nextState and currVersions
                Sefaria.history.saveHistoryItem(this.getHistoryObject);
              });
            });


            resolve();
        }).catch(error => {
          console.log(error);
          if (error == "Return to Nav") {
            this.openNav();
            resolve();
            return;
          }
          console.error('Error caught from ReaderApp.loadNewText', error);
          reject();
        });
      });
    });
  };

  loadTextTocData = (title, sectionRef) => {
    return new Promise((resolve, reject) => {
      this.setState({textToc: null}, () => {
        Sefaria.textToc(title).then(textToc => {
          this.setState({textToc}, () => {
            // at this point, both book and section level version info is available
            this.setCurrVersions(sectionRef, title).then(resolve); // not positive if this will combine versions well
          });
        });
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
      if (!!versionObject && !versionObject.default) {
        newVersions[lang] = versionTitle;
      } // else you're switching to a default version. dont list this in `versions` so that it can be loaded offline (assuming you have it downloaded)
    }
    return newVersions;
  };

  setCurrVersions = (sectionRef, title) => {
    return new Promise((resolve, reject) => {
      let enVInfo = !sectionRef ? this.state.currVersions.en : Sefaria.versionInfo(sectionRef, title, 'english');
      let heVInfo = !sectionRef ? this.state.currVersions.he : Sefaria.versionInfo(sectionRef, title, 'hebrew');
      if (enVInfo) { enVInfo.disabled = this.props.textLanguage ===  'hebrew'; } // not currently viewing this version
      if (heVInfo) { heVInfo.disabled = this.props.textLanguage === 'english'; }
      this.setState({ currVersions: { en: enVInfo, he: heVInfo } }, resolve);
    });
  };

  loadSecondaryData = (ref) => {
    //loads secondary data every time a section is loaded
    //this data is not required for initial renderring of the section
    this.loadRelated(ref);
    this.loadVersions(ref);
  };

  loadRelated = async (ref, isSheet) => {
    let hadSuccess = false;
    for (let isOnline of [false, true]) {
      try {
        await this._loadRelatedOnlineAndOffline(ref, isSheet, isOnline);
        hadSuccess = true;
      } catch (error) {}
    }
    if (!hadSuccess) {
      // make sure links get marked as loaded no matter what
      const iSec = isSheet ? 0 : this.state.sectionArray.findIndex(secRef=>secRef===ref);
      let tempLinksLoaded = this.state.linksLoaded.slice(0);
      tempLinksLoaded[iSec] = true;
      this.setState({linksLoaded: tempLinksLoaded});
    }
  };

  loadRelatedSheet = (sheet) => {
    const sourceRefs = sheet.sources.filter(source => 'ref' in source).map(source => source.ref);
    Sefaria.util.procedural_promise_on_array(sourceRefs, async (ref, isSheet) => {
      if (!this.state.sheet || this.state.sheet.id !== sheet.id || !!this.state.menuOpen) {
        // stop loading related API for this sheet since it's no longer being viewed
        throw Sefaria.util.PROCEDURAL_PROMISE_INTERRUPT;
      }
      await this.loadRelated(ref, isSheet);
    }, [true]);
  };

  _loadRelatedOnlineAndOffline = (ref, isSheet, online=true) => {
    // isSheet is true when loading links for individual refs on a sheet
    // Ensures that links have been loaded for `ref` and stores result in `this.state.linksLoaded` array.
    // Links are not loaded yet in case you're in API mode, or you are reading a non-default version
    const iSec = isSheet ? 0 : this.state.sectionArray.findIndex(secRef=>secRef===ref);
    if (!iSec && iSec !== 0) { console.log("could not find section ref in sectionArray", ref); return; }
    return Sefaria.links.loadRelated(ref, online)
      .then(response => {
        //add the related data into the appropriate section and reload
        if (isSheet) {
          this.state.data[iSec] = Sefaria.links.addRelatedToSheet(this.state.data[iSec], response, ref);
        } else {
          this.state.data[iSec] = Sefaria.links.addRelatedToText(this.state.data[iSec], response);
        }
        Sefaria.cacheCommentatorListBySection(ref, this.state.data[iSec]);
        if (this.state.segmentIndexRef != -1 && this.state.sectionIndexRef != -1) {
          this.updateLinkSummary(this.state.sectionIndexRef, this.state.segmentIndexRef);
        }

        // only reset pointer for linksLoaded if it changes
        const tempLinksLoaded = this.state.linksLoaded.slice(0);
        tempLinksLoaded[iSec] = true;
        let newLinksLoaded = this.state.linksLoaded;
        for (let iSec = 0; iSec < tempLinksLoaded.length; iSec++) {
          if (tempLinksLoaded[iSec] !== this.state.linksLoaded[iSec]) {
            newLinksLoaded = tempLinksLoaded;
          }
        }
        this.setState({data: this.state.data, linksLoaded: newLinksLoaded});
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
      } else if (direction == "prev" && this.state.prev) {
          this.updateDataPrev();
      }
  };

  updateDataPrev = () => {
      this.setState({loadingTextHead: true});
      Sefaria.data(this.state.prev, true, this.state.selectedVersions).then(function(data) {

        var updatedData = [data.content].concat(this.state.data);
        this.state.sectionArray.unshift(data.sectionRef);
        this.state.sectionHeArray.unshift(data.heRef);
        this.state.linksLoaded.unshift(false);

        this.setState({
          data: updatedData,
          prev: data.prev,
          next: this.state.next,
          sectionArray: this.state.sectionArray,
          sectionHeArray: this.state.sectionHeArray,
          linksLoaded: this.state.linksLoaded,
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
        this.state.sectionArray.push(data.sectionRef);;
        this.state.sectionHeArray.push(data.heRef);;
        this.state.linksLoaded.push(false);;

        this.setState({
          data: updatedData,
          prev: this.state.prev,
          next: data.next,
          sectionArray: this.state.sectionArray,
          sectionHeArray: this.state.sectionHeArray,
          linksLoaded: this.state.linksLoaded,
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

  updateTitle = (ref, heRef, sectionIndexRef) => {
      //console.log("updateTitle");
      this.setState({
        textReference: ref,
        heRef,
        sectionIndexRef,
      }, () => {
        if (!this.state.textListVisible) {
          // otherwise saveHistoryItem is called in textListPressed
          Sefaria.history.saveHistoryItem(this.getHistoryObject, true);
        }
      });
  };

  openRefSearch = ref => {
    this.openRef(ref, "search");
  };

  openRefTOC = (ref, enableAliyot) => {
    this.openRef(ref, "text toc", null, false, enableAliyot);
  };

  openRefSheet = (sheetID, sheetMeta, addToBackStack=true, calledFrom) => {
    if (addToBackStack) {
      BackManager.forward({ state: this.state, calledFrom });
    }
    this.setState({
        loaded: false,
        textListVisible: false,
        sheet: null,
        sheetMeta: null,
    }, () => {
        this.loadSheet(sheetID, sheetMeta,addToBackStack, calledFrom);
    });
  };

  openRefConnectionsPanel = (ref, versions, loadNewVersions=false) => {
    this.openRef(ref,"text list", versions, undefined, undefined, loadNewVersions);
  };

  updateActiveSheetNode = (node) => {
    this.setState ({
      activeSheetNode: node,
    });
  };

  transformSheetData = sheet => {
    // transforms sheet into standard jagged-array style `data` rendered in TextColumn
    const sources = sheet.sources.filter(source => "ref" in source || "comment" in source || "outsideText" in source || "outsideBiText" in source || "media" in source);
    return [sources.map((source, index) => {
      let segmentData = {links: [], he: '', text: '', segmentNumber: index+1};
      if (source.ref) {
        segmentData = {
          ...segmentData,
          he: source.text.he,
          text: source.text.en,
          sourceRef: source.ref,
          sourceHeRef: source.heRef,
          type: 'ref',
        };
      } else if (source.comment) {
        const langField = Sefaria.hebrew.isHebrew(Sefaria.util.stripHtml(source.comment)) ? "he" : "text";
        segmentData[langField] = Sefaria.util.cleanSheetHTML(source.comment);
        segmentData.type = 'comment';
      } else if (source.outsideText) {
        const langField = Sefaria.hebrew.isHebrew(Sefaria.util.stripHtml(source.outsideText)) ? "he" : "text";
        segmentData[langField] =  Sefaria.util.cleanSheetHTML(source.outsideText);
        segmentData.type = 'outsideText';
      } else if (source.outsideBiText) {
        segmentData.text = Sefaria.util.cleanSheetHTML(source.outsideBiText.en);
        segmentData.he = Sefaria.util.cleanSheetHTML(source.outsideBiText.he);
        segmentData.type = 'outsideBiText';
      } else if (source.media) {
        segmentData = {
          ...segmentData,
          he: undefined,
          text: undefined,
          url: source.media,
          type: 'media',
        };
      }
      return segmentData;
    })];
  };

  loadSheet = async (sheetID, sheetMeta) => {
    const more_data = !sheetMeta  // # if sheetMeta is null, need to request more data from api call
    const sheet = await Sefaria.api.sheets(sheetID, more_data);
    if (more_data) {
      // extract sheetMeta from result
      sheetMeta = {
        ownerName: sheet.ownerName,
        ownerImageUrl: sheet.ownerImageUrl,
        views: sheet.views,
      };
    }
    sheetMeta.title = sheet.title;
    sheetMeta.sheetID = sheet.id;
    this.setState ({
        sheet,
        sheetMeta,
        data: [],
        sectionArray: [],
        sectionHeArray: [],
        offsetRef: null,
        connectionsMode: null,
    }, () => {
      this.closeMenu(); // Don't close until these values are in state, so sheet can load
      this.setState({
        data: this.transformSheetData(sheet),
        sectionArray: [`Sheet ${sheet.id}`],
        sectionHeArray: [`דף ${sheet.id}`],
        loaded: true,
      }, () => {
        this.loadRelatedSheet(sheet);
      });
    });
  };

  textUnavailableAlert = ref => {
    Alert.alert(
      strings.textUnavailable,
      strings.promptOpenOnWebMessage,
      [
        {text: strings.cancel, style: 'cancel'},
        {text: strings.open, onPress: () => {
          this.openUri(Sefaria.refToFullUrl(ref));
        }}
      ]
    );
  };

  /*
  calledFrom parameter used for analytics and for back button
  prevScrollPos parameter used for back button
  enableAliyot - true when you click on an aliya form ReaderTextTableOfContents
  */
  openRef = (ref, calledFrom, versions, addToBackStack=true, enableAliyot=false, loadNewVersions=false) => {
    if (ref.startsWith("Sheet")){
        this.openRefSheet(ref.match(/\d+/)[0], null, addToBackStack, calledFrom) //open ref sheet expects just the sheet ID
    }

    return new Promise((resolve, reject) => {
      if (enableAliyot) {
        this.setAliyot(true);
      }
      const title = Sefaria.textTitleForRef(ref);
      const overwriteVersions = calledFrom !== 'search' || calledFrom !== 'deep link' ; // if called from search or deeplink, use version specified by search (or default if none specified)
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
        const historyItem = Sefaria.history.getHistoryRefForTitle(title);
        if (!!historyItem) { versions = historyItem.versions; }
      }

      // only consider selectedVersions when opening same book (so that you can open 2 non-default versions)
      const sameBook = title === this.state.textTitle;
      const selectedVersions = (sameBook && !!this.state.selectedVersions) ? this.state.selectedVersions : {};
      const newVersions = !!versions && {
        ...selectedVersions,
        ...versions,
      };

      // make sure loaded text will show the versions you selected
      let newTextLang = this.props.textLanguage;
      if (newTextLang !== 'bilingual' && loadNewVersions) {
        // if you're in bilingual, assume you want to stay in that
        if (!!newVersions['en'] && !!newVersions['he']) { newTextLang = "bilingual"; }
        else if (!!newVersions['en']) { newTextLang = "english"; }
        else if (!!newVersions['he']){ newTextLang = "hebrew"; }
        this.setTextLanguage(newTextLang, null, true);
      }

      switch (calledFrom) {
        case "search":
          break;
        case "navigation":
          break;
        case "text toc":
          break;
        case "deep link":
          break;
        case "text list":
          break;
        default:
          break;
      }

      if (addToBackStack) {
        if (calledFrom == 'search') {
          // only pass small state variables to forward() (eg avoid passing `results`) because cloning large variables takes too long.
          let { appliedFilters, appliedFilterAggTypes, currPage, initScrollPos } = this.state.textSearchState;
          this.state.textSearchState = new SearchState({type: 'text', appliedFilters, appliedFilterAggTypes});
          ({ appliedFilters, appliedFilterAggTypes, currPage, initScrollPos } = this.state.sheetSearchState);
          this.state.sheetSearchState = new SearchState({type: 'sheet', appliedFilters, appliedFilterAggTypes, currPage, initScrollPos});
        }
        BackManager.forward({ state: this.state, calledFrom });
      }

      this.setState({
        loaded: false,
        textListVisible: false,
        textReference: ref,
        sheet: null,
        sheetMeta: null,
        connectionsMode: null,
      }, () => {
          this.closeMenu(); // Don't close until these values are in state, so we know if we need to load defualt text
          this.loadNewText({ ref, versions: newVersions, overwriteVersions }).then(resolve);
      });
    })
  };

  openMenu = (menu) => {
    // set of `menuOpen` states which you shouldn't be able to go back to
    const SKIP_MENUS = { autocomplete: true, register: true, login: true };
    if (!SKIP_MENUS[this.state.menuOpen] && !!menu) {
      if (!this.state.menu && !!this.state.data) {
        // text column. remove related data
        for (let section of this.state.data) {
          for (let segment of section) {
            segment.links = [];
            segment.relatedWOLinks = undefined;
          }
        }
      }
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
      if (!this.state.textReference && !this.state.sheet) {
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
        connectionsMode: null,
        dictLookup: null,
      });
      this.openMenu("navigation");
  };

  openUri = uri => {
    uri = encodeURI(uri);
    InAppBrowser.open(uri, {
      android: {
        toolbarColor: Sefaria.palette.system,
        showTitle: true,
        addDefaultShareMenu: true,
      },
      ios: {
        preferredBarTintColor: Sefaria.palette.system,
        preferredControlTintColor: Sefaria.palette.system,
      }
    }).catch(error => { this.openInDefaultBrowser(uri); })
  };

  openUriOrRef = uri => {
    const internal = (uri.length > 0 && uri[0] === '/') || (uri.indexOf('sefaria.org/') > -1);
    internal ? this.openRef(Sefaria.urlToRef(uri.replace('/', '')).ref) : this.openUri(uri);
  }

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
    this.setState({
      textTitle: title,
      textReference: '',
      heRef: '',
    }, () => {  // openTextToc assumes that title is set correctly
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
  };

  openAutocomplete = () => {
    this.openMenu("autocomplete");
  }

  openSheetTag = (tag) => {
    this.setState({sheetTag: tag});
    this.openMenu("sheetTag");
  };

  openMySheets = () => {
    this.openMenu("mySheets");
  };

  openSheetCategory = (category) => {
    this.setState({sheetCategory: category});
    this.openMenu("sheetCategory");
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
  };

  updateLinkSummary = (section, segment) => {
    const menuLanguage = Sefaria.util.get_menu_language(this.props.interfaceLanguage, this.props.textLanguage);
    Sefaria.links.linkSummary(this.state.textReference, this.state.data[section][segment].links, menuLanguage).then((data) => {
      this.setState({linkSummary: data, loadingLinks: false});
      this.updateLinkCat(null, data); // Set up `linkContents` in their initial state as an array of nulls
    }).catch(error => {
      crashlytics().recordError(new Error(`Link summary error: Message: ${error}`));
      this.setState({linkSummary: [], loadingLinks: false});
      this.updateLinkCat(null, []); // Set up `linkContents` in their initial state as an array of nulls
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
    const newLinkContents = [...this.state.linkContents];
    newLinkContents[pos] = data;
    this.setState({linkContents: newLinkContents});
  };

  removeSavedItem = async (item) => {
    Sefaria.history._hasSwipeDeleted = true;
    await AsyncStorage.setItem('hasSwipeDeleted', JSON.stringify(true));
    Sefaria.history.saveSavedItem(item, 'delete_saved');
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
    Sefaria.track.event("Search", {query_type: type, query: query});
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
        const newResultsArray = (type == "sheet" ? data.hits.hits : Sefaria.search.process_text_hits(data.hits.hits)).map(r => ({
            title: type == "sheet" ? r._source.title : r._source.ref,
            heTitle: type == "sheet" ? r._source.title : r._source.heRef,
            text: r.highlight[field].join(" ... "),
            id: r._id,
            textType: r._id.includes("[he]") ? "hebrew" : "english",
            version: r._source.version,
            metadata: type == "sheet" ? {"ownerImageUrl": r._source.owner_image, "ownerName": r._source.owner_name, "views": r._source.views, "tags": r._source.tags} : null
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

  setDictionaryLookup = ({ dictLookup }) => {
    this.setState({ dictLookup });
    this.setConnectionsMode('dictionary');
  }

  getDisplayedText = (withUrl, sectionIndex, segmentIndex, segmentRef) => {
    // need to be careful because sectionIndex and segmentIndex can be 0
    if (typeof sectionIndex == 'undefined') { sectionIndex = this.state.sectionIndexRef; }
    if (typeof segmentIndex == 'undefined') { segmentIndex = this.state.segmentIndexRef; }
    if (typeof segmentRef == 'undefined')   { segmentRef = this.state.segmentRef; }
    const {text, he} = this.state.data[sectionIndex][segmentIndex];
    const enText = Sefaria.util.removeHtml(typeof text === "string" ? text : "") || "";
    const heText = Sefaria.util.removeHtml(typeof he === "string" ? he : "") || "";
    const isHeb = this.props.textLanguage !== "english";
    const isEng = this.props.textLanguage !== "hebrew";
    const fullText = (heText && isHeb ? heText + (enText && isEng ? "\n" : "") : "") + ((enText && isEng) ? enText : "");
    if (withUrl) {
      return `${fullText}\n\n${Sefaria.refToFullUrl(segmentRef)}`;
    }
    return fullText;
  }

  reportError = () => {
    const body = encodeURIComponent(
      `${this.state.segmentRef}

      ${this.getDisplayedText(true)}

      Describe the error:`
    );
    Linking.openURL(`mailto:corrections@sefaria.org?subject=${encodeURIComponent(`Sefaria Text Correction from ${Platform.OS}`)}&body=${body}`);
  };

  shareCurrentSegment = (sectionIndex, segmentIndex, segmentRef) => {
    segmentRef = segmentRef || this.state.segmentRef;
    Share.share({
      message: this.getDisplayedText(Platform.OS === 'android', sectionIndex, segmentIndex, segmentRef),  // android for some reason doesn't share text with a url attached at the bottom
      title: segmentRef,
      url: Sefaria.refToFullUrl(segmentRef)
    });
  }

  viewOnSite = () => {
    const uri = this.state.sheet ? Sefaria.sheetIdToUrl(this.state.sheet.id) : Sefaria.refToFullUrl(this.state.segmentRef);
    this.openUri(uri);
  }

  shouldShowHamburger = () => {
    if (Platform.OS === "android") { return true; }
    else {
      // see ReaderApp.openRef()
      const calledFromDict = { "text list": true, "search": true };
      return BackManager.getStack({ type: "main" }).filter(x => calledFromDict[x.calledFrom]).length === 0;
    }
  };

  _getReaderDisplayOptionsMenuRef = ref => {
    this._readerDisplayOptionsMenuRef = ref;
  };

  _getInterruptingMessageRef = ref => {
    this._interruptingMessageRef = ref;
  };

  _getDeepLinkRouterRef = ref => {
    this._deepLinkRouterRef = ref;
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
          Sefaria.track.setScreen("toc", "navigation")
        return (
          loading ?
          <LoadingView /> :
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
              openSettings={this.openMenu.bind(null, "settings")}
              openHistory={this.openMenu.bind(null, "history")}
              openSaved={this.openMenu.bind(null, "saved")}
              openLogin={this.openMenu.bind(null, "login")}
              openRegister={this.openMenu.bind(null, "register")}
              openSheets={this.openMenu.bind(null, "sheets")}
              openDedication={this.openMenu.bind(null, "dedication")}

              onChangeSearchQuery={this.onChangeSearchQuery}
              openUri={this.openUri}
              searchType={this.state.searchType}
              logout={this.logout}
            />
          </View>)
        );
      case ("text toc"):
        Sefaria.track.setScreen("text toc", "menu")
        return (
          <ReaderTextTableOfContents
            textUnavailableAlert={this.textUnavailableAlert}
            textToc={this.state.textToc}
            title={this.state.textTitle}
            currentRef={this.state.textReference}
            currentHeRef={this.state.heRef}
            close={this.manageBackMain}
            openRef={this.openRefTOC}
            openUri={this.openUri}/>);
        break;
      case ("sheet meta"):
        Sefaria.track.setScreen("sheet meta", "menu")
        return (
          <SheetMetadata
            sheet={this.state.sheet}
            sheetMeta={this.state.sheetMeta}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            textLanguage={this.props.textLanguage}
            interfaceLanguage={this.props.interfaceLanguage}
            close={this.manageBackMain}
            openSheetTagMenu={this.openSheetTag}
          />);
        break;
      case ("search"):
        Sefaria.track.setScreen("search results", "search")
        return(
          <SearchPage
            subMenuOpen={this.state.subMenuOpen}
            openSubMenu={this.openSubMenu}
            hasInternet={this.state.hasInternet}
            onBack={this.manageBackMain}
            search={this.onQueryChange}
            openRef={this.openRefSearch}
            setLoadTail={this.setLoadQueryTail}
            setIsNewSearch={this.setIsNewSearch}
            setSearchTypeState={this.setSearchTypeState}
            setSearchOptions={this.setSearchOptions}
            query={this.state.searchQuery}
            searchState={this._getSearchState(this.state.searchType)}
            searchType={this.state.searchType}
            sheetSearchState={this._getSearchState('sheet')}
            textSearchState={this._getSearchState('text')}
            toggleFilter={this.toggleSearchFilter}
            isNewSearch={this.state.isNewSearch}
            setInitSearchScrollPos={this.setInitSearchScrollPos}
            clearAllFilters={this.clearAllSearchFilters}
            openAutocomplete={this.openAutocomplete}
            onChangeSearchQuery={this.onChangeSearchQuery}
          />);
        break;
      case ("autocomplete"):
        Sefaria.track.setScreen("autocomplete", "search")
        return (
          <AutocompletePage
            interfaceLanguage={this.props.interfaceLanguage}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            onBack={this.manageBackMain}
            openSearch={this.openSearch}
            setIsNewSearch={this.setIsNewSearch}
            onChange={this.onChangeSearchQuery}
            query={this.state.searchQuery}
            openRef={this.openRef}
            openTextTocDirectly={this.openTextTocDirectly}
            openSheetTag={this.openSheetTag}
            setCategories={cats => { /* first need to go to nav page */ this.openNav(); this.setNavigationCategories(cats);} }
            searchType={this.state.searchType}
            openUri={this.openUri}
          />);
        break;
      case ("settings"):
        Sefaria.track.setScreen("settings", "menu")
        return(<SettingsPage close={this.manageBackMain} logout={this.logout} openUri={this.openUri} />);
      case ("history"):
        Sefaria.track.setScreen("history", "menu")
        return(
          <SwipeableCategoryList
            close={this.manageBackMain}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            openRef={this.openRef}
            textLanguage={this.props.textLanguage}
            interfaceLanguage={this.props.interfaceLanguage}
            onRemove={null}
            title={strings.history}
            menuOpen={this.state.menuOpen}
            icon={this.props.themeStr === "white" ? require('./img/clock.png') : require('./img/clock-light.png')}
            loadData={this.syncHistoryBound}
            openLogin={this.openMenu.bind(null, "login")}
            isLoggedIn={this.props.isLoggedIn}
            hasDismissedSyncModal={this.props.hasDismissedSyncModal}
            dispatch={this.props.dispatch}
          />
        );
        break;
      case ("saved"):
        Sefaria.track.setScreen("saved", "menu")
        return(
          <SwipeableCategoryList
            close={this.manageBackMain}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            openRef={this.openRef}
            textLanguage={this.props.textLanguage}
            interfaceLanguage={this.props.interfaceLanguage}
            onRemove={this.removeSavedItem}
            title={strings.saved}
            menuOpen={this.state.menuOpen}
            icon={this.props.themeStr === "white" ? require('./img/starUnfilled.png') : require('./img/starUnfilled-light.png')}
            loadData={async () => Sefaria.history.syncHistoryGetSaved(this.props.dispatch, await this.getSettingsObject())}
            openLogin={this.openMenu.bind(null, "login")}
            isLoggedIn={this.props.isLoggedIn}
            hasDismissedSyncModal={this.props.hasDismissedSyncModal}
            dispatch={this.props.dispatch}
          />
        );
        break;
      case("login"):
      case("register"):
        return(
          <AuthPage
            authMode={this.state.menuOpen}
            close={this.manageBackMain}
            showToast={this.showToast}
            openLogin={this.openMenu.bind(null, 'login')}
            openRegister={this.openMenu.bind(null, 'register')}
            openUri={this.openUri}
            syncHistory={this.syncHistoryBound}
          />
        );
        break;
      case ("sheets"):
        Sefaria.track.setScreen("sheets nav", "navigation")
        return(
           <ReaderNavigationSheetMenu
            close={this.manageBackMain}
            theme={this.props.theme}
            hasInternet={this.state.hasInternet}
            menuOpen={this.state.menuOpen}
            icon={require('./img/sheet.png')}
            interfaceLanguage={this.props.interfaceLanguage}
            openSheetTagMenu={this.openSheetTag}
            isLoggedIn={this.props.isLoggedIn}
            openMySheets={this.openMySheets}
            openLogin={this.openMenu.bind(null, 'login')}
            openSheetCategoryMenu={this.openSheetCategory}
           />
        );
        break;

      case ("sheetCategory"):
        Sefaria.track.setScreen("sheets sub category nav", "navigation")
        return(
          loading ?
          <LoadingView /> :
           <ReaderNavigationSheetCategoryMenu
            icon={require('./img/sheet.png')}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            interfaceLanguage={this.props.interfaceLanguage}
            hasInternet={this.state.hasInternet}
            category={this.state.sheetCategory}
            onBack={this.manageBackMain}
            openSheetTagMenu={this.openSheetTag}
            openRef={this.openRefSheet}
           />
        );

      case ("sheetTag"):
      case ("mySheets"):
        Sefaria.track.setScreen(this.state.menuOpen === 'sheetTage' ? "sheet tag page" : "my sheets page", "navigation")
        return(
          loading ?
          <LoadingView /> :
           <ReaderNavigationSheetList
            tag={this.state.sheetTag}
            menuOpen={this.state.menuOpen}
            onBack={this.manageBackMain}
            openRef={this.openRefSheet}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
           />
        );
        case('dedication'):
            return <Dedication
              close={this.manageBackMain}
            />
    }
    const isSheet = !!this.state.sheet;

    if (isSheet) {
        Sefaria.track.setScreen("Sheet " + this.state.sheet.id, "reader")
    }
    else {
        Sefaria.track.setScreen(this.state.textTitle, "reader")
    }
    let textColumnFlex = this.state.textListVisible ? 1.0 - this.state.textListFlex : 1.0;
    let relatedData = {};
    try {
      relatedData = this.state.data[this.state.sectionIndexRef][this.state.segmentIndexRef].relatedWOLinks || {};
    } catch(e) {}
    return (
      <PinchGestureHandler
        onGestureEvent={this._onPinchGestureEvent}
        onHandlerStateChange={this._onPinchHandlerStateChange}
      >
        <Animated.View
          style={[styles.container, this.props.theme.container]}
          onStartShouldSetResponderCapture={this._shouldPinchHandlerCapture}
        >
            <CategoryColorLine category={Sefaria.categoryForTitle(this.state.textTitle, isSheet)} />
            <ReaderControls
              enRef={this.state.textReference}
              heRef={this.state.heRef}
              categories={Sefaria.categoriesForTitle(this.state.textTitle, isSheet)}
              openNav={this.openNav}
              goBack={this.manageBackMain}
              openTextToc={this.openTextToc}
              openSheetMeta={this.openSheetMeta}
              sheet={this.state.sheet}
              shouldShowHamburger={this.shouldShowHamburger}
              toggleReaderDisplayOptionsMenu={this.toggleReaderDisplayOptionsMenu}
              openUri={this.openUri}
              getHistoryObject={this.getHistoryObject}
              showToast={this.showToast}
            />

            { loading ?
            <LoadingView style={{flex: textColumnFlex}} category={Sefaria.categoryForTitle(this.state.textTitle)}/> :
            <View style={[{flex: textColumnFlex}, styles.mainTextPanel, this.props.theme.mainTextPanel]}
                  onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}>
                <TextColumn
                  fontScale={this._fontScale}
                  interfaceLanguage={this.props.interfaceLanguage}
                  textLanguage={this.props.textLanguage}
                  showAliyot={this.props.showAliyot}
                  theme={this.props.theme}
                  themeStr={this.props.themeStr}
                  fontSize={this.props.fontSize}
                  sheetMeta={this.state.sheetMeta}
                  isSheet={isSheet}
                  biLayout={this.props.biLayout}
                  key={this.state.textColumnKey}
                  showToast={this.showToast}
                  textToc={this.state.textToc}
                  data={this.state.data}
                  textReference={this.state.textReference}
                  sectionArray={this.state.sectionArray}
                  sectionHeArray={this.state.sectionHeArray}
                  offsetRef={this.state.offsetRef}
                  segmentRef={this.state.segmentRef}
                  segmentIndexRef={this.state.segmentIndexRef}
                  textFlow={this.state.textFlow}
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
                  openUriOrRef={this.openUriOrRef}
                  textUnavailableAlert={this.textUnavailableAlert}
                  setDictionaryLookup={this.setDictionaryLookup}
                  shareCurrentSegment={this.shareCurrentSegment}
                  getDisplayedText={this.getDisplayedText}                  
                />
            </View> }

            {this.state.textListVisible ?
              <ConnectionsPanel
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                interfaceLanguage={this.props.interfaceLanguage}
                fontSize={this.props.fontSize}
                textLanguage={this.props.textLanguage}
                sheet={this.state.sheet}
                sheetMeta={this.state.sheetMeta}
                textListFlex={this.state.textListFlex}
                animating={this.state.textListAnimating}
                onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}
                textToc={this.state.textToc}
                segmentRefOnSheet={this.state.segmentRefOnSheet}
                segmentRef={this.state.segmentRef}
                heSegmentRef={Sefaria.toHeSegmentRef(this.state.heRef, this.state.segmentRef)}
                categories={Sefaria.categoriesForTitle(this.state.textTitle, isSheet)}
                textFlow={this.state.textFlow}
                openRef={this.openRefConnectionsPanel}
                openRefSheet={this.openRefSheet}
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
                relatedData={relatedData}
                onDragStart={this.onTextListDragStart}
                onDragMove={this.onTextListDragMove}
                onDragEnd={this.onTextListDragEnd}
                textTitle={this.state.textTitle}
                openUri={this.openUri}
                openUriOrRef={this.openUriOrRef}
                dictLookup={this.state.dictLookup}
                shareCurrentSegment={this.shareCurrentSegment}
                viewOnSite={this.viewOnSite}
                reportError={this.reportError}
                openSheetTag={this.openSheetTag}
              />
               : null
            }
            {this.state.ReaderDisplayOptionsMenuVisible ?
              (<ReaderDisplayOptionsMenu
                ref={this._getReaderDisplayOptionsMenuRef}
                theme={this.props.theme}
                textFlow={this.state.textFlow}
                biLayout={this.props.biLayout}
                textReference={this.state.textReference}
                interfaceLanguage={this.props.interfaceLanguage}
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
                themeStr={this.props.themeStr}
              />) : null
            }
        </Animated.View>
      </PinchGestureHandler>
    );
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
      <View style={{flex:1}}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.container, this.props.theme.container]}>
              <StatusBar
                barStyle="light-content"
              />
            <ConditionalProgressWrapper
              conditionMethod={(state, props) => {
                return state && (props.menuOpen !== 'settings' || state.downloadNotification === 'Update');
              }}
              initialValue={DownloadTracker.getDownloadStatus()}
              downloader={DownloadTracker}
              listenerName={'ReaderAppBar'}
              menuOpen={this.state.menuOpen}
            >
              <SefariaProgressBar
                onPress={()=>{
                  this.openMenu("settings")
                }}
                onClose={() => DownloadTracker.cancelDownload()}
                download={DownloadTracker}
                identity={'ReaderApp'}
              />
            </ConditionalProgressWrapper>
              { this.renderContent() }
          </View>
        </SafeAreaView>
        <InterruptingMessage
          ref={this._getInterruptingMessageRef}
          interfaceLanguage={this.props.interfaceLanguage}
          openInDefaultBrowser={this.openInDefaultBrowser}
          debugInterruptingMessage={this.props.debugInterruptingMessage}
        />
        <DeepLinkRouter
          ref={this._getDeepLinkRouterRef}
          openNav={this.openNav}
          openMenu={this.openMenu}
          openRef={this.openRef}
          openUri={this.openUri}
          openRefSheet={this.openRefSheet}
          openSheetTag={this.openSheetTag}
          openSearch={this.openSearch}
          setSearchOptions={this.setSearchOptions}
          openTextTocDirectly={this.openTextTocDirectly}
          setTextLanguage={this.setTextLanguage}
          setNavigationCategories={this.setNavigationCategories}
        />
      </View>

    );
  }
}

export default ReaderApp;
