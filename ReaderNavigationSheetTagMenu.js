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

} from 'react-native';

import {
  CategoryColorLine,
  TwoBox,
  LanguageToggleButton,
  MenuButton,
  LoadingView
} from './Misc.js';

import styles from './Styles.js';
import strings from "./LocalizedStrings";
import {DirectedButton} from "./Misc";
import SheetResult from "./SheetResult";


class ReaderNavigationSheetTagMenu extends React.Component {
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    menuLanguage:   PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      sheets: [],

    };
  }

  getData() {
    Sefaria.api.sheetsByTag(this.props.tag)
      .then(results => {
          this.setState({sheets: results.sheets});
        })

      .catch(error => {
        console.log(error)
      })
  }
  componentDidMount() {
    this.getData();
   }

  _keyExtractor = (sheet, pos) => {
    return sheet.id + "|" + pos;
  };


  renderItem = ({ item, index }) => {
      var refToOpen = "Sheet "+ item.id
      return (
          <View key={index} style={[this.props.theme.menu]}>
                <SheetResult
                  menuLanguage={this.props.menuLanguage}
                  theme={this.props.theme}
                  title={item.title}
                  heTitle={item.title}
                  text={null}
                  ownerImageUrl={item.ownerImageUrl}
                  ownerName={item.ownerName}
                  views={item.views}
                  onPress={() => this.props.openRef(item.id,item)} />
          </View>
      )
  }


    render() {
      var showHebrew = this.props.interfaceLang == "hebrew";

      if (this.state.sheets.length == 0) { return (<LoadingView />); }


      return(
            <View style={[styles.menu, this.props.theme.menu]}>
                <CategoryColorLine category="Sheets" />
              <View style={[styles.header, this.props.theme.header]}>
              <DirectedButton
                onPress={this.props.onBack}
                themeStr={this.props.themeStr}
                imageStyle={[styles.menuButton, styles.directedButton]}
                direction="back"
                language="english"/>
                {showHebrew ?
                  <Text style={[styles.he, styles.categoryTitle, this.props.theme.categoryTitle, {textTransform: "uppercase"}]}>{this.props.tag}</Text> :
                  <Text style={[styles.en, styles.categoryTitle, this.props.theme.categoryTitle, {textTransform: "uppercase"}]}>{this.props.tag}</Text> }
                <LanguageToggleButton
                  theme={this.props.theme}
                  interfaceLang={"hebrew"}
                  toggleLanguage={this.props.toggleLanguage}
                  language={this.props.menuLanguage} />
              </View>

                <FlatList
                  style={{}}
                  data={this.state.sheets}
                  keyExtractor={(item, index) => item.id}
                  renderItem={this.renderItem}
                />


            </View>
      )

    }
}





export default ReaderNavigationSheetTagMenu;
