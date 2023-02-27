'use strict';

import PropTypes from 'prop-types';

import React  from 'react';
import { View } from 'react-native';
import {SearchResultPage} from "./SearchResultPage";
import {SearchFilterPage} from './SearchFilterPage';
import styles from '../Styles';
import {useGlobalState} from "../Hooks";


const SearchPage = props => {
  const { theme } = useGlobalState();
  let content;

  switch (props.subMenuOpen) {
    case null:
      content = (
          <SearchResultPage {...props} />
      );
      break;
    default:
      //either "filter" or any top level category cateory
      content = (
        <SearchFilterPage
          openSubMenu={props.openSubMenu}
          query={props.query}
          search={props.search}
          searchState={props.searchState}
          setSearchOptions={props.setSearchOptions}
          toggleFilter={props.toggleFilter}
          clearAllFilters={props.clearAllFilters}
          onBack={props.onBack}
        />
      );
  }
  return (
    <View style={[styles.menu, theme.mainTextPanel]}>
      {content}
    </View>
  );
}
SearchPage.propTypes = {
  subMenuOpen:         PropTypes.string,
  openSubMenu:         PropTypes.func,
  hasInternet:         PropTypes.bool,
  onBack:              PropTypes.func.isRequired,
  search:              PropTypes.func.isRequired,
  openRef:             PropTypes.func.isRequired,
  setLoadTail:         PropTypes.func.isRequired,
  setIsNewSearch:      PropTypes.func.isRequired,
  setSearchOptions:    PropTypes.func.isRequired,
  clearAllFilters:     PropTypes.func.isRequired,
  toggleFilter:        PropTypes.func.isRequired,
  query:               PropTypes.string,
  searchState:         PropTypes.object,
  isNewSearch:         PropTypes.bool,
  onChangeSearchQuery: PropTypes.func.isRequired,
  openAutocomplete:    PropTypes.func.isRequired,
};

export default SearchPage;
