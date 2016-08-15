'use strict';
var React = require('react-native');

var {
	View,
	Text
} = React;

var styles = require('./Styles.js');

var SearchTextResult = React.createClass({
	propTypes: {
		text: React.PropTypes.string,
		title: React.PropTypes.string
	},
	render: function() {
		return (
			<View style={styles.searchTextResult}>
				<Text>{this.props.title}</Text>
				<Text>{this.props.text}</Text>
			</View>
		);
	}
});

module.exports = SearchTextResult;