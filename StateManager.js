'use strict';

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import iPad from './isIPad';
import themeWhite from './ThemeWhite';
import themeBlack from './ThemeBlack';
import strings from './LocalizedStrings';

const STATE_ACTIONS = {
  setTheme: "SET_THEME",
  setTextLanguage: "SET_TEXT_LANGUAGE",
  setInterfaceLanguage: "SET_INTERFACE_LANGUAGE",
  setEmailFrequency: "SET_EMAIL_FREQUENCY",
  setPreferredCustom: "SET_PREFERRED_CUSTOM",
  setFontSize: "SET_FONT_SIZE",
  setAliyot: "SET_ALIYOT",
  setVocalization: "SET_VOCALIZATION",
  toggleDebugInterruptingMessage: "TOGGLE_DEBUG_INTERRUPTING_MESSAGE",
  setBiLayout: "SET_BI_LAYOUT",
  setIsLoggedIn: "SET_IS_LOGGED_IN",
  setUserEmail: "SET_USER_EMAIL",
  setHasDismissedSyncModal: "SET_HAS_DISMISSED_SYNC_MODAL",
  setDownloadNetworkSetting: "SET_DOWNLOAD_NETWORK_MODE",
  setReadingHistory: "SET_READING_HISTORY",
  setGroggerActive: "SET_GROGGER_ACTIVE",
};

const UPDATE_SETTINGS_ACTIONS = {
  [STATE_ACTIONS.setInterfaceLanguage]: true,
  [STATE_ACTIONS.setEmailFrequency]: true,
  [STATE_ACTIONS.setPreferredCustom]: true,
  [STATE_ACTIONS.setReadingHistory]: true,
};

const ACTION_CREATORS = {
  setTheme: (themeStr, fromAsync) => ({
    type: STATE_ACTIONS.setTheme,
    value: themeStr,
    fromAsync,
  }),
  setTextLanguage: (language, fromAsync) => ({
    type: STATE_ACTIONS.setTextLanguage,
    value: language,
    fromAsync,
  }),
  setInterfaceLanguage: (language, fromAsync) => ({
    type: STATE_ACTIONS.setInterfaceLanguage,
    value: language,
    fromAsync,
  }),
  setEmailFrequency: (freq, fromAsync) => ({
    type: STATE_ACTIONS.setEmailFrequency,
    value: freq,
    fromAsync,
  }),
  setReadingHistory: (isReadingHistory, fromAsync) => ({
    type: STATE_ACTIONS.setReadingHistory,
    value: isReadingHistory,
    fromAsync,
  }),
  setPreferredCustom: (custom, fromAsync) => ({
    type: STATE_ACTIONS.setPreferredCustom,
    value: custom,
    fromAsync,
  }),
  setFontSize: (fontSize, fromAsync) => ({
    type: STATE_ACTIONS.setFontSize,
    value: fontSize,
    fromAsync,
  }),
  setAliyot: show => ({
    type: STATE_ACTIONS.setAliyot,
    value: show,
  }),
  setVocalization: value => ({
    type: STATE_ACTIONS.setVocalization,
    value,
  }),
  toggleDebugInterruptingMessage: (debug, fromAsync) => ({
    type: STATE_ACTIONS.toggleDebugInterruptingMessage,
    value: debug,
    fromAsync,
  }),
  setBiLayout: (layout, fromAsync) => ({
    type: STATE_ACTIONS.setBiLayout,
    value: layout,
    fromAsync,
  }),
  setIsLoggedIn: isLoggedIn => ({
    type: STATE_ACTIONS.setIsLoggedIn,
    value: isLoggedIn,
  }),
  setUserEmail: (email, fromAsync) => ({
    type: STATE_ACTIONS.setUserEmail,
    value: email,
    fromAsync,
  }),
  setHasDismissedSyncModal: (hasDismissed, fromAsync) => ({
    type: STATE_ACTIONS.setHasDismissedSyncModal,
    value: hasDismissed,
  }),
  setDownloadNetworkSetting: (networkMode, fromAsync) => ({
    type: STATE_ACTIONS.setDownloadNetworkSetting,
    value: networkMode,
    fromAsync,
  }),
  setGroggerActive: (isActive, fromAsync) => ({
    type: STATE_ACTIONS.setGroggerActive,
    value: isActive,
    fromAsync,
  }),
}

