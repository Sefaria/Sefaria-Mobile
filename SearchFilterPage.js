'use strict';

import PropTypes from 'prop-types';
import React, { useContext } from 'react';
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
import { GlobalStateContext } from './StateManager';
import styles from './Styles';
import strings from './LocalizedStrings';

const SearchFilterPage = ({
  subMenuOpen,
  toggleFilter,
  clearAllFilters,
  query,
  openSubMenu,
  search,
  setSearchOptions,
  searchState,
}) => {
  const { interfaceLanguage, theme, themeStr } = useContext(GlobalStateContext);
  const { type } = searchState;
  const sortOptions = [
    {name: "chronological", text: strings.chronological, onPress: () => { setSearchOptions(type, "chronological", searchState.field); }},
    {name: "relevance", text: strings.relevance, onPress: () => { setSearchOptions(type, "relevance", searchState.field); }}
  ];
  const exactOptions = [
    {name: false, text: strings.off, onPress: () => {
      setSearchOptions(type, searchState.sortType, searchState.fieldBroad, ()=>search(type, query, true, false, true));
    }},
    {name: true, text: strings.on, onPress: () => {
      setSearchOptions(type, searchState.sortType, searchState.fieldExact, ()=>search(type, query, true, false, true));
    }}
  ];


  const backFromFilter = () => {
    const backPage = subMenuOpen == "filter" ? null : "filter"; // if you're at a category filter page, go back to main filter page
    openSubMenu(backPage, true);
  };

  const applyFilters = () => {
    openSubMenu(null);
    search(type, query, true, false);
  };

  const clearAllFilters = () => {
    clearAllFilters(type);
  };

  const toggleFilter = filter => {
    toggleFilter(type, filter);
  };

  var isheb = interfaceLanguage === "hebrew"; //TODO enable when we properly handle interface hebrew throughout app
  var langStyle = !isheb ? styles.enInt : styles.heInt;
  var backImageStyle = isheb && false ? styles.directedButtonWithTextHe : styles.directedButtonWithTextEn;
  var loadingMessage = (<Text style={[langStyle, theme.searchResultSummaryText]}>{strings.loadingFilters}</Text>);
  var content = null;
  var closeSrc = themeStr == "white" ? require("./img/circle-close.png") : require("./img/circle-close-light.png");
  var flexDir = { flexDirection: interfaceLanguage === "hebrew" ? "row-reverse" : "row" };
  switch (subMenuOpen) {
    case "filter":
      content =
      (<View>
        <TouchableOpacity style={[styles.readerDisplayOptionsMenuItem, styles.button, theme.readerDisplayOptionsMenuItem]} onPress={clearAllFilters}>
          <Image source={closeSrc}
            resizeMode={'contain'}
            style={styles.searchFilterClearAll} />
          <Text style={[isheb ? styles.heInt : styles.enInt, styles.heInt, theme.tertiaryText]}>{strings.clearAll}</Text>

        </TouchableOpacity>
        <View style={styles.settingsSection}>
          <View>
            <Text style={[isheb ? styles.heInt : styles.enInt, styles.settingsSectionHeader, theme.tertiaryText]}>{strings.sortBy}</Text>
          </View>
          <ButtonToggleSet
            options={sortOptions}
            lang={interfaceLanguage}
            active={searchState.sortType} />
        </View>
        <View style={styles.settingsSection}>
          <View>
            <Text style={[isheb ? styles.heInt : styles.enInt, styles.settingsSectionHeader, theme.tertiaryText]}>{strings.exactSearch}</Text>
          </View>
          <ButtonToggleSet
            options={exactOptions}
            lang={interfaceLanguage}
            active={searchState.field === searchState.fieldExact} />
        </View>
        <View style={styles.settingsSection}>
          <View>
            <Text style={[isheb ? styles.heInt : styles.enInt, styles.settingsSectionHeader, theme.tertiaryText]}>{strings.filterByText}</Text>
          </View>
          <View>
            { searchState.filtersValid ?
              searchState.availableFilters.map((filter, ifilter)=>{
                return (
                  <SearchFilter
                    key={ifilter}
                    filterNode={filter}
                    openSubMenu={openSubMenu}
                    toggleFilter={toggleFilter}
                  />);
              }) : loadingMessage
            }
          </View>
        </View>
      </View>);
      break;
    default:
      var currFilter = FilterNode.findFilterInList(searchState.availableFilters, subMenuOpen);
      var filterList =
      [(<SearchFilter
        key={0}
        filterNode={currFilter}
        toggleFilter={toggleFilter}
        />)];
      content =
      (<View>
        { searchState.filtersValid ?
          filterList.concat(currFilter.getLeafNodes().map((filter, ifilter)=>{
            return (
              <SearchFilter
                key={ifilter+1}
                filterNode={filter}
                toggleFilter={toggleFilter}
              />);
          })) : loadingMessage
        }
      </View>);
  }
  return (<View style={{flex:1}}>
    <View style={[styles.header, theme.header, {justifyContent: "space-between", paddingHorizontal: 12}]}>
      <DirectedButton
        onPress={backFromFilter}
        text={strings.back}
        direction="back"
        language="english"
        textStyle={[theme.searchResultSummaryText, langStyle]}
        imageStyle={[styles.menuButton, backImageStyle]}/>
      <TouchableOpacity onPress={applyFilters} style={{marginLeft: 7, marginRight: 7}}>
        <Text style={[theme.searchResultSummaryText, langStyle, {marginTop: -1}]}>{strings.apply}</Text>
      </TouchableOpacity>
    </View>
    <ScrollView key={subMenuOpen} contentContainerStyle={styles.menuContent} style={styles.scrollViewPaddingInOrderToScroll}>
      {content}
    </ScrollView>
  </View>);
}
SearchFilterPage.propTypes = {
  subMenuOpen:      PropTypes.string.isRequired,
  toggleFilter:     PropTypes.func.isRequired,
  clearAllFilters:  PropTypes.func.isRequired,
  query:            PropTypes.string,
  openSubMenu:      PropTypes.func,
  search:           PropTypes.func,
  setSearchOptions: PropTypes.func,
  searchState:      PropTypes.object,
};


const SearchFilter = ({ filterNode, openSubMenu, toggleFilter }) => {
  const { menuLanguage } = useContext(GlobalStateContext);
  const clickCheckBox = () => { toggleFilter(filterNode); }
  const onPress = () => { openSubMenu ? openSubMenu(title) : clickCheckBox() }
  const { title, heTitle, selected, children, docCount } = filterNode;
  let isCat = children.length > 0;

  let catColor = Sefaria.palette.categoryColor(title.replace(" Commentaries", ""));
  let colorStyle = isCat ? [{"borderColor": catColor}] : [theme.searchResultSummary, {"borderTopWidth": 1}];
  let textStyle  = [isCat ? styles.spacedText : null];
  let enTitle = isCat ? title.toUpperCase() : title;
  let flexDir = menuLanguage == "english" ? "row" : "row-reverse";
  return (
    <LibraryNavButton
      onPress={onPress}
      onPressCheckBox={clickCheckBox}
      checkBoxSelected={selected}
      enText={enTitle}
      count={docCount}
      heText={heTitle}
      catColor={isCat ? catColor : null}
      withArrow={!!openSubMenu}
      buttonStyle={{ margin: 2, paddingVertical: 0, paddingHorizontal: 5,}} />
  );
}
SearchFilter.propTypes = {
  filterNode:   SearchPropTypes.filterNode,
  openSubMenu:  PropTypes.func,
  toggleFilter: PropTypes.func.isRequired,
};

export default SearchFilterPage;
