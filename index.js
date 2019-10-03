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
  getTheme,
} from './StateManager';
import strings from './LocalizedStrings';
import ReaderApp from './ReaderApp';

if (process.env.NODE_ENV !== "production") {
  const whyDidYouRender = require("@welldone-software/why-did-you-render");
  whyDidYouRender(React, {
    collapseGroups: true,
  });
}

const Root = () => {
  const [ globalState, dispatch ] = useReducer(reducer, DEFAULT_STATE);
  const theme = getTheme(globalState.themeStr);
  return (
    <DispatchContext.Provider value={dispatch}>
      <GlobalStateContext.Provider value={globalState}>
        <ReaderApp
          { ...globalState }
          theme={theme}
          dispatch={dispatch}
        />
      </GlobalStateContext.Provider>
    </DispatchContext.Provider>
  );
}
Root.whyDidYouRender = true;
AppRegistry.registerComponent('ReaderApp', () => Root);
