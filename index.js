'use strict';

import {
  AppRegistry,
  ScrollView,
  Text,
  View,
} from 'react-native';
import React, { useReducer } from 'react';
import { gestureHandlerRootHOC } from 'react-native-gesture-handler';
import {
  GlobalStateContext,
  DispatchContext,
  reducer,
  DEFAULT_STATE,
  getTheme,
} from './StateManager';
import strings from './LocalizedStrings';
import ReaderApp from './ReaderApp';

if (process.env.NODE_ENV !== "production" && false) {
  const whyDidYouRender = require("@welldone-software/why-did-you-render");
  whyDidYouRender(React, {
    collapseGroups: true,
  });
}

const ReaderAppGesturified = gestureHandlerRootHOC(ReaderApp);
const Root = () => {
  const [ globalState, dispatch ] = useReducer(reducer, DEFAULT_STATE);
  const theme = getTheme(globalState.themeStr);
  return (
    <DispatchContext.Provider value={dispatch}>
      <GlobalStateContext.Provider value={globalState}>
        <ReaderAppGesturified
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
