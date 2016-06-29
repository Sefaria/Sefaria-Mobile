'use strict';

var React = require('react-native');

var {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} = React;

var TextColumn = require('./TextColumn');
var TextList = require('./TextList');



var ReaderPanel = React.createClass({


    getInitialState: function () {
        return {
        	textFlow: this.props.textFlow || 'segmented', 	// alternative is 'continuous'
        	columnLanguage: this.props.columnLanguage || 'english', 	// alternative is 'hebrew' &  'bilingual'

        };
    
    
    },


  toggleTextFlow:function() {
  
    	if (this.state.textFlow == "continuous") {
    	this.setState({textFlow:  "segmented"})
    	}
    	else {
    	 this.setState({textFlow:  "continuous"})
    	 
    	 if (this.state.columnLanguage == "bilingual") {
	        this.setState({columnLanguage:  "hebrew"})
    	 }
    	 
    	 }
  },

  togglecolumnLanguage:function() {
    	
switch(this.state.columnLanguage) {
    case "english":
        this.setState({columnLanguage:  "hebrew"})
        break;
    case "hebrew":
    	this.state.textFlow == "continuous" ? this.setState({columnLanguage:  "english"}) : this.setState({columnLanguage:  "bilingual"})
        break;
    case "bilingual":
        this.setState({columnLanguage:  "english"})
        break;
    default:
        this.setState({columnLanguage:  "bilingual"})
}

  },



  render: function() {
  var panelType;
  if (this.props.textList == 1) {

  	 	panelType = <TextList textRef={this.props.textRef} segmentRef={this.props.segmentRef} textFlow={this.state.textFlow} columnLanguage={this.state.columnLanguage} _RefPressed={ this.props._RefPressed } />

}
else {	panelType = <TextColumn textRef={this.props.textRef} segmentRef={this.props.segmentRef} textFlow={this.state.textFlow} columnLanguage={this.state.columnLanguage} _TextSegmentPressed={ this.props._TextSegmentPressed } /> }

  
    return (
		<View style={styles.container}>
		<View style={styles.header}>
			<TouchableOpacity onPress={this.toggleTextFlow} style={[{width:100}]}>
				<Text style={styles.title}>
					{this.props.textList == 0 ? this.state.textFlow : ""}
				</Text>
			</TouchableOpacity>

			<TouchableOpacity onPress={this.togglecolumnLanguage} style={[{width:100}]}>
				<Text style={styles.title}>
					{this.props.textList == 0 ? this.state.columnLanguage : ""}
				</Text>
			</TouchableOpacity>
			<Text style={[{width:100}]}>
			{this.props.textReference}
			</Text>
		</View>
	   	<View style={styles.mainTextPanel}>
			{panelType}
        </View>
        </View>
    );
  }
});


var styles = StyleSheet.create({
    container: {
    	flex: 1,
        backgroundColor: '#F5FCFF',
    },
    header: {
        height: 45,
        backgroundColor: '#F9F9F7',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexDirection: 'row',
    },
    
    mainTextPanel: {
        flex: .5,
        flexWrap: "nowrap",
        justifyContent: 'center',
        backgroundColor: '#fff',
        alignSelf: 'stretch',
        alignItems: "flex-start"
    },

});

module.exports = ReaderPanel;
