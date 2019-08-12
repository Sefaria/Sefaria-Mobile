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
  FlatList,
  Image,
} from 'react-native';
import {
  CategoryColorLine,
  CategorySideColorLink,
  DirectedButton,
  TwoBox,
  LanguageToggleButton,
  AnimatedRow,
  SText,
  LoadingView,
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
    menuLanguage:           PropTypes.oneOf(["english","hebrew"]),
    interfaceLanguage:      PropTypes.oneOf(["english","hebrew"]),
    onRemove:           PropTypes.func,
    title:              PropTypes.string.isRequired,
    loadData:           PropTypes.func.isRequired,
    icon:               PropTypes.number.isRequired,
    menuOpen:           PropTypes.oneOf(["saved", "history"]),
  };

  constructor(props) {
    super(props);
    this.state = {
      data: null,
    };
    props.loadData().then(data => {
      // reduce consecutive history items with the same ref
      data = data.reduce((accum, curr, index) => ((!accum.length || curr.ref !== accum[accum.length-1].ref) ? accum.concat([curr]) : accum), []).filter(h => !h.secondary);

      this.setState({ data });
    });
    this._rowRefs = {};
  }

  removeItem = (item) => {
    const ref = this._rowRefs[item.ref];
    if (ref) {
      ref.remove();
    }
  }

  _getRowRef = (ref, item) => {
    this._rowRefs[item.ref] = ref;
  }

  renderDeleteButton = ({ item }) => (
    <View style={[{flex:1}, this.props.theme.secondaryBackground]}>
      <TouchableOpacity onPress={() => { this.removeItem(item); }} style={{alignSelf: 'flex-end', justifyContent: 'center', flex:1, width:90}}>
        <Text style={[{textAlign: 'center'}, this.props.theme.contrastText]}>
          {strings.remove}
        </Text>
      </TouchableOpacity>
    </View>
  );

  renderRow = ({ item }) => (
      <AnimatedRow
        ref={ref => { this._getRowRef(ref, item); }}
        animationDuration={250}
        onRemove={() => { this.props.onRemove(item); }}
        style={{flex: 1, justifyContent: "center", alignItems: "center"}}
      >
        <CategorySideColorLink
          category={Sefaria.categoryForTitle(item.book)}
          enText={item.ref}
          heText={item.he_ref}
          language={this.props.menuLanguage}
          onPress={this.props.openRef.bind(null, item.ref, null, item.versions)}
        />
      </AnimatedRow>
  );

  _keyExtractor = (item, index) => (
    `${item.ref}|${item.time_stamp}`
  );

  render() {
    const FlatListClass = this.props.menuOpen === "history" ? FlatList : SwipeableFlatList;  // disable swiping on history
    const isWhite = this.props.themeStr === "white";
    const isHeb = this.props.interfaceLanguage === "hebrew";
    return (
      <View style={[styles.menu, this.props.theme.menu]}>
        <CategoryColorLine category={"Other"} />
        <View style={[styles.header, this.props.theme.header]}>
          <DirectedButton
            onPress={this.props.close}
            imageStyle={[styles.menuButton, styles.directedButton]}
            direction="back"
            language="english"/>
          <View style={{flex:1, flexDirection: "row", justifyContent: "center", alignItems: "center"}}>
            <Image source={this.props.icon}
              style={[styles.menuButton, isHeb ? styles.headerIconWithTextHe : styles.headerIconWithTextEn]}
              resizeMode={'contain'}
            />
            <SText
              lang={this.props.interfaceLanguage}
              style={[styles.textTocHeaderTitle, {flex:0},styles.noPadding, this.props.theme.text]}>
              {this.props.title.toUpperCase()}
            </SText>
          </View>
          <LanguageToggleButton
            toggleLanguage={this.props.toggleLanguage}
            language={this.props.menuLanguage}
          />
        </View>

        {!!this.state.data ?
          <FlatListClass
            data={this.state.data}
            renderItem={this.renderRow}
            keyExtractor={this._keyExtractor}
            bounceFirstRowOnMount={!Sefaria._hasSwipeDeleted}
            maxSwipeDistance={90}
            renderQuickActions={this.renderDeleteButton}
            language={this.props.menuLanguage}
          />
         : <LoadingView />
        }
      </View>
    );
  }
}

export default SwipeableCategoryList;
