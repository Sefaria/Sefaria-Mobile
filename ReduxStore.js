import { combineReducers, createStore } from 'redux';

const REDUX_ACTIONS = {
    SET_TEXT: 'SET_TEXT',
    SET_CALENDARS: 'SET_CALENDARS',
    SET_LANGUAGE: 'SET_LANGUAGE',
    SET_TAB: 'SET_TAB',
    SET_TITLE_URL: 'SET_TITLE_URL',
    SET_SCROLL_POS: 'SET_SCROLL_POS',
    SET_TOPIC: 'SET_TOPIC',
};

const DEFAULT_STATE = {
    textLanguage: 'bilingual',
    textFlow: 'segmented',
    settings: {
      fontSize: 20,
      language: 'english',
    },
};

const reducer = function (state = DEFAULT_STATE, action) {
  switch (action.type) {
    default:
      return state;
  }
};

let store = createStore(reducer);
export { REDUX_ACTIONS, store };
