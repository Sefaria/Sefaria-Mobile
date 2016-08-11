'use strict';
var React = require('react-native');

var {
	Text
} = React;

var styles = require('./Styles.js');

var SearchTextResult = React.createClass({
	propTypes: {
		text: React.PropTypes.string
	},
	render: function() {
		return (
			<Text style={styles.searchTextResult}>{this.props.text}</Text>
		);
	}
});

module.exports = SearchTextResult;