'use strict';

var React = require('react-native');
var HTMLView = require('react-native-htmlview'); //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

var {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} = React;


var TextSegment = React.createClass({

onPressTextSegment: function(q){
//	console.log(this.props);
    this.props._TextSegmentPressed(q-1);


},

onLayout: function(event){
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
         	onLayout = {this.onLayout}
         >
			{this.props.textRef}
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
