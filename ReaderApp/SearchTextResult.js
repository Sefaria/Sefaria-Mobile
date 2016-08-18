'use strict';
import React, { Component } from 'react';
import { 	
	Text,
	View,
} from 'react-native';

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
        <Text style={this.props.textType == "hebrew" ? styles.hebrewText : styles.englishText}>{this.props.text}</Text>
      </View>
    );
  }
});

module.exports = SearchTextResult;