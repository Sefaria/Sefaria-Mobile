'use strict';

var React = require('react-native');

var {
  StyleSheet,
  View,
  Text
} = React;

var TextSegment = require('./TextSegment');


var TextRange = React.createClass({

  render: function() {
    var textRef = this.props.textRef;
    var columnLanguage = this.props.columnLanguage;
    
	var rows = [];
	for (var i=0; i < textRef.length; i++) {

//		if (textRef[i].text != "" && textRef[i].he != "" ) {
			 rows.push(<Text style={styles.verseNumber}>{textRef[i].segmentNumber}.</Text>)
	
			 if (columnLanguage == "english" || columnLanguage == "bilingual" ) {
			 rows.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={textRef[i].segmentNumber} textRef={textRef[i].text} textType="english" _TextSegmentPressed={ this.props._TextSegmentPressed } generateSegmentRefPositionArray={this.props.generateSegmentRefPositionArray} />);
			 }

			 if (columnLanguage == "hebrew" || columnLanguage == "bilingual" ) {
			 rows.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={textRef[i].segmentNumber} textRef={textRef[i].he} textType="hebrew" _TextSegmentPressed={ this.props._TextSegmentPressed } generateSegmentRefPositionArray={this.props.generateSegmentRefPositionArray} />);
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
    	flex:.5,
        textAlign: 'left',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        fontFamily: "Montserrat",
        fontWeight: "100",
    },



});

module.exports = TextRange;
