'use strict';

var React = require('react-native');

var {
  StyleSheet,
  View,
  Text
} = React;

var TextSegment = require('./TextSegment');


var TextRangeContinuous = React.createClass({

  render: function() {
    var textRef = this.props.textRef;
    var columnLanguage = this.props.columnLanguage;
    
	var rows = [];
	for (var i=0; i < textRef.length; i++) {
	
		rows.push(<Text style={styles.verseNumber}>{textRef[i].segmentNumber}.</Text>)

		if (columnLanguage == "english") {
		rows.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={textRef[i].segmentNumber} textRef={textRef[i].text} textType="english" _TextSegmentPressed={ this.props._TextSegmentPressed } generateSegmentRefPositionArray={this.props.generateSegmentRefPositionArray}/>);
		rows.push(<Text> </Text>);
		}

		if (columnLanguage == "hebrew") {
		rows.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={textRef[i].segmentNumber} textRef={textRef[i].he} textType="hebrew" _TextSegmentPressed={ this.props._TextSegmentPressed } generateSegmentRefPositionArray={this.props.generateSegmentRefPositionArray} />);
		rows.push(<Text> </Text>);
		}



	}
	
		
	
    return (
   	 <View>
   	 	<Text style={columnLanguage == "hebrew" ? styles.hebrewText : styles.englishText}>
  			{rows}
  		</Text>
  	</View>
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

module.exports = TextRangeContinuous;
