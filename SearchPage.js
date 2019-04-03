'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
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

class SearchPage extends React.Component {
  static propTypes = {
    theme:               PropTypes.object.isRequired,
    themeStr:            PropTypes.string.isRequired,
    interfaceLang:       PropTypes.oneOf(["english", "hebrew"]).isRequired,
    menuLanguage:        PropTypes.oneOf(["english", "hebrew"]).isRequired,
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

  numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  backFromAutocomplete = () => {
    this.props.openSearch();
    this.props.search('text', this.props.query, true, false);
    this.props.search('sheet', this.props.query, true, false);
  }

  render() {


    var status = this.props.hasInternet ?
            this.props.textSearchState.isLoading || this.props.sheetSearchState.isLoading ? strings.loading
                :       "Texts: " + this.numberWithCommas(this.props.textSearchState.numResults) + " " +
      "Sheets: " + this.numberWithCommas(this.props.sheetSearchState.numResults)
          : strings.connectToSearchMessage;


    var sheetStatus = this.props.sheetSearchState.isLoading ? strings.loading : this.numberWithCommas(this.props.sheetSearchState.numResults)
    var textStatus = this.props.textSearchState.isLoading ? strings.loading : this.numberWithCommas(this.props.textSearchState.numResults)

    var isheb = this.props.interfaceLang === "hebrew";
    var langStyle = !isheb ? styles.enInt : styles.heInt;
    var summaryStyle = [styles.searchResultSummary, this.props.theme.searchResultSummary];
    if (isheb && false) { //TODO enable when we properly handle interface hebrew throughout app
      summaryStyle.push(styles.searchResultSummaryHe);
    }
    var forwardImageStyle = isheb && false ? styles.forwardButtonHe : styles.forwardButtonEn;
    var content = null;

    var sheetToggle = (
        <TouchableOpacity onPress={() => this.props.setSearchTypeState('sheet')} style={isheb ? styles.searchOptionButtonTextHe : styles.searchOptionButtonTextEn}>
          <Image source={this.props.searchState.type == "sheet" ? require('./img/sheet.png') : require('./img/sheet-light.png')}
            style={[styles.menuButton, isheb ? styles.headerIconWithTextHe : styles.headerIconWithTextEn]}
            resizeMode={'contain'}
          />
          <Text style={[this.props.theme.searchResultSummaryText, langStyle, this.props.searchState.type == "sheet" ? {color: '#999'} : {color: '#ccc'}]}>{sheetStatus}</Text>
        </TouchableOpacity>
    );

    var textToggle = (
        <TouchableOpacity onPress={() => this.props.setSearchTypeState('text')} style={isheb ? styles.searchOptionButtonTextHe : styles.searchOptionButtonTextEn}>
          <Image source={this.props.searchState.type == "text" ? require('./img/book.png') : require('./img/book-light.png')}
            style={[styles.searchOptionButton, isheb ? styles.headerIconWithTextHe : styles.headerIconWithTextEn]}
            resizeMode={'contain'}
          />
          <Text style={[this.props.theme.searchResultSummaryText, langStyle, this.props.searchState.type == "text" ? {color: '#999'} : {color: '#ccc'} ]}>{textStatus}</Text>
        </TouchableOpacity>
    );



    switch (this.props.subMenuOpen) {
      case (null):
        content = (
          <View style={[styles.menu, this.props.theme.menu]}>
            <SearchBar
              interfaceLang={this.props.interfaceLang}
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              onBack={this.props.onBack}
              leftMenuButton="back"
              search={this.props.search}
              query={this.props.query}
              setIsNewSearch={this.props.setIsNewSearch}
              onChange={this.props.onChangeSearchQuery}
              onFocus={this.props.openAutocomplete}
              searchType={this.props.searchState.type}
              hideSearchButton={true}
            />
            <View style={summaryStyle}>
                <View style={{flexDirection: 'row'}}>{textToggle}<Text> </Text>{sheetToggle}</View>
              {this.props.searchState.type == "text" ?
              <DirectedButton
                text={(<Text>{strings.filter} <Text style={this.props.theme.text}>{`(${this.props.searchState.appliedFilters.length})`}</Text></Text>)}
                direction="forward"
                language={"english"}
                themeStr={this.props.themeStr}
                textStyle={[this.props.theme.searchResultSummaryText, langStyle]}
                imageStyle={forwardImageStyle}
                onPress={()=>this.props.openSubMenu("filter")}/> : null }
            </View>
            <SearchResultList
              menuLanguage={this.props.menuLanguage}
              theme={this.props.theme}
              setInitSearchScrollPos={this.props.setInitSearchScrollPos}
              openRef={this.props.openRef}
              setLoadTail={this.props.setLoadTail}
              setIsNewSearch={this.props.setIsNewSearch}
              isNewSearch={this.props.isNewSearch}
              searchState={this.props.searchState}
              searchType={this.props.searchType}
            />
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
            search={this.props.search}
            searchState={this.props.searchState}
            setSearchOptions={this.props.setSearchOptions}
            toggleFilter={this.props.toggleFilter}
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
