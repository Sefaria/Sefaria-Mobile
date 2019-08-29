import React from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import iPad from './isIPad';
import themeWhite from './ThemeWhite';
import themeBlack from './ThemeBlack';
import strings from './LocalizedStrings';

const STATE_ACTIONS = {
  setTheme: "SET_THEME",
  setDefaultTextLanguage: "SET_DEFAULT_TEXT_LANGUAGE",
  setInterfaceLanguage: "SET_INTERFACE_LANGUAGE",
  setEmailFrequency: "SET_EMAIL_FREQUENCY",
  setPreferredCustom: "SET_PREFERRED_CUSTOM",
  initTextLanguageByTitle: "INIT_TEXT_LANGUAGE_BY_TITLE",
  setTextLanguageByTitle: "SET_TEXT_LANGUAGE_BY_TITLE",
  setFontSize: "SET_FONT_SIZE",
  setOverwriteVersions: "SET_OVERWRITE_VERSIONS",
  setAliyot: "SET_ALIYOT",
  toggleDebugInterruptingMessage: "TOGGLE_DEBUG_INTERRUPTING_MESSAGE",
  setBiLayout: "SET_BI_LAYOUT",
  setIsLoggedIn: "SET_IS_LOGGED_IN",
};

const UPDATE_SETTINGS_ACTIONS = {
  [STATE_ACTIONS.setInterfaceLanguage]: true,
  [STATE_ACTIONS.setEmailFrequency]: true,
  [STATE_ACTIONS.setPreferredCustom]: true,
};

const ACTION_CREATORS = {
  setTheme: (themeStr, fromAsync) => ({
    type: STATE_ACTIONS.setTheme,
    themeStr,
    fromAsync,
  }),
  setDefaultTextLanguage: (language, fromAsync) => ({
    type: STATE_ACTIONS.setDefaultTextLanguage,
    language,
    fromAsync,
  }),
  initTextLanguageByTitle: (textLanguageByTitle) => ({
    type: STATE_ACTIONS.initTextLanguageByTitle,
    textLanguageByTitle,
  }),
  setTextLanguageByTitle: (title, language) => ({
    type: STATE_ACTIONS.setTextLanguageByTitle,
    title,
    language,
  }),
  setInterfaceLanguage: (language, fromAsync) => ({
    type: STATE_ACTIONS.setInterfaceLanguage,
    language,
    fromAsync,
  }),
  setEmailFrequency: (freq, fromAsync) => ({
    type: STATE_ACTIONS.setEmailFrequency,
    freq,
    fromAsync,
  }),
  setPreferredCustom: (custom, fromAsync) => ({
    type: STATE_ACTIONS.setPreferredCustom,
    custom,
    fromAsync,
  }),
  setFontSize: (fontSize, fromAsync) => ({
    type: STATE_ACTIONS.setFontSize,
    fontSize,
    fromAsync,
  }),
  setOverwriteVersions: overwrite => ({
    type: STATE_ACTIONS.setOverwriteVersions,
    overwrite,
  }),
  setAliyot: show => ({
    type: STATE_ACTIONS.setAliyot,
    show,
  }),
  toggleDebugInterruptingMessage: (debug, fromAsync) => ({
    type: STATE_ACTIONS.toggleDebugInterruptingMessage,
    debug,
    fromAsync,
  }),
  setBiLayout: (layout, fromAsync) => ({
    type: STATE_ACTIONS.setBiLayout,
    layout,
    fromAsync,
  }),
  setIsLoggedIn: isLoggedIn => ({
    type: STATE_ACTIONS.setIsLoggedIn,
    isLoggedIn,
  }),
}

