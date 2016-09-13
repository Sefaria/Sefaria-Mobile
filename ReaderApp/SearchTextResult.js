'use strict';
import React, { Component } from 'react';
import {
	Text,
	TouchableOpacity,
	View
} from 'react-native';
var HTMLView = require('react-native-htmlview'); //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

var styles = require('./Styles.js');

var SearchTextResult = React.createClass({
  propTypes: {
    text:     React.PropTypes.string,
    title:    React.PropTypes.string,
    textType: React.PropTypes.oneOf(["english","hebrew"]),
    openRef:  React.PropTypes.func.isRequired
  },
	render: function() {
    return (
      <TouchableOpacity style={styles.searchTextResult} onPress={()=>this.props.openRef(this.props.title,true)}>
        <Text>{this.props.title}</Text>
				<Text style={this.props.textType == "hebrew" ? styles.hebrewText : styles.englishText}>
          <HTMLView
            value={this.props.text}
          />
				</Text>
      </TouchableOpacity>
    );
  }
});

module.exports = SearchTextResult;
