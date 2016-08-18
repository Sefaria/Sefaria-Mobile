'use strict';

import React, { Component } from 'react';
import { 
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';


var TextSegment = React.createClass({

  onPressTextSegment: function(q) {
//	console.log(this.props);
    this.props.TextSegmentPressed(q - 1);


  },

  onLayout: function(event) {
    this.props.generateSegmentRefPositionArray(this.props.segmentKey, event.nativeEvent.layout.y)
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
        {this.props.data}
      </Text>
    );
  }
});


var styles = StyleSheet.create({


  englishText: {
    fontFamily: "EB Garamond",
    textAlign: 'left',
    alignSelf: 'stretch',
    fontSize: 16,
    flex: 1
  },
  hebrewText: {
    fontFamily: "Taamey Frank CLM",
    textAlign: 'right',
    alignSelf: 'stretch',
    fontSize: 20,
    flex: 1
  },


});

module.exports = TextSegment;
