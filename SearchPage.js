'use strict';

import PropTypes from 'prop-types';

import React, { useContext } from 'react';
import {
  View,
  Text,
} from 'react-native';

import SearchBar from './SearchBar';
import SearchResultList from './SearchResultList';
import SearchFilterPage from './SearchFilterPage';
import styles from './Styles';
import strings from './LocalizedStrings';
import {useGlobalState, useRtlFlexDir} from "./Hooks";
import {
  CategoryColorLine,
  DirectedButton,
  TabView,
  TabRowView,
} from './Misc.js';

const numberWithCommas = x => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const getStatusFromState = (searchState) => (
    searchState.isLoading ? "-" : numberWithCommas(searchState.numResults)
);

const useSearchTabData = ({ textSearchState, sheetSearchState }) => {
  return [
    {text: strings.sources, id: 'text', count: getStatusFromState(textSearchState)},
    {text: strings.sheets, id: 'sheet', count: getStatusFromState(sheetSearchState)}
  ];
}

const SearchPage = props => {
  const { interfaceLanguage, theme } = useGlobalState();
  const tabs = useSearchTabData({...props})
  const flexDirection = useRtlFlexDir(interfaceLanguage);

  let isheb = interfaceLanguage === "hebrew";
  let langStyle = !isheb ? styles.enInt : styles.heInt;
  let summaryStyle = [styles.searchResultSummary, theme.searchResultSummary];
  if (isheb && false) { //TODO enable when we properly handle interface hebrew throughout app
    summaryStyle.push(styles.searchResultSummaryHe);
  }
  let forwardImageStyle = isheb && false ? styles.forwardButtonHe : styles.forwardButtonEn;
  let content = null;

  switch (props.subMenuOpen) {
    case null:
      content = (
        <View style={[styles.menu, theme.menu]}>
          <SearchBar
            onBack={props.onBack}
            leftMenuButton="back"
            search={props.search}
            query={props.query}
            setIsNewSearch={props.setIsNewSearch}
            onChange={props.onChangeSearchQuery}
            onFocus={props.openAutocomplete}
            searchType={props.searchState.type}
            hideSearchButton={true}
          />
          <View style={summaryStyle}>
            <TabRowView
              tabs={tabs}
              renderTab={(tab, active) => <SearchTabView active={active} {...tab} />}
              currTabId={props.searchState.type}
              setTab={props.setSearchTypeState}
              flexDirection={flexDirection}
            />
            {props.searchState.type === "text" ?
            <DirectedButton
              text={(<Text>{strings.filter} <Text style={theme.text}>{`(${props.searchState.appliedFilters.length})`}</Text></Text>)}
              accessibilityText={strings.filter}
              direction="forward"
              language={"english"}
              textStyle={[theme.searchResultSummaryText, langStyle]}
              imageStyle={forwardImageStyle}
              onPress={()=>props.openSubMenu("filter")}/> : null }
          </View>
          <SearchResultList
            setInitSearchScrollPos={props.setInitSearchScrollPos}
            openRef={props.openRef}
            setLoadTail={props.setLoadTail}
            setIsNewSearch={props.setIsNewSearch}
            isNewSearch={props.isNewSearch}
            searchState={props.searchState}
            searchType={props.searchType}
          />
          </View>);
      break;
    default:
      //either "filter" or any top level category cateory
      content = (
        <SearchFilterPage
          subMenuOpen={props.subMenuOpen}
          openSubMenu={props.openSubMenu}
          query={props.query}
          search={props.search}
          searchState={props.searchState}
          setSearchOptions={props.setSearchOptions}
          toggleFilter={props.toggleFilter}
          clearAllFilters={props.clearAllFilters}
        />
      );
  }
  return (
    <View style={[styles.menu, theme.menu]}>
      <CategoryColorLine category={"Other"} />
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

const SearchTabView = ({ text, active, count }) => {
  const { interfaceLanguage, theme } = useGlobalState();
  return (
      <TabView
          text={`${text} (${count})`}
          active={active}
          lang={interfaceLanguage}
          activeTextStyle={theme.primaryText}
          inactiveTextStyle={theme.tertiaryText}
      />
  );
}
export default SearchPage;
