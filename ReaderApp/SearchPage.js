'use strict';

import React, { Component } from 'react';
import {
	View,
	Text
} from 'react-native';

var SearchBar        = require('./SearchBar');
var SearchResultList = require('./SearchResultList');
var styles           = require('./Styles.js');

var {
  CategoryColorLine,
} = require('./Misc.js');

var SearchPage = React.createClass({
	propTypes: {
		theme:         React.PropTypes.object,
		closeNav:      React.PropTypes.func.isRequired,
		onQueryChange: React.PropTypes.func.isRequired,
		openRef:       React.PropTypes.func.isRequired,
		setLoadTail:   React.PropTypes.func.isRequired,
		setIsNewSearch:React.PropTypes.func.isRequired,
		query:         React.PropTypes.string,
		queryResult:   React.PropTypes.array,
		loadingQuery:  React.PropTypes.bool,
		loadingTail:   React.PropTypes.bool,
		isNewSearch:   React.PropTypes.bool,
		numResults:    React.PropTypes.number
	},
	render: function() {

		return (
			<View style={[styles.menu,this.props.theme.menu]}>
				<CategoryColorLine category={"Other"} />
				<SearchBar
					theme={this.props.theme}
					closeNav={this.props.closeNav}
					onQueryChange={this.props.onQueryChange}
					query={this.props.query}
					setIsNewSearch={this.props.setIsNewSearch}/>
				<Text style={styles.searchResultSummary} >Results: {this.props.numResults} {this.props.loadingQuery || this.props.loadingTail ? "Loading..." : ""}</Text>
				<SearchResultList
					theme={this.props.theme}
					queryResult={this.props.queryResult}
					loadingTail={this.props.loadingTail}
					onQueryChange={this.props.onQueryChange}
					openRef={this.props.openRef}
					setLoadTail={this.props.setLoadTail}
					setIsNewSearch={this.props.setIsNewSearch}
					isNewSearch={this.props.isNewSearch}
				/>
			</View>
		);
	}
});

module.exports = SearchPage;
