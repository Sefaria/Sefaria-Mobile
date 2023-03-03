'use strict';

import PropTypes from 'prop-types';

import React from 'react';
import {
  Text,
  FlatList,
  View
} from 'react-native';

import styles from '../Styles';
import {SearchTextResult} from './SearchTextResult';
import SearchSheetResult from './SearchSheetResult';

class SearchResultList extends React.Component {
  static propTypes = {
    openRef:        PropTypes.func.isRequired,
    setLoadTail:    PropTypes.func.isRequired,
    setIsNewSearch: PropTypes.func.isRequired,
    searchState:    PropTypes.object,
    isNewSearch:    PropTypes.bool,
  };

  onEndReached = () => {
    if (this.props.searchState.isLoadingTail) {
      //already loading tail
      return;
    }
    this.props.setLoadTail(this.props.searchState.type, true);
  };

  renderRow = ({ item }) => {
    const { searchType } = this.props;
    const renderer = searchType === "sheet" ? this.renderSheetResult : this.renderTextResult;
    return renderer({ item });
  };

  renderSheetResult = ({ item }) => {
    const refToOpen = "Sheet "+ item.id
    return (
        <SearchSheetResult
            textType={item.textType}
            title={item.title}
            heTitle={item.heTitle}
            text={item.text}
            ownerImageUrl={item.metadata.ownerImageUrl}
            ownerName={item.metadata.ownerName}
            views={item.metadata.views}
            tags={item.metadata.tags}
            onPress={this.props.openRef.bind(null,refToOpen)}
        />
    );
  };

  renderTextResult = ({ item }) => {
    return (
        <SearchTextResult
            lang={item.textType}
            tref={item.title}
            heTref={item.heTitle}
            text={item.text}
            versionTitle={item.version}
            openRef={this.props.openRef}
            duplicates={item.duplicates}
        />
    );
  };

  componentDidUpdate() {
    if (this.props.isNewSearch)
      this.props.setIsNewSearch(false);
  }

  scrollToSearchResult = () => {
    this.flatListRef._listRef.scrollToOffset({
       offset: this.props.searchState.initScrollPos || 0,
       animated: false,
    });
  };

  setCurScrollPos = () => {
    this.props.setInitSearchScrollPos(this.props.searchState.type, this.flatListRef._listRef._scrollMetrics.offset);
  };

  _setFlatListRef = (ref) => {
    this.flatListRef = ref;
  };

  _keyExtractor = (item, index) => {
    return item.id;
  };

  render() {
    //if isNewSearch, temporarily hide the ListView, which apparently resets the scroll position to the top
    if (this.props.searchState.results && !this.props.isNewSearch) {
      return (
        <FlatList
          ref={this._setFlatListRef}
          data={this.props.searchState.results}
          getItemLayout={this.getItemLayout}
          renderItem={this.renderRow}
          onLayout={this.scrollToSearchResult}
          onScroll={this.setCurScrollPos}
          keyExtractor={this._keyExtractor}
          scrollEventThrottle={100}
          onEndReached={this.onEndReached}
          contentContainerStyle={[{marginBottom:50}, styles.pageMargins]}/>
      );
    } else {
      return null;
    }

  }
}


export default SearchResultList;
