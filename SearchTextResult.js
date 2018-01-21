'use strict';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

var styles = require('./Styles.js');

class SearchTextResult extends React.Component {
  static propTypes = {
		theme:    PropTypes.object.isRequired,
    text:     PropTypes.string,
    title:    PropTypes.string,
    textType: PropTypes.oneOf(["english","hebrew"]),
    onPress:  PropTypes.func.isRequired
  };

  render() {
	  return (
	    <TouchableOpacity style={[styles.searchTextResult, this.props.theme.searchTextResult]} onPress={this.props.onPress}>
	      <Text style={[styles.en, styles.textListCitation, this.props.theme.textListCitation]}>{this.props.title}</Text>
				<HTMLView
          value= {this.props.textType == "hebrew" ? "<hediv>"+this.props.text+"</hediv>" : "<endiv>"+this.props.text+"</endiv>"}
          stylesheet={styles}
          textComponentProps={{style: [this.props.textType == "hebrew" ? styles.hebrewText : styles.englishText,this.props.theme.text]}}
				/>
	    </TouchableOpacity>
	  );
}
}

module.exports = SearchTextResult;
