'use strict';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  I18nManager,
} from 'react-native';

import {
  CategoryColorLine,
  TripleDots,
  DirectedButton,
  DirectedArrow,
} from './Misc.js';
import { GlobalStateContext } from './StateManager';
import styles from './Styles';
import strings from './LocalizedStrings';

const PREVIOUS_MODES = { // mapping from modes to previous modes
  "version open": "versions",
};

const ConnectionsPanelHeader = ({
  setConnectionsMode,
  closeCat,
  updateCat,
  category,
  filterIndex,
  recentFilters,
  connectionsMode,
}) => {
  const { theme, interfaceLanguage } = useContext(GlobalStateContext);
  let content;
  let outerStyles;
  const isheb = interfaceLanguage === "hebrew";
  const backImageStyle = isheb ? styles.directedButtonWithTextHe : styles.directedButtonWithTextEn;
  switch (connectionsMode) {
    case (null):
      // summary
      outerStyles = [styles.textListHeader, styles.textListHeaderSummary, theme.textListHeader, {flexDirection: isheb ? 'row-reverse' : 'row'}];
      content = (
        <Text style={[isheb ? styles.heInt : styles.enInt, theme.textListHeaderSummaryText]}>{strings.resources}</Text>
      );
      break;
    case 'version open': // fall-through
    case 'filter':
      const selectedFilter = recentFilters[filterIndex];
      const backMode = connectionsMode === 'filter' ? selectedFilter.category : PREVIOUS_MODES[connectionsMode];
      outerStyles = [styles.textListHeader, styles.textListHeaderSummary, theme.textListHeader];
      if (connectionsMode === 'filter') {
        outerStyles.push({borderBottomWidth: 4, borderBottomColor: Sefaria.palette.categoryColor(category)})
      }
      content = (
        <View style={{flex: 1, flexDirection: isheb ? 'row-reverse' : 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => {setConnectionsMode(backMode)}} hitSlop={{top: 20, left: 20, right: 20, bottom: 20}}>
            <DirectedArrow
              imageStyle={backImageStyle}
              language={interfaceLanguage}
              direction={"back"}
            />
          </TouchableOpacity>
          <ScrollView
            style={{flexDirection: I18nManager.isRTL && isheb ? 'row-reverse' : 'row'}}
            contentContainerStyle={styles.textListHeaderScrollView}
            horizontal={true}
            automaticallyAdjustContentInsets={false}>
            <RecentFilterNav
              recentFilters={recentFilters}
              filterIndex={filterIndex}
              updateCat={updateCat}
            />
          </ScrollView>
        </View>
      );
      break;
    default:
      // category filter selected
      const backText = strings.resources;
      outerStyles = [styles.textListHeader, styles.textListHeaderSummary, theme.textListHeader];
      content = (
        <View style={{flex: 1, flexDirection: isheb ? 'row-reverse' : 'row', justifyContent: 'flex-start' }}>
          <DirectedButton
            text={backText}
            language={interfaceLanguage}
            textStyle={[isheb ? styles.heInt : styles.enInt, theme.textListHeaderSummaryText]}
            imageStyle={[styles.menuButton, backImageStyle]}
            onPress={closeCat}
            direction={"back"}
          />
        </View>
      );
      break;
  }
  return (
    <View style={outerStyles}>
      { content }
   </View>
  );
}
ConnectionsPanelHeader.propTypes = {
  setConnectionsMode: PropTypes.func.isRequired,
  closeCat:           PropTypes.func.isRequired,
  updateCat:          PropTypes.func,
  category:           PropTypes.string,
  filterIndex:        PropTypes.number,
  recentFilters:      PropTypes.array,
  connectionsMode:    PropTypes.string,
};

const RecentFilterNav = ({ updateCat, recentFilters, filterIndex }) => (
  <GlobalStateContext.Consumer>
    { ({ menuLanguage }) => (
      <View style={{flexDirection: menuLanguage === "hebrew" ? 'row-reverse' : 'row', justifyContent: 'flex-start'}}>
        { recentFilters.map((filter, i) =>
          <RecentFilterNavItem
            updateCat={updateCat}
            filter={filter}
            filterIndex={i}
            selected={i === filterIndex}
            key={filter.listKey()}
          />
        )}
      </View>
    )}
  </GlobalStateContext.Consumer>
);
RecentFilterNav.propTypes = {
  updateCat:      PropTypes.func.isRequired,
  recentFilters:  PropTypes.array,
  filterIndex:    PropTypes.number,
};

const RecentFilterNavItem = ({ filter, updateCat, filterIndex, selected }) => {
  const { theme, menuLanguage } = useContext(GlobalStateContext);
  const filterStr = filter.toString(menuLanguage);
  const touchStyles = [styles.connectionsPanelHeaderItem];
  var textStyles = [styles.connectionsPanelHeaderItemText, theme.connectionsPanelHeaderItemText, menuLanguage == "hebrew" ? styles.hebrewText : styles.englishText];
  if (selected) {
    textStyles.push(theme.connectionsPanelHeaderItemTextSelected);
  }
  // dont disable because that makes it hard to scroll disabled={this.props.selected}
  return (
    <TouchableOpacity
      hitSlop={{top: 10, left: 10, right: 10, bottom: 10}}
      style={touchStyles}
      onPress={()=>{updateCat(filterIndex)}}
    >
      <Text style={textStyles}>{filterStr}</Text>
    </TouchableOpacity>
  );
}
RecentFilterNavItem.propTypes = {
  updateCat:      PropTypes.func.isRequired,
  filter:         PropTypes.object,
  filterIndex:    PropTypes.number,
  selected:       PropTypes.bool
};

export default ConnectionsPanelHeader;
