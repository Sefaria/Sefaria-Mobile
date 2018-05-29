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

import {
  DirectedButton,
  ButtonToggleSet,
  LibraryNavButton,
} from './Misc.js';

import FilterNode from './FilterNode';
import styles from './Styles';
import strings from './LocalizedStrings';

//console.log("filternaodf", FilterNode.checkPropType({}, 'blah', 'hii'));

class SearchFilterPage extends React.Component {
  static propTypes = {
    theme:            PropTypes.object.isRequired,
    themeStr:         PropTypes.string.isRequired,
    interfaceLang:    PropTypes.oneOf(["english", "hebrew"]).isRequired,
    menuLanguage:     PropTypes.oneOf(["english", "hebrew"]).isRequired,
    subMenuOpen:      PropTypes.string.isRequired,
    updateFilter:     PropTypes.func.isRequired,
    clearAllFilters:  PropTypes.func.isRequired,
    query:            PropTypes.string,
    sort:             PropTypes.string,
    isExact:          PropTypes.bool,
    availableFilters: PropTypes.array,
    appliedFilters:   PropTypes.array,
    filtersValid:     PropTypes.bool,
    openSubMenu:      PropTypes.func,
    search:    PropTypes.func,
    setSearchOptions: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.sortOptions = [
      {name: "chronological", text: strings.chronological, onPress: () => { this.props.setSearchOptions("chronological", this.props.isExact); }},
      {name: "relevance", text: strings.relevance, onPress: () => { this.props.setSearchOptions("relevance", this.props.isExact); }}
    ];
    this.exactOptions = [
      {name: false, text: strings.off, onPress: () => {
        this.props.setSearchOptions(this.props.sort, false, ()=>this.props.search(this.props.query, true, false, true));
      }},
      {name: true, text: strings.on, onPress: () => {
        this.props.setSearchOptions(this.props.sort, true, ()=>this.props.search(this.props.query, true, false, true));
      }}
    ];
  }


  backFromFilter = () => {
    let backPage = this.props.subMenuOpen == "filter" ? null : "filter"; // if you're at a category filter page, go back to main filter page
    this.props.openSubMenu(backPage);
    if (backPage == null) {
      //TODO consider only firing new query if you actually touched a button on the filter page
      this.props.search(this.props.query, true, false);
    }
  };

  applyFilters = () => {
    this.props.openSubMenu(null);
    this.props.search(this.props.query, true, false);
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
          <TouchableOpacity style={[styles.readerDisplayOptionsMenuItem, styles.button, this.props.theme.readerDisplayOptionsMenuItem]} onPress={this.props.clearAllFilters}>
            <Image source={closeSrc}
              resizeMode={Image.resizeMode.contain}
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
              active={this.props.sort} />
          </View>
          <View style={styles.settingsSection}>
            <View>
              <Text style={[isheb ? styles.heInt : styles.enInt, styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.exactSearch}</Text>
            </View>
            <ButtonToggleSet
              theme={this.props.theme}
              options={this.exactOptions}
              lang={this.props.interfaceLang}
              active={this.props.isExact} />
          </View>
          <View style={styles.settingsSection}>
            <View>
              <Text style={[isheb ? styles.heInt : styles.enInt, styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.filterByText}</Text>
            </View>
            <View>
              { this.props.filtersValid ?
                this.props.availableFilters.map((filter, ifilter)=>{
                  return (
                    <SearchFilter
                      key={ifilter}
                      theme={this.props.theme}
                      themeStr={this.props.themeStr}
                      menuLanguage={this.props.menuLanguage}
                      filterNode={filter}
                      openSubMenu={this.props.openSubMenu}
                      updateFilter={this.props.updateFilter}
                    />);
                }) : loadingMessage
              }
            </View>
          </View>
        </View>);
        break;
      default:
        var currFilter = FilterNode.findFilterInList(this.props.availableFilters, this.props.subMenuOpen);
        var filterList =
        [(<SearchFilter
          key={0}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          menuLanguage={this.props.menuLanguage}
          filterNode={currFilter}
          updateFilter={this.props.updateFilter}
          />)];
        content =
        (<View>
          { this.props.filtersValid ?
            filterList.concat(currFilter.getLeafNodes().map((filter, ifilter)=>{
              return (
                <SearchFilter
                  key={ifilter+1}
                  theme={this.props.theme}
                  themeStr={this.props.themeStr}
                  menuLanguage={this.props.menuLanguage}
                  filterNode={filter}
                  updateFilter={this.props.updateFilter}
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
      filterNode:   FilterNode.checkPropType,
      openSubMenu:  PropTypes.func,
      updateFilter: PropTypes.func.isRequired,
  };

  clickCheckBox = () => {
    this.props.updateFilter(this.props.filterNode);
  }
///^[^_]*$
  render() {
    let filter = this.props.filterNode;
    let isCat = filter.children.length > 0;
    let count = filter.docCount;

    let colorCat = Sefaria.palette.categoryColor(filter.title.replace(" Commentaries", ""));
    let colorStyle = isCat ? [{"borderColor": colorCat}] : [this.props.theme.searchResultSummary, {"borderTopWidth": 1}];
    let textStyle  = [isCat ? styles.spacedText : null];
    let flexDir = this.props.menuLanguage == "english" ? "row" : "row-reverse";
    return (
      <LibraryNavButton
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        menuLanguage={this.props.menuLanguage}
        isCat={isCat}
        onPress={()=>{ this.props.openSubMenu ? this.props.openSubMenu(filter.title) : this.clickCheckBox() }}
        onPressCheckBox={this.clickCheckBox}
        checkBoxSelected={this.props.filterNode.selected}
        enText={filter.title}
        heText={filter.heTitle}
        count={count}
        withArrow={!!this.props.openSubMenu}
        buttonStyle={{ margin: 2, paddingVertical: 0, paddingHorizontal: 5,}} />
    );
  }
}

export default SearchFilterPage;