const ASYNC_STORAGE_DEFAULTS = {
  defaultTextLanguage: {
    default: strings.getInterfaceLanguage().match(/^(?:he|iw)/) ? "hebrew" : "bilingual",
    action: ACTION_CREATORS.setDefaultTextLanguage,
  },
  textLangaugeByTitle: { /* misspelled on purpose because this is the way the field is called in AsyncStorage */
    default: {},
    action: ACTION_CREATORS.initTextLanguageByTitle,
  },
  interfaceLanguage: {
    default: strings.getInterfaceLanguage().match(/^(?:he|iw)/) ? "hebrew" : "english",
    action: ACTION_CREATORS.setInterfaceLanguage,
  },
  emailFrequency: {
    default: 'daily',
    action: ACTION_CREATORS.setEmailFrequency,
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
};

const DEFAULT_STATE = {
  theme: themeWhite,
  themeStr: ASYNC_STORAGE_DEFAULTS.color.default,
  textLanguage: ASYNC_STORAGE_DEFAULTS.defaultTextLanguage.default,
  interfaceLanguage: ASYNC_STORAGE_DEFAULTS.interfaceLanguage.default,
  emailFrequency: ASYNC_STORAGE_DEFAULTS.emailFrequency.default,
  preferredCustom: ASYNC_STORAGE_DEFAULTS.preferredCustom.default,
  fontSize: ASYNC_STORAGE_DEFAULTS.fontSize.default,
  overwriteVersions: true,
  showAliyot: ASYNC_STORAGE_DEFAULTS.showAliyot.default,
  debugInterruptingMessage: ASYNC_STORAGE_DEFAULTS.debugInterruptingMessage.default,
  biLayout: ASYNC_STORAGE_DEFAULTS.biLayout.default,
  isLoggedIn: ASYNC_STORAGE_DEFAULTS.auth.default,
};

const saveFieldToAsync = function (field, value) {
  AsyncStorage.setItem(field, JSON.stringify(value));
};

const reducer = function (state, action) {
  if (UPDATE_SETTINGS_ACTIONS[action.type] && !action.fromAsync) {
    AsyncStorage.setItem('lastSettingsUpdateTime', JSON.stringify(action.time));
  }
  switch (action.type) {
    case STATE_ACTIONS.setTheme:
      const theme = action.themeStr === "white" ? themeWhite : themeBlack;
      //no need to save value in async if that's where it is coming from
      if (!action.fromAsync) { saveFieldToAsync('color', action.themeStr); }
      return {
        ...state,
        theme,
        themeStr: action.themeStr,
      };
    case STATE_ACTIONS.setDefaultTextLanguage:
      if (!action.fromAsync) { saveFieldToAsync('defaultTextLanguage', action.language); }
      return {
        ...state,
        defaultTextLanguage: action.language,
      };
    case STATE_ACTIONS.initTextLanguageByTitle:
      return {
        ...state,
        textLanguageByTitle: action.textLanguageByTitle,
      }
    case STATE_ACTIONS.setTextLanguageByTitle:
      const newState = {
        ...state,
        textLanguageByTitle: {
          ...state.textLanguageByTitle,
          [action.title]: action.language,
        },
        textLanguage: action.language, // also set the language for the current book
      };
      saveFieldToAsync('textLangaugeByTitle', newState.textLanguageByTitle);
      return newState;
    case STATE_ACTIONS.setInterfaceLanguage:
      const { language } = action;
      if (!action.fromAsync) { saveFieldToAsync('interfaceLanguage', language); }
      if (language == 'hebrew') { strings.setLanguage('he'); }
      else if (language == 'english') { strings.setLanguage('en'); }
      return {
        ...state,
        interfaceLanguage: action.language,
      }
    case STATE_ACTIONS.setEmailFrequency:
      if (!action.fromAsync) { saveFieldToAsync('emailFrequency', action.freq); }
      return {
        ...state,
        emailFrequency: action.freq,
      }
    case STATE_ACTIONS.setPreferredCustom:
      if (!action.fromAsync) { saveFieldToAsync('preferredCustom', action.custom); }
      return {
        ...state,
        preferredCustom: action.custom,
      }
    case STATE_ACTIONS.setFontSize:
      if (!action.fromAsync) { saveFieldToAsync('fontSize', action.fontSize); }
      return {
        ...state,
        fontSize: action.fontSize,
      }
    case STATE_ACTIONS.setOverwriteVersions:
      return {
        ...state,
        overwriteVersions: action.overwrite,
      }
    case STATE_ACTIONS.setAliyot:
      if (!action.fromAsync) { saveFieldToAsync('showAliyot', action.show); }
      return {
        ...state,
        showAliyot: action.show,
      }
    case STATE_ACTIONS.toggleDebugInterruptingMessage:
      // toggle if you didn't pass in debug, otherwise you're initializing the value
      const newDebug = action.debug === undefined ? (!state.debugInterruptingMessage) : action.debug;
      if (!action.fromAsync) { saveFieldToAsync('debugInterruptingMessage', newDebug); }
      return {
        ...state,
        debugInterruptingMessage: newDebug,
      }
    case STATE_ACTIONS.setBiLayout:
      if (!action.fromAsync) { saveFieldToAsync('biLayout', action.layout); }
      return {
        ...state,
        biLayout: action.layout,
      }
    case STATE_ACTIONS.setIsLoggedIn:
      // action can be passed either object or bool
      const isLoggedIn = !!action.isLoggedIn;
      console.log("redux isLoggedIn", isLoggedIn);
      return {
        ...state,
        isLoggedIn,
      }
    default:
      return state;
  }
};

const initAsyncStorage = dispatch => {
  // Loads data from each field in `_data` stored in Async storage into local memory for sync access.
  // Returns a Promise that resolves when all fields are loaded.
  var promises = [];
  let asyncData = {};
  for (field in ASYNC_STORAGE_DEFAULTS) {
    if (ASYNC_STORAGE_DEFAULTS.hasOwnProperty(field)) {
      const loader = function (field, value) {
        const actionValue = value ? JSON.parse(value) : ASYNC_STORAGE_DEFAULTS[field].default;
        if (field === 'interfaceLanguage') {
          console.log('int', value, actionValue);
          return;
        }
        if (field === 'defaultTextLanguage') {
          console.log('def', value, actionValue);
        }
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

export {
  DEFAULT_STATE,
  STATE_ACTIONS,
  reducer,
  initAsyncStorage,
  GlobalStateContext,
  DispatchContext,
};
