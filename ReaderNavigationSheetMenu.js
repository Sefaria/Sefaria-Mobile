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
  Button,

} from 'react-native';

import {
  CategoryColorLine,
  CategoryAttribution,
  TwoBox,
  LanguageToggleButton,
  MenuButton,
  DisplaySettingsButton,
  ToggleSet,
  LoadingView,
} from './Misc.js';

import styles from './Styles.js';
import {Image} from "./AutocompleteList";
import {CloseButton, SText} from "./Misc";
import strings from "./LocalizedStrings";


class ReaderNavigationSheetMenu extends React.Component {
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    close:        PropTypes.func.isRequired,
    toggleLanguage: PropTypes.func.isRequired,
    menuLanguage:   PropTypes.string.isRequired,
    isLoggedIn:     PropTypes.bool.isRequired,
    openMySheets:   PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      trendingTags: [],
      tagCategories: [],
    };
  }

  getData() {
    console.log('loadingtags')
      /*
    Sefaria.api.trendingTags(true)
      .then(results => {
          console.log('loaded trending tags')
          this.setState({trendingTags: results});
        })
      .catch(error => {
        console.log(error)
      })



    Sefaria.api.tagCategory("index", true)
      .then(results => {
          this.setState({tagCategories: results}, () => console.log('got index'));
        })
      .catch(error => {
        console.log(error)
      })
   */

  }
  componentDidMount() {
    this.getData();
   }

  _keyExtractor = (tag, pos) => {
    return tag.tag + "|" + pos;
  };

  updateData(category) {
    Sefaria.api.tagCategory(category, true)
      .then(results => {
          this.setState({tagCategories: results}, () => console.log('got results for: '+category));
        })
      .catch(error => {
        console.log(error)
      })

  }

  renderItem = ({ item, index }) => {
    var showHebrew = this.props.interfaceLang == "hebrew";
      return (
          <View style={[styles.twoBoxItem,
                        {"flex": this.state.tagCategories.length%2!= 0 && index == this.state.tagCategories.length-1 ? .5 : 1 }
          ]} key={index}>
              <TouchableOpacity style={[styles.textBlockLink, this.props.theme.textBlockLink]}
                                onPress={() => this.props.openSheetCategoryMenu(item.tag)}>
                  {showHebrew ?
                      <Text
                          style={[styles.hebrewText, styles.centerText, this.props.theme.text]}>{item.heTag}</Text> :
                      <Text
                          style={[styles.englishText, styles.centerText, this.props.theme.text]}>{item.tag}</Text>}
              </TouchableOpacity>
          </View>
      )
  }


    renderHeader = () => {
    return <SearchBar placeholder="Type Here..." lightTheme round />;
  };


    render() {
    var showHebrew = this.props.interfaceLang == "hebrew";


    var trendingTagContent = this.state.trendingTags.slice(0, 6).map(function(tag, i) {
        return (

                <TouchableOpacity  style={[styles.textBlockLink,this.props.theme.textBlockLink]}  onPress={()=> this.props.openSheetTagMenu(tag.tag)} key={i}>
                    { showHebrew ?
                      <Text style={[styles.hebrewText, styles.centerText, this.props.theme.text]}>{tag.he_tag}</Text> :
                      <Text style={[styles.englishText, styles.centerText, this.props.theme.text]}>{tag.tag}</Text> }
                </TouchableOpacity>
        )

      }.bind(this));


    var returnHeaderContent =  (
        <View style={styles.menuSheetContentHeader}>
          { this.props.isLoggedIn ? <Button onPress={this.props.openMySheets} title={strings.mySheets} /> : null}
            <View style={styles.category} key="TrendingSourceSheetTags">
              { showHebrew ?
                  <Text style={[styles.heInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>תוויות פופולרי</Text> :
                  <Text style={[styles.enInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>Trending Topics</Text> }
            </View>

            <TwoBox language={this.props.interfaceLang}>
              { trendingTagContent }
            </TwoBox>

            <View style={styles.category} key="AllSourceSheetTags">
              { showHebrew ?
                  <Text style={[styles.heInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>חיפוש לפי נושא</Text> :
                  <Text style={[styles.enInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>Explore by Topic</Text> }
            </View>


              <View style={styles.twoBoxItem}>
                  <TouchableOpacity style={[styles.textBlockLink, this.props.theme.textBlockLink]}
                                    onPress={() => showHebrew ? this.props.openSheetCategoryMenu("כל התוויות") : this.props.openSheetCategoryMenu("All Tags")}>
                      {showHebrew ?
                          <Text
                              style={[styles.hebrewText, styles.centerText, this.props.theme.text]}>כל התוויות א-ת</Text> :
                          <Text
                              style={[styles.englishText, styles.centerText, this.props.theme.text]}>All Topics A-Z</Text>}
                  </TouchableOpacity>
              </View>

        </View>
    );


      //if (this.state.tagCategories.length == 0 || this.state.trendingTags.length == 0) { return (<LoadingView />); }


    return (<View style={[styles.menu, this.props.theme.menu]}>
                <CategoryColorLine category="Sheets" />
              <View style={[styles.header, this.props.theme.header]}>
                <MenuButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr}/>
                {showHebrew ?
                  <Text style={[styles.he, styles.settingsHeader, this.props.theme.text]}>דפי מקורות</Text> :
                  <Text style={[styles.en, styles.settingsHeader, this.props.theme.text]}>SHEETS</Text> }
              </View>


                <FlatList
                  style={styles.menuAllSheetTagContent}
                  keyExtractor={this._keyExtractor}
                      data={this.state.tagCategories}
                  renderItem={this.renderItem}
                  numColumns={2}
                  ListHeaderComponent={returnHeaderContent}
                />

            </View>);
  }
}





export default ReaderNavigationSheetMenu;
