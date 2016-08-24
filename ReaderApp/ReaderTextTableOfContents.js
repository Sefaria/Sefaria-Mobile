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
    contentLang:    React.PropTypes.string.isRequired,
    interfaceLang:  React.PropTypes.string.isRequired,
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


    var title = (<View style={styles.navigationMenuTitleBox}>
                  { this.props.contentLang == "hebrew" ?
                    <Text style={[styles.he, styles.navigationMenuTitle]}>{this.state.textToc ? this.state.textToc.heTitle : null}</Text> :
                    <Text style={[styles.en, styles.navigationMenuTitle]}>{this.props.title}</Text> }
                  <LanguageToggleButton toggleLanguage={this.props.toggleLanguage} language={this.props.contentLang} />
                </View>);

    var status = this.state.textToc ? "loaded" : "loading...";
    return (
      <View style={[styles.menu]}>
            
        <View style={styles.header}>
          <CloseButton onPress={this.props.close} />
          <Text style={[styles.textTocHeaderTitle, styles.textCenter]}>TABLE OF CONTENTS</Text>
        </View>

        <ScrollView style={styles.menuContent}>
          
          {title}
          
          {this.state.textToc ? 
            <TextSchemaNode
              schema={this.state.textToc.schema}
              contentLang={this.props.contentLang}
              openRef={this.props.openRef} /> : null }

        </ScrollView>

      </View>);
  }
});



var TextSchemaNode = React.createClass({
  propTypes: {
    schema:      React.PropTypes.object.isRequired,
    contentLang: React.PropTypes.string.isRequired,
    openRef:     React.PropTypes.func.isRequired
  },
  render: function() {
    if (this.props.schema.nodeType == "JaggedArrayNode") {
      return (
        <TextJaggedArrayNode
          schema={this.props.schema}
          contentLang={this.props.contentLang}
          openRef={this.props.openRef} />
      );
    } else { 
      return (
        <Text>Complex texts coming soon...</Text>
      );
    }
  }
});


var TextJaggedArrayNode = React.createClass({
  propTypes: {
    schema:      React.PropTypes.object.isRequired,
    contentLang: React.PropTypes.string.isRequired,
    openRef:     React.PropTypes.func.isRequired,
  },
  render: function() {
    return (
      <Text>Simple texts coming soon...</Text>
    );
  }
});


module.exports = ReaderTextTableOfContents;
