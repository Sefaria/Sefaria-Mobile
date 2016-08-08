'use strict';

var React            = require('react-native');
var styles           = require('./Styles.js');
var {
	Text
} = React;

var SearchResultList = React.createClass({
	propTypes:{
		searchQuery: React.PropTypes.string
	},
	render: function() {
		return (<Text>{this.props.searchQuery}</Text>);
	}

});

module.exports = SearchResultList;