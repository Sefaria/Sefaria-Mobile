import { combineReducers, createStore } from 'redux';
import { AsyncStorage } from 'react-native';
import iPad from './isIPad';
import themeWhite from './ThemeWhite';
import themeBlack from './ThemeBlack';
import strings from './LocalizedStrings';

const REDUX_ACTIONS = {
  setTheme: "SET_THEME",
  setDefaultTextLanguage: "SET_DEFAULT_TEXT_LANGUAGE",
  initTextLanguageByTitle: "INIT_TEXT_LANGUAGE_BY_TITLE",
  setTextLanguageByTitle: "SET_TEXT_LANGUAGE_BY_TITLE",
  setMenuLanguage: "SET_MENU_LANGUAGE",
  setFontSize: "SET_FONT_SIZE",
  setOverwriteVersions: "SET_OVERWRITE_VERSIONS",
  setAliyot: "SET_ALIYOT",
  toggleDebugInterruptingMessage: "TOGGLE_DEBUG_INTERRUPTING_MESSAGE",
};

const ACTION_CREATORS = {
  setTheme: (themeStr, fromAsync) => ({
    type: REDUX_ACTIONS.setTheme,
    themeStr,
    fromAsync,
  }),
  setDefaultTextLanguage: (language, fromAsync) => ({
    type: REDUX_ACTIONS.setDefaultTextLanguage,
    language,
    fromAsync,
  }),
  initTextLanguageByTitle: (textLanguageByTitle) => ({
    type: REDUX_ACTIONS.initTextLanguageByTitle,
    textLanguageByTitle,
  }),
  setTextLanguageByTitle: (title, language) => ({
    type: REDUX_ACTIONS.setTextLanguageByTitle,
    title,
    language,
  }),
  setMenuLanguage: (language, fromAsync) => ({
    type: REDUX_ACTIONS.setMenuLanguage,
    language,
    fromAsync,
  }),
  setFontSize: (fontSize, fromAsync) => ({
    type: REDUX_ACTIONS.setFontSize,
    fontSize,
    fromAsync,
  }),
  setOverwriteVersions: overwrite => ({
    type: REDUX_ACTIONS.setOverwriteVersions,
    overwrite,
  }),
  setAliyot: show => ({
    type: REDUX_ACTIONS.setAliyot,
    show,
  }),
  toggleDebugInterruptingMessage: (debug, fromAsync) => ({
    type: REDUX_ACTIONS.toggleDebugInterruptingMessage,
    debug,
    fromAsync,
  }),
}

const ASYNC_STORAGE_DEFAULTS = {
  defaultTextLanguage: {
    default: strings.getInterfaceLanguage().startsWith("he") ? "hebrew" : "bilingual",
    action: ACTION_CREATORS.setDefaultTextLanguage,
  },
  textLangaugeByTitle: { /* misspelled on purpose because this is the way the field is called in AsyncStorage */
    default: {},
    action: ACTION_CREATORS.initTextLanguageByTitle,
  },
  menuLanguage: {
    default: strings.getInterfaceLanguage().startsWith("he") ? "hebrew" : "english",
    action: ACTION_CREATORS.setMenuLanguage,
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
};

const DEFAULT_STATE = {
  theme: themeWhite,
  themeStr: ASYNC_STORAGE_DEFAULTS.color.default,
  textLanguage: ASYNC_STORAGE_DEFAULTS.defaultTextLanguage.default,
  menuLanguage: ASYNC_STORAGE_DEFAULTS.menuLanguage.default,
  fontSize: ASYNC_STORAGE_DEFAULTS.fontSize.default,
  overwriteVersions: true,
  showAliyot: ASYNC_STORAGE_DEFAULTS.showAliyot.default,
  debugInterruptingMessage: ASYNC_STORAGE_DEFAULTS.debugInterruptingMessage.default,
};

const saveFieldToAsync = function (field, value) {
  AsyncStorage.setItem(field, JSON.stringify(value));
};

const reducer = function (state = DEFAULT_STATE, action) {
  switch (action.type) {
    case REDUX_ACTIONS.setTheme:
      const theme = action.themeStr === "white" ? themeWhite : themeBlack;
      //no need to save value in async if that's where it is coming from
      if (!action.fromAsync) { saveFieldToAsync('color', action.themeStr); }
      return {
        ...state,
        theme,
        themeStr: action.themeStr,
      };
    case REDUX_ACTIONS.setDefaultTextLanguage:
      if (!action.fromAsync) { saveFieldToAsync('defaultTextLanguage', action.language); }
      return {
        ...state,
        defaultTextLanguage: action.language,
      };
    case REDUX_ACTIONS.initTextLanguageByTitle:
      return {
        ...state,
        textLanguageByTitle: action.textLanguageByTitle,
      }
    case REDUX_ACTIONS.setTextLanguageByTitle:
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
    case REDUX_ACTIONS.setMenuLanguage:
      if (!action.fromAsync) { saveFieldToAsync('menuLanguage', action.language); }
      return {
        ...state,
        menuLanguage: action.language,
      }
    case REDUX_ACTIONS.setFontSize:
      if (!action.fromAsync) { saveFieldToAsync('fontSize', action.fontSize); }
      return {
        ...state,
        fontSize: action.fontSize,
      }
    case REDUX_ACTIONS.setOverwriteVersions:
      return {
        ...state,
        overwriteVersions: action.overwrite,
      }
    case REDUX_ACTIONS.setAliyot:
      if (!action.fromAsync) { saveFieldToAsync('showAliyot', action.show); }
      return {
        ...state,
        showAliyot: action.show,
      }
    case REDUX_ACTIONS.toggleDebugInterruptingMessage:
      // toggle if you didn't pass in debug, otherwise you're initializing the value
      const newDebug = action.debug === undefined ? (!state.debugInterruptingMessage) : action.debug;
      if (!action.fromAsync) { saveFieldToAsync('debugInterruptingMessage', newDebug); }
      return {
        ...state,
        debugInterruptingMessage: newDebug,
      }
    default:
      return state;
  }
};

let store = createStore(reducer);

const initAsyncStorage = () => {
  // Loads data from each field in `_data` stored in Async storage into local memory for sync access.
  // Returns a Promise that resolves when all fields are loaded.
  var promises = [];
  let asyncData = {};
  for (field in ASYNC_STORAGE_DEFAULTS) {
    if (ASYNC_STORAGE_DEFAULTS.hasOwnProperty(field)) {
      var loader = function(field, value) {
        const actionValue = value ? JSON.parse(value) : ASYNC_STORAGE_DEFAULTS[field].default;
        store.dispatch(ASYNC_STORAGE_DEFAULTS[field].action(actionValue, true));
      }.bind(null, field);
      var promise = AsyncStorage.getItem(field)
        .then(loader)
        .catch(function(error) {
          console.error("AsyncStorage failed to load setting: " + error);
        });
      promises.push(promise);
    }
  }
  return Promise.all(promises);
};

export { ACTION_CREATORS, store, initAsyncStorage };
