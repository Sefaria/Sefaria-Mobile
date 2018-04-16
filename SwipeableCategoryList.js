'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
  Alert,
  SwipeableFlatList,
} from 'react-native';
import {
  CategoryColorLine,
  CategorySideColorLink,
  DirectedButton,
  TwoBox,
  LanguageToggleButton,
  AnimatedRow,
} from './Misc.js';

import styles from './Styles';
import strings from './LocalizedStrings';


class SwipeableCategoryList extends React.Component {
  static propTypes = {
    close:              PropTypes.func.isRequired,
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    toggleLanguage:     PropTypes.func.isRequired,
    openRef:            PropTypes.func.isRequired,
    language:           PropTypes.oneOf(["english","hebrew"]),
  };

  constructor(props) {
    super(props);
    this._rowRefs = {};
    this.state = {
      historyItems: Sefaria.recent,
    }
  }

  removeItem = (item) => {
    const ref = this._rowRefs[item.ref];
    if (ref) {
      ref.remove();
    }
  }

  onRemove = (item) => {
    Sefaria.removeRecentItem(item);
    this.setState({ historyItems: Sefaria.recent });
  }

  _getRowRef = (ref, item) => {
    this._rowRefs[item.ref] = ref;
  }

  renderDeleteButton = ({ item }) => (
    <View style={{flex:1, backgroundColor: "#ff3b30"}}>
      <TouchableOpacity onPress={() => { this.removeItem(item); }} style={{alignSelf: 'flex-end', justifyContent: 'center', flex:1, width:90}}>
        <Text style={{textAlign: 'center', color: 'white'}}>
          {"Delete"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  renderRow = ({ item }) => (
      <AnimatedRow ref={ref => { this._getRowRef(ref, item); }} animationDuration={250} onRemove={() => { this.onRemove(item); }}>
        <CategorySideColorLink
          theme={this.props.theme}
          category={item.category}
          enText={item.ref}
          heText={item.heRef}
          language={this.props.language}
          onPress={this.props.openRef.bind(null, item.ref, null, item.versions)}
        />
      </AnimatedRow>
  );

  _keyExtractor = (item, index) => (
    item.ref
  );

  render() {

    return (
      <View style={[styles.menu, this.props.theme.menu]}>
        <CategoryColorLine category={"Other"} />
        <View style={[styles.header, this.props.theme.header]}>
          <DirectedButton
            onPress={this.props.close}
            themeStr={this.props.themeStr}
            imageStyle={[styles.menuButton, styles.directedButton]}
            direction="back"
            language="english"/>
          <Text style={[styles.textTocHeaderTitle, styles.textCenter, this.props.theme.text]}>{strings.history}</Text>
          <LanguageToggleButton
            theme={this.props.theme}
            toggleLanguage={this.props.toggleLanguage}
            language={this.props.language}
            themeStr={this.props.themeStr}
          />
        </View>

        <SwipeableFlatList
          data={this.state.historyItems}
          renderItem={this.renderRow}
          keyExtractor={this._keyExtractor}
          bounceFirstRowOnMount={true}
          maxSwipeDistance={90}
          renderQuickActions={this.renderDeleteButton}
          contentContainerStyle={styles.readerNavSectio}
        />
      </View>
    );
  }
}

export default SwipeableCategoryList;
