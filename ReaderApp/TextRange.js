'use strict';
import React, { Component } from 'react';
import { 	AppRegistry,
  StyleSheet,
  View,
  Text
} from 'react-native';



var TextSegment = require('./TextSegment');


var TextRange = React.createClass({

  render: function() {
    var data = this.props.data;
    var columnLanguage = this.props.columnLanguage;

    var rows = [];
    for (var i = 0; i < data.length; i++) {

//		if (data[i].text != "" && data[i].he != "" ) {
      rows.push(<Text style={styles.verseNumber}>{data[i].segmentNumber}.</Text>)

      if (columnLanguage == "english" || columnLanguage == "bilingual") {
        rows.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={data[i].segmentNumber} data={data[i].text}
                               textType="english" TextSegmentPressed={ this.props.TextSegmentPressed }
                               generateSegmentRefPositionArray={this.props.generateSegmentRefPositionArray}/>);
      }

      if (columnLanguage == "hebrew" || columnLanguage == "bilingual") {
        rows.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={data[i].segmentNumber} data={data[i].he}
                               textType="hebrew" TextSegmentPressed={ this.props.TextSegmentPressed }
                               generateSegmentRefPositionArray={this.props.generateSegmentRefPositionArray}/>);
      }
//		}

    }


    return (
      <View style={styles.container}>
        {rows}
      </View>
    );
  }
});


var styles = StyleSheet.create({

  verseNumber: {
    flex: .5,
    textAlign: 'left',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    fontFamily: "Montserrat",
    fontWeight: "100",
  },


});

module.exports = TextRange;
