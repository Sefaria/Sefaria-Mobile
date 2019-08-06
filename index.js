'use strict';

import {
  AppRegistry,
  ScrollView,
  Text,
  View,
} from 'react-native';
import React from 'react';
import {
  GlobalStateContext,
  DispatchContext,
  reducer,
  DEFAULT_STATE,
} from './StateManager';
import ReaderApp from './ReaderApp';

const Root = () => {
  const [ globalState, dispatch ] = React.useReducer(reducer, DEFAULT_STATE);
  // ReaderApp props are for use in componentWillUpdate()
  return (
    <DispatchContext.Provider value={dispatch}>
      <GlobalStateContext.Provider value={globalState}>
        <ReaderApp
          textLanguage={globalState.textLanguage}
          themeStr={globalState.themeStr}
        />
      </GlobalStateContext.Provider>
    </DispatchContext.Provider>
  );
};

AppRegistry.registerComponent('ReaderApp', Root);
