import React from 'react';
import { View } from 'react-native';
import {
  GlobalStateContext,
  DispatchContext,
  reducer,
  DEFAULT_STATE,
} from './StateManager';

// To be used as a wrapper component for components which need context in tests
const TestContextWrapper = ({ child, childProps, passContextToChildren }) => {
  const [ globalState, dispatch ] = React.useReducer(reducer, DEFAULT_STATE);
  globalState.theme = {};
  return (
    <DispatchContext.Provider value={dispatch}>
      <GlobalStateContext.Provider value={globalState}>
        <View
          _globalState={globalState}
          _dispatch={dispatch}
        >
          {
            passContextToChildren ?
              React.createElement(child, { ...globalState, dispatch, ...childProps }) :
              React.createElement(child, childProps)
          }
        </View>
      </GlobalStateContext.Provider>
    </DispatchContext.Provider>
  );
}
TestContextWrapper.defaultProps = {
  childProps: {},
}

export default TestContextWrapper;
