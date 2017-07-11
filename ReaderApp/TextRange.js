'use strict';
import React, { Component } from 'react';
import { 	AppRegistry,
  StyleSheet,
  View,
  Text
} from 'react-native';



var TextSegment = require('./TextSegment');


class TextRange extends React.Component {
  render() {
    var data = this.props.data;
    var textLanguage = this.props.textLanguage;

    var rows = [];
    for (var i = 0; i < data.length; i++) {

//		if (data[i].text != "" && data[i].he != "" ) {
      rows.push(<Text style={styles.verseNumber}>{data[i].segmentNumber}.</Text>)

      if (textLanguage == "english" || textLanguage == "bilingual") {
        rows.push(<TextSegment segmentIndexRef={this.props.segmentIndexRef} segmentKey={data[i].segmentNumber} data={data[i].text}
                               textType="english" TextSegmentPressed={ this.props.TextSegmentPressed }
                               generatesegmentIndexRefPositionArray={this.props.generatesegmentIndexRefPositionArray}/>);
      }

      if (textLanguage == "hebrew" || textLanguage == "bilingual") {
        rows.push(<TextSegment segmentIndexRef={this.props.segmentIndexRef} segmentKey={data[i].segmentNumber} data={data[i].he}
                               textType="hebrew" TextSegmentPressed={ this.props.TextSegmentPressed }
                               generatesegmentIndexRefPositionArray={this.props.generatesegmentIndexRefPositionArray}/>);
      }
//		}

    }


    return (
      <View style={styles.container}>
        {rows}
      </View>
    );
  }
}


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
