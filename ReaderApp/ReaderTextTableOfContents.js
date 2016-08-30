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
              refPath={this.props.title}
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
    return (<TextJaggedArrayNodeSection
              depth={this.props.schema.depth}
              sectionNames={this.props.schema.sectionNames}
              addressTypes={this.props.schema.addressTypes}
              contentCounts={this.props.schema.content_counts}
              contentLang={this.props.contentLang}
              refPath={this.props.refPath}
              openRef={this.props.openRef} />);
  }
});


var TextJaggedArrayNodeSection = React.createClass({
  propTypes: {
    depth:           React.PropTypes.number.isRequired,
    sectionNames:    React.PropTypes.array.isRequired,
    addressTypes:    React.PropTypes.array.isRequired,
    contentCounts:   React.PropTypes.array.isRequired,
    contentLang:     React.PropTypes.string.isRequired,
    refPath:         React.PropTypes.string.isRequired,
    openRef:         React.PropTypes.func.isRequired,
  },
  render: function() {
    if (this.props.depth > 2) {
      var content = [];
      for (var i = 0; i < this.props.contentCounts.length; i++) {
        content.push(
          <View style={styles.textTocNumberedSectionBox} key={i}>
            {this.props.contentLang == "english" ?
              <Text style={[styles.en, styles.textTocNumberedSectionTitle]}>{this.props.sectionNames[0] + " " + (i+1)}</Text> :
              <Text style={[styles.he, styles.textTocNumberedSectionTitle]}>{this.props.sectionNames[0] + " " + (i+1)}</Text> }
            <TextJaggedArrayNodeSection
              depth={this.props.depth - 1}
              sectionNames={this.props.sectionNames.slice(1)}
              addressTypes={this.props.addressTypes.slice(1)}
              contentCounts={this.props.contentCounts[i]}
              contentLang={this.props.contentLang}
              refPath={this.props.refPath + ":" + (i+1)}
              openRef={this.props.openRef} />
          </View>);
      }
      return ( <View>{content}</View> );
    }
    if (this.props.depth == 1) {
      // treat like d2
    }
    var sectionLinks = [];
    for (var i = 0; i < this.props.contentCounts.length; i++) {
      if (this.props.contentCounts[i] == 0) { continue; }
      if (this.props.addressTypes[0] === "Talmud") {
        var section = Sefaria.hebrew.intToDaf(i);
        var heSection = Sefaria.hebrew.encodeHebrewDaf(section);
      } else {
        var section = i+1;
        var heSection = Sefaria.hebrew.encodeHebrewNumeral(i+1);
      }
      var ref  = (this.props.refPath + ":" + section).replace(":", " ");
      var open = this.props.openRef.bind(null, ref);
      var link = (
        <TouchableOpacity style={styles.sectionLink} onPress={open} key={i}>
          { this.props.contentLang == "english" ?
            <Text style={[styles.centerText]}>{section}</Text> :
            <Text style={[styles.he, styles.centerText]}>{heSection}</Text> }
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
