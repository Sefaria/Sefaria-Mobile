'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  Text,
  FlatList,
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
    isNewSearch:    PropTypes.bool,
    isExact:        PropTypes.bool,
  };

  onEndReached = () => {
    if (this.props.loadingTail) {
      //already loading tail
      return;
    }
    this.props.setLoadTail(true);
  };

  renderRow = ({ item }) => {
    return (
      <SearchTextResult
        theme={this.props.theme}
        textType={item.textType}
        title={item.title}
        text={item.text}
        onPress={this.props.openRef.bind(null,item.title)} />
    );
  };

  componentDidUpdate() {
    if (this.props.isNewSearch)
      this.props.setIsNewSearch(false);
  }

  scrollToSearchResult = () => {
    console.log("init", this.props.initSearchScrollPos);
    this.flatListRef._listRef.scrollToOffset({
       offset: this.props.initSearchScrollPos || 0,
       animated: false,
    });
  };

  setCurScrollPos = () => {
    this.props.setInitSearchScrollPos(this.flatListRef._listRef._scrollMetrics.offset);
  };

  _setFlatListRef = (ref) => {
    this.flatListRef = ref;
  };

  _keyExtractor = (item, index) => {
    return item.title + "|" + item.textType;
  };

  render() {
  	//if isNewSearch, temporarily hide the ListView, which apparently resets the scroll position to the top
  	if (this.props.queryResult && !this.props.isNewSearch) {
	    return (
	      <FlatList
          ref={this._setFlatListRef}
	        data={this.props.queryResult}
          getItemLayout={this.getItemLayout}
	        renderItem={this.renderRow}
          onLayout={this.scrollToSearchResult}
          onScroll={this.setCurScrollPos}
          keyExtractor={this._keyExtractor}
          scrollEventThrottle={100}
	        onEndReached={this.onEndReached}
          contentContainerStyle={{marginBottom:50}}/>
	    );
  	} else {
  		return null;
  	}

  }
}


module.exports = SearchResultList;
