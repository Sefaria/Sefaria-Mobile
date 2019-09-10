'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';

import {
  CategoryColorLine,
  TwoBox,
  LanguageToggleButton,
  MenuButton,
} from './Misc.js';

import styles from './Styles.js';
import strings from "./LocalizedStrings";
import {DirectedButton} from "./Misc";
import SheetResult from "./SheetResult";
import MySheetResult from "./MySheetResult";


class ReaderNavigationSheetList extends React.Component {
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    menuOpen:       PropTypes.oneOf(["mySheets", "sheetTag"]),
  };

  constructor(props) {
    super(props);
    this.state = {
      sheets: [],
      refreshing: true,
    };
  }

  componentDidMount() { this.loadData(); }

  loadData = async () => {
    const { menuOpen, tag } = this.props;
    try {
      let sheets;
      if (menuOpen === 'sheetTag') {
        sheets = await Sefaria.api.sheetsByTag(tag);
      } else if (menuOpen === 'mySheets') {
        sheets = await Sefaria.api.mySheets();
      }
      console.log('mySheets', sheets);
      this.setState({ sheets, refreshing: false });
    } catch (error) {
      this.setState({ refreshing: false });
      console.log(error);
    }
  }

  onRefresh = () => { this.setState({ refreshing: true }, this.loadData); }

  _keyExtractor = (sheet, pos) => {
    return sheet.id + "|" + pos;
  };


  renderItem = ({ item, index }) => {
    const refToOpen = "Sheet "+ item.id
    return (
      <View style={[this.props.theme.menu]}>
        {
          this.props.menuOpen === 'mySheets' ? (
            <MySheetResult
              title={item.title}
              heTitle={item.title}
              views={item.views}
              tags={item.tags}
              created={item.created}
              isPrivate={item.status === 'unlisted'}
              onPress={() => this.props.openRef(item.id,item)}
            />
          ) : (
            <SheetResult
              title={item.title}
              heTitle={item.title}
              ownerImageUrl={item.ownerImageUrl}
              ownerName={item.ownerName}
              views={item.views}
              onPress={() => this.props.openRef(item.id,item)}
            />
          )
        }
      </View>
    );
  }


    render() {
      const showHebrew = this.props.interfaceLanguage == "hebrew";
      const title = this.props.menuOpen === 'sheetTag' ? this.props.tag : strings.mySheets;

      return(
            <View style={[styles.menu, this.props.theme.menu]}>
                <CategoryColorLine category="Sheets" />
              <View style={[styles.header, this.props.theme.header]}>
                <DirectedButton
                  onPress={this.props.onBack}
                  themeStr={this.props.themeStr}
                  imageStyle={[styles.menuButton, styles.directedButton]}
                  direction="back"
                  language="english"
                />
                {showHebrew ?
                  <Text style={[styles.he, styles.categoryTitle, this.props.theme.categoryTitle, {textTransform: "uppercase"}]}>{title}</Text> :
                  <Text style={[styles.en, styles.categoryTitle, this.props.theme.categoryTitle, {textTransform: "uppercase"}]}>{title}</Text>
                }
                <DirectedButton
                  onPress={this.props.onBack}
                  themeStr={this.props.themeStr}
                  imageStyle={[styles.menuButton, styles.directedButton, {opacity: 0}]}
                  direction="back"
                  language="english"
                />
              </View>
              <FlatList
                style={{}}
                data={this.state.sheets}
                keyExtractor={(item, index) => ''+item.id}
                renderItem={this.renderItem}
                refreshControl={
                  <RefreshControl
                    refreshing={this.state.refreshing}
                    onRefresh={this.onRefresh}
                    tintColor="#CCCCCC"
                    style={{ backgroundColor: 'transparent' }} />
                }
              />
            </View>
      )

    }
}





export default ReaderNavigationSheetList;
