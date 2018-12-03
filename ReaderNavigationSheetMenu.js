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

} from 'react-native';

import {
  CategoryColorLine,
  CategoryAttribution,
  TwoBox,
  LanguageToggleButton,
  MenuButton,
  DisplaySettingsButton,
  ToggleSet,
  LoadingView
} from './Misc.js';

import styles from './Styles.js';
import {Image} from "./AutocompleteList";
import {SText} from "./Misc";
import strings from "./LocalizedStrings";


class ReaderNavigationSheetMenu extends React.Component {
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    openRef:        PropTypes.func.isRequired,
    close:        PropTypes.func.isRequired,
    toggleLanguage: PropTypes.func.isRequired,
    menuLanguage:   PropTypes.string.isRequired,
    openUri:        PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      trendingTags: [],
      allTags: [],
    };
  }

  getData() {
    Sefaria.api.trendingTags(true)
      .then(results => {
          this.setState({trendingTags: results});
        })

      .catch(error => {
        console.log(error)
      })

    Sefaria.api.allTags("alpha", true)
      .then(results => {
          this.setState({allTags: results});
        })

      .catch(error => {
        console.log(error)
      })

  }
  componentDidMount() {
    this.getData();
   }

  _keyExtractor = (tag, pos) => {
    return tag.tag + "|" + pos;
  };

  renderItem = ({ item, index }) => {
    var showHebrew = this.props.menuLanguage == "hebrew";

      return (
          <View style={styles.twoBoxItem} key={i}>
              <TouchableOpacity style={[styles.textBlockLink, this.props.theme.textBlockLink]}
                                onPress={() => console.log(item.tag)} key={index}>
                  {showHebrew ?
                      <Text
                          style={[styles.hebrewText, styles.centerText, this.props.theme.text]}>{item.tag} ({item.count})</Text> :
                      <Text
                          style={[styles.englishText, styles.centerText, this.props.theme.text]}>{item.tag} ({item.count})</Text>}
              </TouchableOpacity>
          </View>
      )
  }


    renderHeader = () => {
    return <SearchBar placeholder="Type Here..." lightTheme round />;
  };


    render() {
    var showHebrew = this.props.menuLanguage == "hebrew";

    if (this.state.trendingTags.length == 0 || this.state.allTags.length == 0) { return (<LoadingView />); }

    var trendingTagContent = this.state.trendingTags.slice(0, 6).map(function(tag, i) {
        return (

                <TouchableOpacity  style={[styles.textBlockLink,this.props.theme.textBlockLink]}  onPress={()=> console.log(tag.tag)} key={i}>
                    { showHebrew ?
                      <Text style={[styles.hebrewText, styles.centerText, this.props.theme.text]}>{tag.tag} ({tag.count})</Text> :
                      <Text style={[styles.englishText, styles.centerText, this.props.theme.text]}>{tag.tag} ({tag.count})</Text> }
                </TouchableOpacity>
        )

      }.bind(this));


    var returnHeaderContent =  (
        <View style={styles.menuContent}>
            <View style={styles.category} key="TrendingSourceSheetTags">
              { showHebrew ?
                  <Text style={[styles.heInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>תוויות פופולרי</Text> :
                  <Text style={[styles.enInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>Trending Topics</Text> }
            </View>

            <TwoBox content={trendingTagContent} language={this.props.menuLanguage} />

            <View style={styles.category} key="AllSourceSheetTags">
              { showHebrew ?
                  <Text style={[styles.heInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>כל התוויות</Text> :
                  <Text style={[styles.enInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>All Topics</Text> }
            </View>
        </View>

    )



    return (<View style={[styles.menu, this.props.theme.menu]}>
                <CategoryColorLine category="Sheets" />
              <View style={[styles.header, this.props.theme.header]}>
                <MenuButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr}/>
                {showHebrew ?
                  <Text style={[styles.he, styles.categoryTitle, this.props.theme.categoryTitle]}>דפי מקורות</Text> :
                  <Text style={[styles.en, styles.categoryTitle, this.props.theme.categoryTitle]}>SHEETS</Text> }
                <LanguageToggleButton
                  theme={this.props.theme}
                  toggleLanguage={this.props.toggleLanguage}
                  language={this.props.menuLanguage} />
              </View>




                <FlatList
                  style={styles.menuContent}
                  keyExtractor={this._keyExtractor}
                  data={this.state.allTags}
                  renderItem={this.renderItem}
                  ListHeaderComponent={returnHeaderContent}
                />

            </View>);
  }
}



export default ReaderNavigationSheetMenu;