const ASYNC_STORAGE_DEFAULTS = {
  textLanguage: {
    default: strings.getInterfaceLanguage().match(/^(?:he|iw)/) ? "hebrew" : "bilingual",
    action: ACTION_CREATORS.setTextLanguage,
  },
  interfaceLanguage: {
    default: strings.getInterfaceLanguage().match(/^(?:he|iw)/) ? "hebrew" : "english",
    action: ACTION_CREATORS.setInterfaceLanguage,
  },
  emailFrequency: {
    default: 'daily',
    action: ACTION_CREATORS.setEmailFrequency,
  },
  readingHistory: {
    default: true,
    action: ACTION_CREATORS.setReadingHistory,
  },
  preferredCustom: {
    default: 'sephardi',
    action: ACTION_CREATORS.setPreferredCustom,
  },
  fontSize: {
    default: iPad ? 25 : 20,
    action: ACTION_CREATORS.setFontSize,
  },
  color: {
    default: "white",
    action: ACTION_CREATORS.setTheme,
  },
  showAliyot: {
    default: false,
    action: ACTION_CREATORS.setAliyot,
  },
  vocalization: {
    default: 0,
    action: ACTION_CREATORS.setVocalization,
  },
  debugInterruptingMessage: {
    default: false,
    action: ACTION_CREATORS.toggleDebugInterruptingMessage,
  },
  biLayout: {
    default: 'stacked',
    action: ACTION_CREATORS.setBiLayout,
  },
  auth: {
    default: false,
    action: ACTION_CREATORS.setIsLoggedIn,
  },
  userEmail: {
    default: "",
    action: ACTION_CREATORS.setUserEmail,
  },
  hasDismissedSyncModal: {
    default: false,
    action: ACTION_CREATORS.setHasDismissedSyncModal,
  },
  downloadNetworkSetting: {
    default: 'wifiOnly',
    action: ACTION_CREATORS.setDownloadNetworkSetting
  },
  groggerActive: {
    default: 'on',
    action: ACTION_CREATORS.setGroggerActive,
  },
};

const DEFAULT_STATE = {
  //theme: themeWhite,
  themeStr: ASYNC_STORAGE_DEFAULTS.color.default,
  textLanguage: ASYNC_STORAGE_DEFAULTS.textLanguage.default,
  interfaceLanguage: ASYNC_STORAGE_DEFAULTS.interfaceLanguage.default,
  emailFrequency: ASYNC_STORAGE_DEFAULTS.emailFrequency.default,
  readingHistory: ASYNC_STORAGE_DEFAULTS.readingHistory.default,
  preferredCustom: ASYNC_STORAGE_DEFAULTS.preferredCustom.default,
  fontSize: ASYNC_STORAGE_DEFAULTS.fontSize.default,
  showAliyot: ASYNC_STORAGE_DEFAULTS.showAliyot.default,
  vocalization: ASYNC_STORAGE_DEFAULTS.vocalization.default,
  debugInterruptingMessage: ASYNC_STORAGE_DEFAULTS.debugInterruptingMessage.default,
  biLayout: ASYNC_STORAGE_DEFAULTS.biLayout.default,
  isLoggedIn: ASYNC_STORAGE_DEFAULTS.auth.default,
  userEmail: ASYNC_STORAGE_DEFAULTS.userEmail.default,
  hasDismissedSyncModal: ASYNC_STORAGE_DEFAULTS.hasDismissedSyncModal.default,
  downloadNetworkSetting: ASYNC_STORAGE_DEFAULTS.downloadNetworkSetting.default,
  groggerActive: ASYNC_STORAGE_DEFAULTS.groggerActive.default,
};

const saveFieldToAsync = function (field, value) {
  AsyncStorage.setItem(field, JSON.stringify(value));
};

// Used as a duplicate of the state so the analytics can access them.
let currentGlobalState = DEFAULT_STATE;

