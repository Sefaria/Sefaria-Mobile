'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  Text,
  ListView,
  View
} from 'react-native';

const styles = require('./Styles');
const SearchTextResult = require('./SearchTextResult');


class SearchResultList extends React.Component {
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    queryResult:    PropTypes.array,
    loadingTail:    PropTypes.bool,
    onQueryChange:  PropTypes.func.isRequired,
    openRef:        PropTypes.func.isRequired,
    setLoadTail:    PropTypes.func.isRequired,
    setIsNewSearch: PropTypes.func.isRequired,
    isNewSearch:    PropTypes.bool
  };

  state = {
    dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2}),
  };

  onEndReached = () => {
    if (this.props.loadingTail) {
      //already loading tail
      return;
    }
    this.props.setLoadTail(true);
  };

  renderRow = (rowData) => {
    return (
      <SearchTextResult
        theme={this.props.theme}
        textType={rowData.textType}
        title={rowData.title}
        text={rowData.text}
        onPress={this.props.openRef.bind(null,rowData.title)} />
    );
  };

  componentDidUpdate() {
  	if (this.props.isNewSearch)
  		this.props.setIsNewSearch(false);
  }

  scrollToSearchResult = () => {
    this.refs.searchResultsListView.scrollTo({
               x: 0,
               y: this.props.initSearchScrollPos || 0,
               animated: false
            })
  };

  setCurScrollPos = () => {
    this.props.setInitSearchScrollPos(this.refs.searchResultsListView.scrollProperties.offset);
  };

  render() {

  	//if isNewSearch, temporarily hide the ListView, which apparently resets the scroll position to the top
  	if (this.props.queryResult && !this.props.isNewSearch) {
	    var queryArray = this.props.queryResult.map(function(r) {
	      return {
	        "title": r._source.ref,
	        "text": r.highlight.content[0],
	        "textType": r._id.includes("[he]") ? "hebrew" : "english"
	      }
	    });

	    var dataSourceRows = this.state.dataSource.cloneWithRows(queryArray);

	    return (
	      <ListView
          ref="searchResultsListView"
	        dataSource={dataSourceRows}
          initialListSize={this.props.initSearchListSize || 20}
	        renderRow={this.renderRow}
          onLayout={this.scrollToSearchResult}
          onScroll={this.setCurScrollPos}
          scrollEventThrottle={100}
	        onEndReached={this.onEndReached}/>
	    );
  	} else {
  		return null;
  	}

  }
}


module.exports = SearchResultList;
