'use strict';

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';

import { FilterNode, SearchPropTypes } from '@sefaria/search';
import {
  DirectedButton,
  ButtonToggleSet,
  LibraryNavButton,
} from './Misc.js';

import styles from './Styles';
import strings from './LocalizedStrings';

class SearchFilterPage extends React.Component {
  static propTypes = {
    theme:            PropTypes.object.isRequired,
    themeStr:         PropTypes.string.isRequired,
    interfaceLang:    PropTypes.oneOf(["english", "hebrew"]).isRequired,
    menuLanguage:     PropTypes.oneOf(["english", "hebrew"]).isRequired,
    subMenuOpen:      PropTypes.string.isRequired,
    toggleFilter:     PropTypes.func.isRequired,
    clearAllFilters:  PropTypes.func.isRequired,
    query:            PropTypes.string,
    openSubMenu:      PropTypes.func,
    search:           PropTypes.func,
    setSearchOptions: PropTypes.func,
    searchState:      PropTypes.object,
  };

  constructor(props) {
    super(props);
    const { type } = props.searchState;
    this.sortOptions = [
      {name: "chronological", text: strings.chronological, onPress: () => { this.props.setSearchOptions(type, "chronological", this.props.searchState.field); }},
      {name: "relevance", text: strings.relevance, onPress: () => { this.props.setSearchOptions(type, "relevance", this.props.searchState.field); }}
    ];
    this.exactOptions = [
      {name: false, text: strings.off, onPress: () => {
        this.props.setSearchOptions(type, this.props.searchState.sortType, this.props.searchState.fieldBroad, ()=>this.props.search(this.props.searchState.type, this.props.query, true, false, true));
      }},
      {name: true, text: strings.on, onPress: () => {
        this.props.setSearchOptions(type, this.props.searchState.sortType, this.props.searchState.fieldExact, ()=>this.props.search(this.props.searchState.type, this.props.query, true, false, true));
      }}
    ];
  }


  backFromFilter = () => {
    let backPage = this.props.subMenuOpen == "filter" ? null : "filter"; // if you're at a category filter page, go back to main filter page
    this.props.openSubMenu(backPage, true);
  };

  applyFilters = () => {
    this.props.openSubMenu(null);
    this.props.search(this.props.searchState.type, this.props.query, true, false);
  };

  clearAllFilters = () => {
    this.props.clearAllFilters(this.props.searchState.type);
  };

  toggleFilter = filter => {
    this.props.toggleFilter(this.props.searchState.type, filter);
  };

