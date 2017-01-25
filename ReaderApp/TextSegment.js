'use strict';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
var HTMLView = require('react-native-htmlview'); //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
var styles = require('./Styles.js');


var TextSegment = React.createClass({
  propTypes: {
    theme:              React.PropTypes.object.isRequired,
    rowRef:             React.PropTypes.string.isRequired, /* this ref keys into TextColumn.rowRefs */
    segmentIndexRef:    React.PropTypes.number,
    segmentKey:         React.PropTypes.string,
    data:               React.PropTypes.string,
    textType:           React.PropTypes.oneOf(["english","hebrew"]),
    bilingual:          React.PropTypes.bool,
    textSegmentPressed: React.PropTypes.func.isRequired,
    textListVisible:    React.PropTypes.bool.isRequired,
    settings:           React.PropTypes.object
  },
  onPressTextSegment: function(key) {
    let section = parseInt(key.split(":")[0]);
    let segment = parseInt(key.split(":")[1]);
    this.props.textSegmentPressed(section, segment, this.props.rowRef, true);
  },

  render: function() {
    // console.log(this.props.segmentKey+": "+typeof(this.props.textRef));
    var style = this.props.textType == "hebrew" ?
                  [styles.hebrewText, this.props.theme.text, styles.justifyText, {fontSize: this.props.settings.fontSize, lineHeight: this.props.settings.fontSize * 1.1},] :
                  [styles.englishText, this.props.theme.text, styles.justifyText, {fontSize: 0.8 * this.props.settings.fontSize, lineHeight: this.props.settings.fontSize}];
    if (this.props.bilingual && this.props.textType == "english") {
      style.push(this.props.theme.bilingualEnglishText);
    }
    return (
      <Text
        style={style}
        suppressHighlighting={false}
        onPress={ () => this.onPressTextSegment(this.props.segmentKey) }
        key={this.props.segmentKey}
        onLayout={this.onLayout}
        selectable={true}
      >

          <HTMLView value={
            this.props.textType == "english" ?
              "&#x200E;"+Sefaria.reformatTalmudContent(this.props.data) :
                this.props.data
              } stylesheet={styles} />

      </Text>
    );
  }
});


module.exports = TextSegment;
