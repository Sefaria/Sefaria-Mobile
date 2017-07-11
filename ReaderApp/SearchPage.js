'use strict';

import PropTypes from 'prop-types';

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

class SearchPage extends React.Component {
    static propTypes = {
		theme:               PropTypes.object.isRequired,
		themeStr:            PropTypes.string.isRequired,
		hasInternet:         PropTypes.bool,
		closeNav:            PropTypes.func.isRequired,
		onQueryChange:       PropTypes.func.isRequired,
		openRef:             PropTypes.func.isRequired,
		setLoadTail:         PropTypes.func.isRequired,
		setIsNewSearch:      PropTypes.func.isRequired,
		query:               PropTypes.string,
		queryResult:         PropTypes.array,
		loadingQuery:        PropTypes.bool,
		loadingTail:         PropTypes.bool,
		isNewSearch:         PropTypes.bool,
		numResults:          PropTypes.number
	};

    numberWithCommas = (x) => {
    	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};

    render() {
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
					openNav={this.props.openNav}
					closeNav={this.props.closeNav}
					leftMenuButton="back"
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
					initSearchListSize={this.props.initSearchListSize}
          initSearchScrollPos={this.props.initSearchScrollPos}
          setInitSearchScrollPos={this.props.setInitSearchScrollPos}
					onQueryChange={this.props.onQueryChange}
					openRef={this.props.openRef}
					setLoadTail={this.props.setLoadTail}
					setIsNewSearch={this.props.setIsNewSearch}
					isNewSearch={this.props.isNewSearch} />
			</View>
		);
	}
}

module.exports = SearchPage;
