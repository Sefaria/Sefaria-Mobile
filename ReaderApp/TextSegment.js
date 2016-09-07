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
    segmentRef:      React.PropTypes.number,
    segmentKey:      React.PropTypes.string,
    data:            React.PropTypes.string,
    textType:        React.PropTypes.oneOf(["english","hebrew"]),
    TextSegmentPressed: React.PropTypes.func.isRequired,
    settings:        React.PropTypes.object
  },
  onPressTextSegment: function(key) {
    var section = key.split(":")[0];
    var segment = key.split(":")[1];
    this.props.TextSegmentPressed(section,segment - 1,true);


  },

  render: function() {

    // console.log(this.props.segmentKey+": "+typeof(this.props.textRef));
    return (
      <Text
        style={[this.props.textType == "hebrew" ? styles.hebrewText : styles.englishText,
              {fontSize:this.props.textType == "hebrew" ? this.props.settings.fontSize : 0.8*this.props.settings.fontSize}]}
        suppressHighlighting={false}
        onPress={ () => this.onPressTextSegment(this.props.segmentKey) }
        key={this.props.segmentKey}
        onLayout={this.onLayout}
      >
          <HTMLView
            value={this.props.data}
            stylesheet={styles}

          />


      </Text>
    );
  }
});


module.exports = TextSegment;
