'use strict';

// React Native Firebase: load app + feature packages before ReaderApp so namespaces
// (e.g. analytics) register with the singleton before any getAnalytics() calls.
import '@react-native-firebase/app';
import '@react-native-firebase/analytics';
import '@react-native-firebase/crashlytics';

import {
  AppRegistry,
  LogBox,
  Alert,
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
import {ErrorBoundaryFallbackComponent} from "./ErrorBoundaryFallbackComponent";
import {ErrorBoundary, useErrorBoundary} from "react-error-boundary";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReaderApp from './ReaderApp';
import { initAnalytics } from './analytics/events';

initAnalytics();

if (process.env.NODE_ENV !== "production" && false) {
  const whyDidYouRender = require("@welldone-software/why-did-you-render");
  whyDidYouRender(React, {
    collapseGroups: true,
  });
}

LogBox.ignoreLogs([
  'Failed prop type: Invalid prop `TextComponent` of type `object` supplied to `HtmlView`',
  'Failed prop type: Invalid prop `RootComponent` of type `object` supplied to `HtmlView`',
  'You seem to update props of the "TRenderEngineProvider" component in short periods of time, causing costly tree rerenders',  // seems to not be a real issue
  'You seem to update the renderersProps prop(s) of the "RenderHTML" component in short periods of time',  // seems to not be a real issue
  'You seem to update the renderers prop(s) of the "RenderHTML" component',  // slightly different wording
]);

const generalAppErrorAlert = () => {
  Alert.alert(
      strings.generalErrorAlertTitle,
      strings.generalErrorAlertMessage,
      [
        {text: strings.ok, style: 'cancel'},
      ]
  );
};

const ReaderAppGesturified = gestureHandlerRootHOC(ReaderApp);

const FunctionalReaderAppWrapper = () => {
  /**
   * Functional component wrapper of ReaderApp that allows use of hooks that can then be passed in as props
   */
  const [ globalState, dispatch ] = useReducer(reducer, DEFAULT_STATE);
  const theme = getTheme(globalState.themeStr);
  const { showBoundary } = useErrorBoundary();
  return (
      <DispatchContext.Provider value={dispatch}>
        <GlobalStateContext.Provider value={globalState}>
          <ReaderAppGesturified
              { ...globalState }
              theme={theme}
              dispatch={dispatch}
              showErrorBoundary={showBoundary}
          />
        </GlobalStateContext.Provider>
      </DispatchContext.Provider>
  );
};

const Root = () => {
  return (
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallbackComponent} onError={generalAppErrorAlert}>
        <SafeAreaProvider>
          <FunctionalReaderAppWrapper />
        </SafeAreaProvider>
      </ErrorBoundary>
  );
}
Root.whyDidYouRender = true;
AppRegistry.registerComponent('ReaderApp', () => Root);
