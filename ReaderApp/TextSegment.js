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

  onPressTextSegment: function(q) {
//	console.log(this.props);
    this.props.TextSegmentPressed(q - 1);


  },

  render: function() {

    // console.log(this.props.segmentKey+": "+typeof(this.props.textRef));

    return (
      <Text
        style={this.props.textType == "hebrew" ? styles.hebrewText : styles.englishText}
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
