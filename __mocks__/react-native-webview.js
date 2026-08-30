// The WebView component is backed by a native view manager Jest cannot register. Nothing
// these tests assert on lives inside a WebView, so render it as a plain View.
import React from 'react';
import { View } from 'react-native';

export const WebView = (props) => React.createElement(View, props);
export default WebView;
