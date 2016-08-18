'use strict';
import React, { Component } from 'react';
import {
	Text,
	View,
} from 'react-native';
var HTMLView = require('react-native-htmlview'); //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

var styles = require('./Styles.js');

var SearchTextResult = React.createClass({
  propTypes: {
    text: React.PropTypes.string,
    title: React.PropTypes.string,
    textType: React.PropTypes.string,
  },
  render: function() {
    return (
      <View style={styles.searchTextResult}>
        <Text>{this.props.title}</Text>
          <HTMLView
            value={this.props.text}
            stylesheet={styles}

          />
      </View>
    );
  }
});

module.exports = SearchTextResult;