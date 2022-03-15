'use strict';

import PropTypes from 'prop-types';

import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';

import SearchBar from './SearchBar';
import SearchResultList from './SearchResultList';
import SearchFilterPage from './SearchFilterPage';
import styles from './Styles';
import strings from './LocalizedStrings';

import {
  CategoryColorLine,
  DirectedButton
} from './Misc.js';
import { GlobalStateContext, getTheme } from './StateManager';

const numberWithCommas = x => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const SearchToggleIcon = ({ type, setSearchTypeState, searchStateType, langStyle, status }) => {
  const { interfaceLanguage, themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isheb = interfaceLanguage === "hebrew";
  let icon;
  if (type === 'sheet') {
    icon = searchStateType == type ? require('./img/sheet-dark.png') : require('./img/sheet.png');
  } else {
    icon = searchStateType == type ? require('./img/book-dark.png') : require('./img/book.png');
  }
  return (
    <TouchableOpacity onPress={() => setSearchTypeState(type)} style={isheb ? styles.searchOptionButtonTextHe : styles.searchOptionButtonTextEn}>
      <Image source={icon}
        style={[styles.menuButton, isheb ? styles.headerIconWithTextHe : styles.headerIconWithTextEn]}
        resizeMode={'contain'}
      />
    <Text style={[theme.searchResultSummaryText, langStyle, searchStateType == type ? {color: '#000'} : {color: '#999'},  {marginTop: -2} ]}>{status}</Text>
    </TouchableOpacity>
  );
}

const SearchPage = props => {
  const { interfaceLanguage, themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);

  const backFromAutocomplete = () => {
    props.openSearch();
    props.search('text', props.query, true, false);
    props.search('sheet', props.query, true, false);
  }

  var status = props.hasInternet ?
          props.textSearchState.isLoading || props.sheetSearchState.isLoading ? strings.loading
              :       "Texts: " + numberWithCommas(props.textSearchState.numResults) + " " +
    "Sheets: " + numberWithCommas(props.sheetSearchState.numResults)
        : strings.connectToSearchMessage;


  var sheetStatus = props.sheetSearchState.isLoading ? strings.loading : numberWithCommas(props.sheetSearchState.numResults)
  var textStatus = props.textSearchState.isLoading ? strings.loading : numberWithCommas(props.textSearchState.numResults)

  var isheb = interfaceLanguage === "hebrew";
  var langStyle = !isheb ? styles.enInt : styles.heInt;
  var summaryStyle = [styles.searchResultSummary, theme.searchResultSummary];
  if (isheb && false) { //TODO enable when we properly handle interface hebrew throughout app
    summaryStyle.push(styles.searchResultSummaryHe);
  }
  var forwardImageStyle = isheb && false ? styles.forwardButtonHe : styles.forwardButtonEn;
  var content = null;

  switch (props.subMenuOpen) {
    case (null):
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
              <View style={{flexDirection: 'row'}}>
                <SearchToggleIcon
                  type="text"
                  setSearchTypeState={props.setSearchTypeState}
                  searchStateType={props.searchState.type}
                  langStyle={langStyle}
                  status={textStatus}
                />
                <Text>
                </Text>
                <SearchToggleIcon
                  type="sheet"
                  setSearchTypeState={props.setSearchTypeState}
                  searchStateType={props.searchState.type}
                  langStyle={langStyle}
                  status={sheetStatus}
                />
              </View>
            {props.searchState.type == "text" ?
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

export default SearchPage;
