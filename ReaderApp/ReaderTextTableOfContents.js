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
  LanguageToggleButton,
  LoadingView
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
              refPath={this.props.title + " "}
              openRef={this.props.openRef} /> : <LoadingView /> }

        </ScrollView>

      </View>);
  }
});



var TextSchemaNode = React.createClass({
  propTypes: {
    schema:      React.PropTypes.object.isRequired,
    contentLang: React.PropTypes.string.isRequired,
    refPath:     React.PropTypes.string.isRequired,   
    openRef:     React.PropTypes.func.isRequired
  },
  render: function() {
    if (this.props.schema.nodeType == "JaggedArrayNode") {
      return (
        <TextJaggedArrayNode
          schema={this.props.schema}
          contentLang={this.props.contentLang}
          refPath={this.props.refPath}
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
    refPath:     React.PropTypes.string.isRequired,
    openRef:     React.PropTypes.func.isRequired,
  },
  render: function() {
    var schema = this.props.schema;
    var sectionLinks = [];
    for (var i = 1; i <= schema.lengths[0]; i++) {
      if (schema.addressTypes[0] === "Talmud") {
        var section = Sefaria.hebrew.intToDaf(i);
        var heSection = Sefaria.hebrew.encodeHebrewDaf(section);
      } else {
        var section = i;
        var heSection = Sefaria.hebrew.encodeHebrewNumeral(i);
      }
      var open = this.props.openRef.bind(null, this.props.refPath + section);
      var link = (
        <TouchableOpacity style={styles.sectionLink} onPress={open} key={i}>
          { this.props.contentLang == "english" ?
            <Text style={[styles.centerText]}>{section}</Text> :
            <Text style={[styles.he, styles.centerText]}>{heSection}</Text>}
        </TouchableOpacity>
      );
      sectionLinks.push(link);
    }
    sectionLinks.push(<View style={styles.lineEnd}></View>);

    return (
      <View style={styles.textTocNumberedSection}>{sectionLinks}</View>
    );
  }
});


module.exports = ReaderTextTableOfContents;
