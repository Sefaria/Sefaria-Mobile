'use strict';
import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';

var {
  CloseButton,
  LanguageToggleButton
} = require('./Misc.js');

var styles = require('./Styles.js');


var ReaderTextTableOfContents = React.createClass({
  // The Table of Contents for a single Text
  propTypes: {
    title:          React.PropTypes.string.isRequired,
    openRef:        React.PropTypes.func.isRequired,
    close:          React.PropTypes.func.isRequired,
    interfaceLang:  React.PropTypes.func.isRequired,
    toggleLanguage: React.PropTypes.func.isRequired,
    Sefaria:        React.PropTypes.object.isRequired
  },
  getInitialState: function() {
    Sefaria = this.props.Sefaria;
    var toc = Sefaria.textToc(this.props.title, function(data) {
      this.setState({textToc: data});
    }.bind(this));

    return {
      textToc: toc
    };
  },
  componentDidMount: function() {

  },
  render: function() {
    var status = this.state.textToc ? "loaded" : "loading...";
    return (
      <View style={[styles.menu]}>
            
        <View style={styles.header}>
          <CloseButton onPress={this.props.close} />
          <Text style={[styles.textTocHeaderTitle, styles.textCenter]}>TABLE OF CONTENTS</Text>
        </View>

        <ScrollView style={styles.menuContent}>
          
          <Text>{this.props.title}</Text>
          
          <Text>{status}</Text>

        </ScrollView>

      </View>);
  }
});

module.exports = ReaderTextTableOfContents;
