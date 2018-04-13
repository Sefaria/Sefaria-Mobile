'use strict';

import {
  AppRegistry,
  ScrollView,
  Text,
  View,
} from 'react-native';
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './ReduxStore';
import ReaderApp from './ReaderApp';

const Root = () => (
  <Provider store={store}>
    <ReaderApp />
  </Provider>
);

AppRegistry.registerComponent('ReaderApp', () => Root);
