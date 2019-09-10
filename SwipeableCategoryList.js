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
  RefreshControl,
} from 'react-native';
import {
  CategoryColorLine,
  CategorySideColorLink,
  DirectedButton,
  TwoBox,
  LanguageToggleButton,
  AnimatedRow,
  SText,
} from './Misc.js';
import { STATE_ACTIONS } from './StateManager';
import styles from './Styles';
import strings from './LocalizedStrings';


class SwipeableCategoryList extends React.Component {
  static propTypes = {
    close:              PropTypes.func.isRequired,
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    openRef:            PropTypes.func.isRequired,
    defaultTextLanguage:PropTypes.oneOf(["english","bilingual", "hebrew"]).isRequired,
    interfaceLanguage:  PropTypes.oneOf(["english","hebrew"]),
    onRemove:           PropTypes.func,
    title:              PropTypes.string.isRequired,
    loadData:           PropTypes.func.isRequired,
    icon:               PropTypes.number.isRequired,
    menuOpen:           PropTypes.oneOf(["saved", "history"]),
    openLogin:          PropTypes.func.isRequired,
    isLoggedIn:         PropTypes.bool.isRequired,
    hasDismissedSyncModal: PropTypes.bool.isRequired,
    dispatch:           PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      data: [],
      refreshing: true,
    };
    this._rowRefs = {};
  }

  componentDidMount() { this.loadData(); }

  loadData = async () => {
    let data = await this.props.loadData();
    // reduce consecutive history items with the same ref
    // filter items that are marked `secondary`
    data = data.reduce(
      (accum, curr, index) => (
        (!accum.length || curr.ref !== accum[accum.length-1].ref) ?
          accum.concat([curr]) :
          accum
      ), []
    ).filter(h => !h.secondary);
    this.setState({ data, refreshing: false });
  }

  removeItem = (item) => {
    const ref = this._rowRefs[item.ref];
    if (ref) {
      ref.remove();
    }
  }

  onRefresh = () => { this.setState({ refreshing: true }, this.loadData); }

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
          language={this.props.defaultTextLanguage}
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
          <LanguageToggleButton />
        </View>
        {this.props.isLoggedIn || this.props.hasDismissedSyncModal ? null :
          <TouchableOpacity style={{
              backgroundColor: "#18345D",
              paddingVertical: 20,
              paddingHorizontal: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={this.props.openLogin}
          >
            <Text style={[ styles.systemButtonText, styles.systemButtonTextBlue, styles.enInt]}>
              { `${strings.wantToSync} ` }
              <Text style={[{ textDecorationLine: 'underline'}]}>{ strings.logIn }</Text>
            </Text>

            <TouchableOpacity onPress={() => {
                this.props.dispatch({
                  type: STATE_ACTIONS.setHasDismissedSyncModal,
                  value: true,
                });
              }}>
              <Image
                source={require('./img/close-light.png')}
                resizeMode={'contain'}
                style={{width: 14, height: 14}}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        }
        <FlatListClass
          data={this.state.data}
          renderItem={this.renderRow}
          keyExtractor={this._keyExtractor}
          bounceFirstRowOnMount={!Sefaria._hasSwipeDeleted}
          maxSwipeDistance={90}
          renderQuickActions={this.renderDeleteButton}
          language={this.props.defaultTextLanguage}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this.onRefresh}
              tintColor="#CCCCCC"
              style={{ backgroundColor: 'transparent' }} />
          }
        />
      </View>
    );
  }
}

export default SwipeableCategoryList;
