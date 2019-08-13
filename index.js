'use strict';

import {
  AppRegistry,
  ScrollView,
  Text,
  View,
} from 'react-native';
import React, { useReducer } from 'react';
import {
  GlobalStateContext,
  DispatchContext,
  reducer,
  DEFAULT_STATE,
} from './StateManager';
import strings from './LocalizedStrings';
import ReaderApp from './ReaderApp';

const Root = () => {
  const [ globalState, dispatch ] = useReducer(reducer, DEFAULT_STATE);
  return (
    <DispatchContext.Provider value={dispatch}>
      <GlobalStateContext.Provider value={globalState}>
        <ReaderApp
          { ...globalState }
          dispatch={dispatch}
        />
      </GlobalStateContext.Provider>
    </DispatchContext.Provider>
  );
}

AppRegistry.registerComponent('ReaderApp', () => Root);