  render() {
    var isheb = this.props.interfaceLang === "hebrew"; //TODO enable when we properly handle interface hebrew throughout app
    var langStyle = !isheb ? styles.enInt : styles.heInt;
    var backImageStyle = isheb && false ? styles.directedButtonWithTextHe : styles.directedButtonWithTextEn;
    var loadingMessage = (<Text style={[langStyle, this.props.theme.searchResultSummaryText]}>{strings.loadingFilters}</Text>);
    var content = null;
    var closeSrc = this.props.themeStr == "white" ? require("./img/circle-close.png") : require("./img/circle-close-light.png");
    var flexDir = { flexDirection: this.props.interfaceLang === "hebrew" ? "row-reverse" : "row" };
    switch (this.props.subMenuOpen) {
      case "filter":
        content =
        (<View>
          <TouchableOpacity style={[styles.readerDisplayOptionsMenuItem, styles.button, this.props.theme.readerDisplayOptionsMenuItem]} onPress={this.clearAllFilters}>
            <Image source={closeSrc}
              resizeMode={'contain'}
              style={styles.searchFilterClearAll} />
            <Text style={[isheb ? styles.heInt : styles.enInt, styles.heInt, this.props.theme.tertiaryText]}>{strings.clearAll}</Text>

          </TouchableOpacity>
          <View style={styles.settingsSection}>
            <View>
              <Text style={[isheb ? styles.heInt : styles.enInt, styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.sortBy}</Text>
            </View>
            <ButtonToggleSet
              theme={this.props.theme}
              options={this.sortOptions}
              lang={this.props.interfaceLang}
              active={this.props.searchState.sortType} />
          </View>
          <View style={styles.settingsSection}>
            <View>
              <Text style={[isheb ? styles.heInt : styles.enInt, styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.exactSearch}</Text>
            </View>
            <ButtonToggleSet
              theme={this.props.theme}
              options={this.exactOptions}
              lang={this.props.interfaceLang}
              active={this.props.searchState.field === this.props.searchState.fieldExact} />
          </View>
          <View style={styles.settingsSection}>
            <View>
              <Text style={[isheb ? styles.heInt : styles.enInt, styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.filterByText}</Text>
            </View>
            <View>
              { this.props.searchState.filtersValid ?
                this.props.searchState.availableFilters.map((filter, ifilter)=>{
                  return (
                    <SearchFilter
                      key={ifilter}
                      theme={this.props.theme}
                      themeStr={this.props.themeStr}
                      menuLanguage={this.props.menuLanguage}
                      filterNode={filter}
                      openSubMenu={this.props.openSubMenu}
                      toggleFilter={this.toggleFilter}
                    />);
                }) : loadingMessage
              }
            </View>
          </View>
        </View>);
        break;
      default:
        var currFilter = FilterNode.findFilterInList(this.props.searchState.availableFilters, this.props.subMenuOpen);
        var filterList =
        [(<SearchFilter
          key={0}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          menuLanguage={this.props.menuLanguage}
          filterNode={currFilter}
          toggleFilter={this.toggleFilter}
          />)];
        content =
        (<View>
          { this.props.searchState.filtersValid ?
            filterList.concat(currFilter.getLeafNodes().map((filter, ifilter)=>{
              return (
                <SearchFilter
                  key={ifilter+1}
                  theme={this.props.theme}
                  themeStr={this.props.themeStr}
                  menuLanguage={this.props.menuLanguage}
                  filterNode={filter}
                  toggleFilter={this.toggleFilter}
                />);
            })) : loadingMessage
          }
        </View>);
    }
    return (<View style={{flex:1}}>
      <View style={[styles.header, this.props.theme.header, {justifyContent: "space-between", paddingHorizontal: 12}]}>
        <DirectedButton
          onPress={this.backFromFilter}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          text={strings.back}
          direction="back"
          language="english"
          textStyle={[this.props.theme.searchResultSummaryText, langStyle]}
          imageStyle={[styles.menuButton, backImageStyle]}/>
        <TouchableOpacity onPress={this.applyFilters} style={{marginLeft: 7, marginRight: 7}}>
          <Text style={[this.props.theme.searchResultSummaryText, langStyle, {marginTop: -1}]}>{strings.apply}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView key={this.props.subMenuOpen} contentContainerStyle={styles.menuContent} style={styles.scrollViewPaddingInOrderToScroll}>
        {content}
      </ScrollView>
    </View>);
  }
}


class SearchFilter extends React.Component {
  static propTypes = {
    theme:        PropTypes.object,
    themeStr:     PropTypes.string,
    menuLanguage: PropTypes.string.isRequired,
    filterNode:   SearchPropTypes.filterNode,
    openSubMenu:  PropTypes.func,
    toggleFilter: PropTypes.func.isRequired,
  };

  clickCheckBox = () => {
    this.props.toggleFilter(this.props.filterNode);
  }
///^[^_]*$
  render() {
    let filter = this.props.filterNode;
    let isCat = filter.children.length > 0;
    let count = filter.docCount;

    let catColor = Sefaria.palette.categoryColor(filter.title.replace(" Commentaries", ""));
    let colorStyle = isCat ? [{"borderColor": catColor}] : [this.props.theme.searchResultSummary, {"borderTopWidth": 1}];
    let textStyle  = [isCat ? styles.spacedText : null];
    let enTitle = isCat ? filter.title.toUpperCase() : filter.title;
    let flexDir = this.props.menuLanguage == "english" ? "row" : "row-reverse";
    return (
      <LibraryNavButton
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        menuLanguage={this.props.menuLanguage}
        onPress={()=>{ this.props.openSubMenu ? this.props.openSubMenu(filter.title) : this.clickCheckBox() }}
        onPressCheckBox={this.clickCheckBox}
        checkBoxSelected={this.props.filterNode.selected}
        enText={enTitle}
        count={count}
        heText={filter.heTitle}
        catColor={isCat ? catColor : null}
        withArrow={!!this.props.openSubMenu}
        buttonStyle={{ margin: 2, paddingVertical: 0, paddingHorizontal: 5,}} />
    );
  }
}

export default SearchFilterPage;
