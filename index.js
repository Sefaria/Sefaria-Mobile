'use strict';

import {
  AppRegistry,
  ScrollView,
  Text,
  View,
  YellowBox,
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
import '@react-native-firebase/crashlytics';  // to setup up generic crashlytics reports
if (process.env.NODE_ENV !== "production" && false) {
  const whyDidYouRender = require("@welldone-software/why-did-you-render");
  whyDidYouRender(React, {
    collapseGroups: true,
  });
}

// Two innocuous warnings based on `TextSegment` 
YellowBox.ignoreWarnings([
  'Invalid prop `style` supplied to `React.Fragment`',
  'Failed prop type: Invalid prop `RootComponent` of type `object`',
  'Failed prop type: Invalid prop `RootComponent` of type `symbol`',
  'Failed prop type: Invalid prop `TextComponent` of type `object`',
]);

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
