'use strict';

import React, { Component } from 'react';
import {
	View,
	Text
} from 'react-native';

const SearchBar        = require('./SearchBar');
const SearchResultList = require('./SearchResultList');
const styles           = require('./Styles');
const strings          = require('./LocalizedStrings');

var {
  CategoryColorLine,
} = require('./Misc.js');

var SearchPage = React.createClass({
	propTypes: {
		theme:               React.PropTypes.object.isRequired,
		themeStr:            React.PropTypes.string.isRequired,
		hasInternet:         React.PropTypes.bool,
		closeNav:            React.PropTypes.func.isRequired,
		onQueryChange:       React.PropTypes.func.isRequired,
		openRef:             React.PropTypes.func.isRequired,
		setLoadTail:         React.PropTypes.func.isRequired,
		setIsNewSearch:      React.PropTypes.func.isRequired,
		query:               React.PropTypes.string,
		queryResult:         React.PropTypes.array,
		loadingQuery:        React.PropTypes.bool,
		loadingTail:         React.PropTypes.bool,
		isNewSearch:         React.PropTypes.bool,
		numResults:          React.PropTypes.number
	},
	numberWithCommas: function(x) {
    	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	},
	render: function() {
		var status = this.props.hasInternet ?
						this.props.loadingQuery ? strings.loading
						: this.numberWithCommas(this.props.numResults) + " " + strings.results
					: strings.connectToSearchMessage;

		return (
			<View style={[styles.menu, this.props.theme.menu]}>
				<CategoryColorLine category={"Other"} />
				<SearchBar
					theme={this.props.theme}
					themeStr={this.props.themeStr}
					closeNav={this.props.closeNav}
					onQueryChange={this.props.onQueryChange}
					query={this.props.query}
					setIsNewSearch={this.props.setIsNewSearch}/>
				<View style={[styles.searchResultSummary, this.props.theme.searchResultSummary]}>
					<Text style={[styles.searchResultSummaryText, this.props.theme.searchResultSummaryText]} >{status}</Text>
				</View>
				<SearchResultList
					theme={this.props.theme}
					queryResult={this.props.queryResult}
					loadingTail={this.props.loadingTail}
					onQueryChange={this.props.onQueryChange}
					openRef={this.props.openRef}
					setLoadTail={this.props.setLoadTail}
					setIsNewSearch={this.props.setIsNewSearch}
					isNewSearch={this.props.isNewSearch} />
			</View>
		);
	}
});

module.exports = SearchPage;
