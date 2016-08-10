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
    var data = this.props.data;
    var columnLanguage = this.props.columnLanguage;
    
	var rows = [];
	for (var i=0; i < data.length; i++) {
	
		rows.push(<Text style={styles.verseNumber}>{data[i].segmentNumber}.</Text>)

		if (columnLanguage == "english") {
		rows.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={data[i].segmentNumber} data={data[i].text} textType="english" TextSegmentPressed={ this.props.TextSegmentPressed } generateSegmentRefPositionArray={this.props.generateSegmentRefPositionArray}/>);
		rows.push(<Text> </Text>);
		}

		if (columnLanguage == "hebrew") {
		rows.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={data[i].segmentNumber} data={data[i].he} textType="hebrew" TextSegmentPressed={ this.props.TextSegmentPressed } generateSegmentRefPositionArray={this.props.generateSegmentRefPositionArray} />);
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
