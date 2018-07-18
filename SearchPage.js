'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  View,
  Text
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

class SearchPage extends React.Component {
  static propTypes = {
    theme:               PropTypes.object.isRequired,
    themeStr:            PropTypes.string.isRequired,
    interfaceLang:       PropTypes.oneOf(["english", "hebrew"]).isRequired,
    menuLanguage:        PropTypes.oneOf(["english", "hebrew"]).isRequired,
    subMenuOpen:         PropTypes.string,
    openSubMenu:         PropTypes.func,
    hasInternet:         PropTypes.bool,
    closeNav:            PropTypes.func.isRequired,
    search:              PropTypes.func.isRequired,
    openRef:             PropTypes.func.isRequired,
    setLoadTail:         PropTypes.func.isRequired,
    setIsNewSearch:      PropTypes.func.isRequired,
    setSearchOptions:    PropTypes.func.isRequired,
    clearAllFilters:     PropTypes.func.isRequired,
    updateFilter:        PropTypes.func.isRequired,
    query:               PropTypes.string,
    sort:                PropTypes.string,
    isExact:             PropTypes.bool,
    availableFilters:    PropTypes.array,
    appliedFilters:      PropTypes.array,
    filtersValid:        PropTypes.bool,
    queryResult:         PropTypes.array,
    loadingQuery:        PropTypes.bool,
    loadingTail:         PropTypes.bool,
    isNewSearch:         PropTypes.bool,
    numResults:          PropTypes.number,
    onChangeSearchQuery: PropTypes.func.isRequired,
    openAutocomplete:    PropTypes.func.isRequired,
  };

  numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  backFromAutocomplete = () => {
    this.props.openSearch();
    this.props.search(this.props.query, true, false);
  }

  render() {
    var status = this.props.hasInternet ?
            this.props.loadingQuery ? strings.loading
            : this.numberWithCommas(this.props.numResults) + " " + strings.results
          : strings.connectToSearchMessage;
    var isheb = this.props.interfaceLang === "hebrew";
    var langStyle = !isheb ? styles.enInt : styles.heInt;
    var summaryStyle = [styles.searchResultSummary, this.props.theme.searchResultSummary];
    if (isheb && false) { //TODO enable when we properly handle interface hebrew throughout app
      summaryStyle.push(styles.searchResultSummaryHe);
    }
    var forwardImageStyle = isheb && false ? styles.forwardButtonHe : styles.forwardButtonEn;
    var content = null;

    switch (this.props.subMenuOpen) {
      case (null):
        content = (
          <View style={[styles.menu, this.props.theme.menu]}>
            <SearchBar
              interfaceLang={this.props.interfaceLang}
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              onBack={this.props.openNav}
              onClose={this.props.closeNav}
              leftMenuButton="back"
              search={this.props.search}
              query={this.props.query}
              setIsNewSearch={this.props.setIsNewSearch}
              onChange={this.props.onChangeSearchQuery}
              onFocus={this.props.openAutocomplete}
              hideSearchButton={true}
            />
            <View style={summaryStyle}>
              <Text style={[this.props.theme.searchResultSummaryText, langStyle]} >{status}</Text>
              <DirectedButton
                text={(<Text>{strings.filter} <Text style={this.props.theme.text}>{`(${this.props.appliedFilters.length})`}</Text></Text>)}
                direction="forward"
                language={"english"}
                themeStr={this.props.themeStr}
                textStyle={[this.props.theme.searchResultSummaryText, langStyle]}
                imageStyle={forwardImageStyle}
                onPress={()=>this.props.openSubMenu("filter")}/>
            </View>
            <SearchResultList
              menuLanguage={this.props.menuLanguage}
              theme={this.props.theme}
              queryResult={this.props.queryResult}
              loadingTail={this.props.loadingTail}
              initSearchListSize={this.props.initSearchListSize}
              initSearchScrollPos={this.props.initSearchScrollPos}
              setInitSearchScrollPos={this.props.setInitSearchScrollPos}
              openRef={this.props.openRef}
              setLoadTail={this.props.setLoadTail}
              setIsNewSearch={this.props.setIsNewSearch}
              isNewSearch={this.props.isNewSearch}
              isExact={this.props.isExact} />
            </View>);
        break;
      default:
        //either "filter" or any top level category cateory
        content = (
          <SearchFilterPage
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            interfaceLang={this.props.interfaceLang}
            menuLanguage={this.props.menuLanguage}
            subMenuOpen={this.props.subMenuOpen}
            openSubMenu={this.props.openSubMenu}
            query={this.props.query}
            sort={this.props.sort}
            isExact={this.props.isExact}
            availableFilters={this.props.availableFilters}
            appliedFilters={this.props.appliedFilters}
            filtersValid={this.props.filtersValid}
            search={this.props.search}
            setSearchOptions={this.props.setSearchOptions}
            updateFilter={this.props.updateFilter}
            clearAllFilters={this.props.clearAllFilters}
          />
        );
    }
    return (
      <View style={[styles.menu, this.props.theme.menu]}>
        <CategoryColorLine category={"Other"} />
        {content}
      </View>
    );
  }
}

export default SearchPage;
