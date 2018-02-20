import { combineReducers, createStore } from 'redux';

const REDUX_ACTIONS = {

};

const DEFAULT_STATE = {
};

const reducer = function (state = DEFAULT_STATE, action) {
  switch (action.type) {
    default:
      return state;
  }
};

let store = createStore(reducer);
export { REDUX_ACTIONS, store };