const reducer = function (state, action) {
  if (UPDATE_SETTINGS_ACTIONS[action.type] && !action.fromAsync) {
    AsyncStorage.setItem('lastSettingsUpdateTime', JSON.stringify(action.time));
  }
  let newState;
  switch (action.type) {
    case STATE_ACTIONS.setTheme:
      //const theme = action.value === "white" ? themeWhite : themeBlack;
      //no need to save value in async if that's where it is coming from
      if (!action.fromAsync) { saveFieldToAsync('color', action.value); }
      newState = {
        ...state,
        //theme,
        themeStr: action.value,
      };
      break;
    case STATE_ACTIONS.setTextLanguage:
      if (!action.fromAsync) { saveFieldToAsync('textLanguage', action.value); }
      newState = {
        ...state,
        textLanguage: action.value,
      };
      break;
    case STATE_ACTIONS.setInterfaceLanguage:
      if (!action.fromAsync) { saveFieldToAsync('interfaceLanguage', action.value); }
      if (action.value == 'hebrew') { strings.setLanguage('he'); }
      else if (action.value == 'english') { strings.setLanguage('en'); }
      newState = {
        ...state,
        interfaceLanguage: action.value,
      }
      break;
    case STATE_ACTIONS.setEmailFrequency:
      if (!action.fromAsync) { saveFieldToAsync('emailFrequency', action.value); }
      newState = {
        ...state,
        emailFrequency: action.value,
      }
      break;
    case STATE_ACTIONS.setReadingHistory:
      if (!action.fromAsync) {
        if (!action.value && state.readingHistory) { Sefaria.history.deleteHistory(false); }
        saveFieldToAsync('readingHistory', action.value);
      }
      newState = {
        ...state,
        readingHistory: action.value,
      }
      break;
    case STATE_ACTIONS.setPreferredCustom:
      if (!action.fromAsync) { saveFieldToAsync('preferredCustom', action.value); }
      newState = {
        ...state,
        preferredCustom: action.value,
      }
      break;
    case STATE_ACTIONS.setFontSize:
      if (!action.fromAsync) { saveFieldToAsync('fontSize', action.value); }
      newState = {
        ...state,
        fontSize: action.value,
      }
      break;
    case STATE_ACTIONS.setAliyot:
      if (!action.fromAsync) { saveFieldToAsync('showAliyot', action.value); }
      newState = {
        ...state,
        showAliyot: action.value,
      }
      break;
    case STATE_ACTIONS.setVocalization:
      if (!action.fromAsync) { saveFieldToAsync('vocalization', action.value); }
      newState = {
        ...state,
        vocalization: action.value,
      }  
      break;  
    case STATE_ACTIONS.toggleDebugInterruptingMessage:
      // toggle if you didn't pass in debug, otherwise you're initializing the value
      const newDebug = action.value === undefined ? (!state.debugInterruptingMessage) : action.value;
      if (!action.fromAsync) { saveFieldToAsync('debugInterruptingMessage', newDebug); }
      newState = {
        ...state,
        debugInterruptingMessage: newDebug,
      }
      break;
    case STATE_ACTIONS.setBiLayout:
      if (!action.fromAsync) { saveFieldToAsync('biLayout', action.value); }
      newState = {
        ...state,
        biLayout: action.value,
      }
      break;
    case STATE_ACTIONS.setIsLoggedIn:
      // action can be passed either object or bool
      const isLoggedIn = !!action.value;
      if (isLoggedIn && !!action.value.uid) { Sefaria._auth = action.value; }
      newState = {
        ...state,
        isLoggedIn,
      }
      break;
    case STATE_ACTIONS.setUserEmail:
      if (!action.fromAsync) { saveFieldToAsync('userEmail', action.value); }
      newState = {
        ...state,
        userEmail: action.value,
      }
      break;
    case STATE_ACTIONS.setHasDismissedSyncModal:
      if (!action.fromAsync) { saveFieldToAsync('hasDismissedSyncModal', action.value); }
      newState = {
        ...state,
        hasDismissedSyncModal: action.value,
      }
      break;
    case STATE_ACTIONS.setDownloadNetworkSetting:
      if (!action.fromAsync) { saveFieldToAsync('downloadNetworkSetting', action.value); }
      newState = {
        ...state,
        downloadNetworkSetting: action.value,
      };
      break;
    case STATE_ACTIONS.setGroggerActive:
      if (!action.fromAsync) { saveFieldToAsync('groggerActive', action.value); }
      newState = {
        ...state,
        groggerActive: action.value,
      };
      break;
    default:
      newState = state;
      break;
  }

  currentGlobalState = newState;
  return newState;
};

// Allows acess to the duplication of the state that is used by analytics
const getCurrentGlobalState = () => currentGlobalState;

const initAsyncStorage = dispatch => {
  // Loads data from each field in `_data` stored in Async storage into local memory for sync access.
  // Returns a Promise that resolves when all fields are loaded.
  var promises = [];
  let asyncData = {};
  for (let field in ASYNC_STORAGE_DEFAULTS) {
    if (ASYNC_STORAGE_DEFAULTS.hasOwnProperty(field)) {
      const loader = function (field, value) {
        const actionValue = value ? JSON.parse(value) : ASYNC_STORAGE_DEFAULTS[field].default;
        dispatch(ASYNC_STORAGE_DEFAULTS[field].action(actionValue, true));
      }.bind(null, field);
      const promise = AsyncStorage.getItem(field)
        .then(loader)
        .catch(function(error) {
          console.error("AsyncStorage failed to load setting: " + error);
        });
      promises.push(promise);
    }
  }
  return Promise.all(promises);
};

const GlobalStateContext = React.createContext(null);
const DispatchContext = React.createContext(null);
const getTheme = themeStr => (themeStr === 'white' ? themeWhite : themeBlack);

export {
  DEFAULT_STATE,
  STATE_ACTIONS,
  reducer,
  initAsyncStorage,
  GlobalStateContext,
  DispatchContext,
  getTheme,
  getCurrentGlobalState,
};
