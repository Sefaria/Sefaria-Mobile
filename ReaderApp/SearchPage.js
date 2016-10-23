'use strict';

import React, { Component } from 'react';
import {
	View,
	Text,
	AlertIOS
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
		hasInternet:   React.PropTypes.bool,
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
	componentDidMount: function() {
		if (!this.props.hasInternet) {
			this.showNoInternetAlert();
		}
	},
	componentWillReceiveProps: function(nextProps) {
		if (this.props.hasInternet && !nextProps.hasInternet) {
			this.showNoInternetAlert();
		}

	},
	showNoInternetAlert: function() {
		AlertIOS.alert(
		 'No Internet',
		 'Search requires an internet connection.',
		 [
			 {text: 'Cancel', onPress: () => null, style: 'cancel'},
			 {text: 'Retry', onPress: () => {
				 	if (!this.props.hasInternet) {
						this.showNoInternetAlert();
					}
			 }},
		 ],
		);
	},
	numberWithCommas: function(x) {
    	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	},
	render: function() {
		var status = this.props.hasInternet ? 
						this.props.loadingQuery ? "Loading..." 
						: this.numberWithCommas(this.props.numResults) + " Results"
					: "Connect to the internet to search.";

		return (
			<View style={[styles.menu, this.props.theme.menu]}>
				<CategoryColorLine category={"Other"} />
				<SearchBar
					theme={this.props.theme}
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
