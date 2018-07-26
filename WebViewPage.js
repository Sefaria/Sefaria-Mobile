'use strict';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image,
  WebView,
} from 'react-native';

import {
  CategoryColorLine,
  CloseButton,
  LoadingView,
} from './Misc.js';
import styles from './Styles';

class WebViewPage extends React.Component {
  static propTypes = {
    theme: PropTypes.object.isRequired,
    themeStr: PropTypes.string.isRequired,
    close: PropTypes.func.isRequired,
    uri:      PropTypes.string.isRequired,
  }
  constructor(props) {
    super(props);
  }

  renderLoading = () => (
    <LoadingView theme={this.props.theme} />
  );

  render() {
    return (
      <View style={{flex:1, flexDirection: "column", alignSelf: 'stretch'}}>
        <CategoryColorLine category={"Other"} />
        <View style={[styles.header, this.props.theme.header]}>
          <CloseButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr} />
          <Text>{"sefaria.org"}</Text>
        </View>
        <WebView
          source={{uri: this.props.uri}}
          renderLoading={this.renderLoading}
          startInLoadingState={true}
        />
      </View>
    );
  }
}

export default WebViewPage;
